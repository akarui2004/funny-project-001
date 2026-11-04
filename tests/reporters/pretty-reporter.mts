import path from 'node:path';
import type { TestEvent } from 'node:test/reporters';
import ansis from 'ansis';

// Compact, Vitest-style reporter for node:test: one line per test file; individual
// tests are listed only when they fail or run slow, full failure details at the end.
// Usage: tsx --test --test-reporter=./tests/reporters/pretty-reporter.mts

interface Failure {
  title: string;
  message: string;
  location?: string;
}

// Per-file tally, flushed as a single line once the file finishes.
interface FileResult {
  file: string;
  tests: number;
  failed: number;
  skipped: number;
  durationMs: number;
  // Top-level describe() name → number of tests inside, shown as what the file covers.
  suites: Map<string, number>;
  notes: string[];
}

const SLOW_TEST_MS = 100;

const formatDuration = (ms: number): string => (ms < 1 ? '<1ms' : `${Math.round(ms)}ms`);

const relativePath = (file: string): string => path.relative(process.cwd(), file);

// Dims the directory so the file name stands out.
const formatPath = (file: string): string => {
  const relative = relativePath(file);
  const dir = path.dirname(relative);
  return `${ansis.gray(`${dir}/`)}${path.basename(relative)}`;
};

// Assertion messages already explain themselves; other errors keep their type (e.g. "TypeError: boom").
const describeError = (error: unknown): string => {
  if (!(error instanceof Error)) return String(error ?? 'Unknown error');
  if ((error as { code?: string }).code === 'ERR_ASSERTION') return error.message;
  return `${error.name}: ${error.message}`;
};

// Colors node:assert diff lines: "+" actual in green, "-" expected in red.
const colorizeMessage = (message: string): string => message.trimEnd().split('\n').map((line) => {
  if (line === '+ actual - expected') return `  ${ansis.green('+ actual')} ${ansis.red('- expected')}`;
  if (line.startsWith('+')) return `  ${ansis.green(line)}`;
  if (line.startsWith('-')) return `  ${ansis.red(line)}`;
  return `  ${line}`;
}).join('\n');

const joinCounts = (parts: Array<string | 0 | false>): string => parts.filter(Boolean).join(ansis.gray(' | '));

export default async function* prettyReporter(source: AsyncIterable<TestEvent>): AsyncGenerator<string> {
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let filesPassed = 0;
  let filesFailed = 0;
  let current: FileResult | undefined;
  let startedAt = performance.now();
  const failures: Failure[] = [];
  // Names of the suites enclosing the running test, used to build "Suite › test" titles.
  const stack: string[] = [];

  const flushFile = (): string => {
    if (!current) return '';
    const { file, tests, failed: fileFailed, skipped: fileSkipped, durationMs, suites, notes } = current;
    current = undefined;
    if (fileFailed) filesFailed++;
    else filesPassed++;
    const counts = joinCounts([
      ansis.gray(`${tests} test${tests === 1 ? '' : 's'}`),
      fileFailed && ansis.red(`${fileFailed} failed`),
      fileSkipped && ansis.yellow(`${fileSkipped} skipped`),
    ]);
    const icon = fileFailed ? ansis.red('✗') : ansis.green('✓');
    const suiteLines = [...suites].map(([name, count]) => `   ${ansis.gray('›')} ${name} ${ansis.gray(`(${count})`)}\n`);
    return ` ${icon} ${formatPath(file)} ${ansis.gray('(')}${counts}${ansis.gray(')')} ${ansis.gray(formatDuration(durationMs))}\n`
      + suiteLines.join('')
      + notes.join('');
  };

  const summary = (): string => {
    const failureDetails = failures.map(({ title, message, location }, index) =>
      `\n${ansis.bgRed.white.bold(` FAIL ${index + 1}/${failures.length} `)} ${ansis.bold(title)}\n`
      + (location ? `  ${ansis.cyan(`→ ${location}`)}\n\n` : '')
      + `${colorizeMessage(message)}\n`,
    ).join('');
    const tests = joinCounts([
      failed && ansis.red.bold(`${failed} failed`),
      passed && ansis.green.bold(`${passed} passed`),
      skipped && ansis.yellow(`${skipped} skipped`),
    ]);
    const files = joinCounts([
      filesFailed && ansis.red.bold(`${filesFailed} failed`),
      filesPassed && ansis.green.bold(`${filesPassed} passed`),
    ]);
    return `${failureDetails}\n`
      + `${ansis.dim('Test Files')}  ${files || ansis.gray('none')} ${ansis.gray(`(${filesPassed + filesFailed})`)}\n`
      + `${ansis.dim('     Tests')}  ${tests || ansis.gray('none')} ${ansis.gray(`(${passed + failed + skipped})`)}\n`
      + `${ansis.dim('  Duration')}  ${formatDuration(performance.now() - startedAt)}\n`
      + `${failed ? ansis.bgRed.white.bold(' FAIL ') : ansis.bgGreen.black.bold(' PASS ')}\n`;
  };

  for await (const event of source) {
    switch (event.type) {
      case 'test:start': {
        const { file, name, nesting } = event.data;
        if (file && file !== current?.file) {
          yield flushFile();
          current = { file, tests: 0, failed: 0, skipped: 0, durationMs: 0, suites: new Map(), notes: [] };
        }
        stack.length = nesting;
        stack.push(name);
        break;
      }

      case 'test:pass':
      case 'test:fail': {
        const { name, nesting, details, skip, todo, file, line, column } = event.data;
        if (!current) break;
        const isSuite = details.type === 'suite';
        const error = 'error' in details ? details.error : undefined;
        const title = [...stack.slice(0, nesting), name].join(' › ');
        const location = file ? `${relativePath(file)}:${line}:${column}` : undefined;
        if (nesting === 0) current.durationMs += details.duration_ms;

        if (isSuite) {
          // A suite fails on its own only through a hook error; failing children are already counted.
          const childFailed = error && (error as { failureType?: string }).failureType === 'subtestsFailed';
          if (event.type === 'test:fail' && !childFailed) {
            failed++;
            current.failed++;
            failures.push({ title, message: describeError(error?.cause ?? error), location });
            current.notes.push(`   ${ansis.red('✗')} ${ansis.red(title)}\n`);
          }
          break;
        }

        current.tests++;
        const suite = stack[0];
        if (nesting > 0 && suite) current.suites.set(suite, (current.suites.get(suite) ?? 0) + 1);
        if (skip !== undefined || todo !== undefined) {
          skipped++;
          current.skipped++;
        } else if (event.type === 'test:pass') {
          passed++;
          if (details.duration_ms >= SLOW_TEST_MS) {
            current.notes.push(`   ${ansis.yellow('◷')} ${title} ${ansis.yellow(formatDuration(details.duration_ms))}\n`);
          }
        } else {
          failed++;
          current.failed++;
          failures.push({ title, message: describeError(error?.cause ?? error), location });
          current.notes.push(`   ${ansis.red('✗')} ${ansis.red(title)} ${ansis.gray(formatDuration(details.duration_ms))}\n`);
        }
        break;
      }

      case 'test:stderr':
      case 'test:stdout':
        yield ansis.gray(event.data.message);
        break;

      case 'test:watch:drained':
        // Watch mode never ends the stream, so print a summary per run and reset.
        yield flushFile();
        yield summary();
        passed = failed = skipped = filesPassed = filesFailed = 0;
        failures.length = 0;
        startedAt = performance.now();
        break;
    }
  }

  yield flushFile();
  yield summary();
}
