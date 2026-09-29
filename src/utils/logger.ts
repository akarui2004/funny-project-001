import { Defaults, Loggings } from 'src/constants';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const { prefixFileName, datePattern, maxSize, maxFiles } = Loggings.rotation;
const winstonDateTimeFormat = 'YYYY-MM-DD HH:mm:ss Z';

// Uppercase before colorize, otherwise the ANSI escape codes get uppercased too
const upperCaseLevel = winston.format((info) => {
  info.level = info.level.toUpperCase();
  return info;
});

// Format the log line as follows: <YYYY-MM-DD> <LOG-LEVEL> [<module>]: <LOG-MESSAGE>
const customLineFormat = winston.format.printf(({ level, message, timestamp, module }) => {
  const moduleTag = module ? ` [${module}]` : '';
  return `${timestamp} ${level}${moduleTag}: ${message}`;
});

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: winstonDateTimeFormat }),
  upperCaseLevel(),
  customLineFormat,
);

// Same line as the file, colored by level for the terminal
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: winstonDateTimeFormat }),
  upperCaseLevel(),
  winston.format.colorize({ all: true }),
  customLineFormat,
);

// Rotation & Cleanup: Configure DailyRotateFile
const rotateTransport = new DailyRotateFile({
  filename: `${prefixFileName}-%DATE%.log`,
  dirname: Defaults.LOGS_DIR,
  datePattern: datePattern,
  maxSize: maxSize,
  maxFiles: maxFiles,
  format: fileFormat,
});

// Create winston logger
export const logger = winston.createLogger({
  level: Loggings.level,
  transports: [
    rotateTransport,
    new winston.transports.Console({ format: consoleFormat }),
  ]
});

// Logger that tags every line with its module, e.g. createModuleLogger('redis:queue')
export const createModuleLogger = (module: string) => logger.child({ module });
