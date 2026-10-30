import path from 'node:path';
import type { TestEvent } from 'node:test/reporters';
import ansis from 'ansis';

// Compact, Vitest-style reporter for node:test.
// Usage: tsx --test --test-reporter=./tests/reporters/pretty-reporter.mts

interface Failure {
  title: string;
  message: string;
}

const formatDuration = (ms: number): string => (ms < 1 ? '<1ms' : `${Math.round(ms)}ms`);

export default async function* prettyReporter(source: AsyncIterable<TestEvent>): AsyncGenerator<string> {
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let currentFile: string | undefined;
  let startedAt = performance.now();
  const failures: Failure[] = [];
  // Ancestor suites of the running test; a suite header is printed lazily before its first child.
  const stack: Array<{ name: string; printed: boolean }> = [];

  const summary = (): string => {
    const tests = [
      failed && ansis.red.bold(`${failed} failed`),
      passed && ansis.green.bold(`${passed} passed`),
      skipped && ansis.yellow(`${skipped} skipped`),
    ].filter(Boolean).join(ansis.gray(' | '));
    const failureDetails = failures.map(({ title, message }) =>
      `\n${ansis.bgRed.white.bold(' FAIL ')} ${ansis.bold(title)}\n${ansis.red(message.trimEnd().replace(/^/gm, '  '))}\n`,
    ).join('');
    const line = ansis.gray('─'.repeat(50));
    return `${failureDetails}\n${line}\n`
      + `${ansis.dim('     Tests')}  ${tests || ansis.gray('none')} ${ansis.gray(`(${passed + failed + skipped})`)}\n`
      + `${ansis.dim('  Duration')}  ${formatDuration(performance.now() - startedAt)}\n`
      + `${failed ? ansis.bgRed.white.bold(' FAIL ') : ansis.bgGreen.black.bold(' PASS ')}\n`;
  };

  for await (const event of source) {
    switch (event.type) {
      case 'test:start': {
        const { file, name, nesting } = event.data;
        if (file && file !== currentFile) {
          currentFile = file;
          yield `\n${ansis.cyan.bold(' ◆ ')}${ansis.underline(path.relative(process.cwd(), file))}\n`;
        }
        stack.length = nesting;
        stack.push({ name, printed: false });
        break;
      }

      case 'test:pass':
      case 'test:fail': {
        const { name, nesting, details, skip, todo } = event.data;
        const isSuite = details.type === 'suite';
        const error = 'error' in details ? details.error : undefined;
        const indent = '   '.repeat(nesting + 1);

        if (isSuite) {
          // Children already printed the header; only a failing suite (e.g. hook error) needs a line.
          if (event.type === 'test:fail' && !stack[nesting]?.printed) {
            failed++;
            failures.push({ title: name, message: String(error?.cause ?? error) });
            yield `${indent}${ansis.red('✗')} ${ansis.red(name)}\n`;
          }
          break;
        }

        for (let level = 0; level < nesting; level++) {
          const suite = stack[level];
          if (suite && !suite.printed) {
            suite.printed = true;
            yield `${'   '.repeat(level + 1)}${ansis.bold(suite.name)}\n`;
          }
        }

        const duration = ansis.gray(formatDuration(details.duration_ms));
        if (skip !== undefined || todo !== undefined) {
          skipped++;
          yield `${indent}${ansis.yellow('↓')} ${ansis.gray(name)} ${ansis.yellow(todo !== undefined ? '[todo]' : '[skip]')}\n`;
        } else if (event.type === 'test:pass') {
          passed++;
          yield `${indent}${ansis.green('✓')} ${name} ${duration}\n`;
        } else {
          failed++;
          const cause = error?.cause as Error | undefined;
          failures.push({
            title: [...stack.slice(0, nesting).map((s) => s.name), name].join(' › '),
            message: cause?.message ?? error?.message ?? 'Unknown error',
          });
          yield `${indent}${ansis.red('✗')} ${ansis.red(name)} ${duration}\n`;
        }
        break;
      }

      case 'test:stderr':
      case 'test:stdout':
        yield ansis.gray(event.data.message);
        break;

      case 'test:watch:drained':
        // Watch mode never ends the stream, so print a summary per run and reset.
        yield summary();
        passed = failed = skipped = 0;
        failures.length = 0;
        currentFile = undefined;
        startedAt = performance.now();
        break;
    }
  }

  yield summary();
}
