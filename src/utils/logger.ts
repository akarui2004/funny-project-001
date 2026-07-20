// import { appConfig } from 'src/app';
// import { Defaults } from 'src/constants';
// import winston from 'winston';
// import DailyRotateFile from 'winston-daily-rotate-file';

// const { prefixFileName, datePattern, maxSize, maxFiles } = appConfig.logger.rotating;
// const winstonDateTimeFormat = 'YYYY-MM-DD HH:mm:ss Z';

// // Format the log line as follows: <YYYY-MM-DD> <LOG-LEVEL>: <LOG-MESSAGE>
// const customLineFormat = winston.format.printf(({ level, message, timestamp }) => {
//   return `${timestamp} ${level.toUpperCase()}: ${message}`;
// });

// const loggerUnifiedFormat = winston.format.combine(
//   winston.format.timestamp({ format: winstonDateTimeFormat }),
//   customLineFormat,
// );

// // Rotation & Cleanup: Configure DailyRotateFile
// const rotateTransport = new DailyRotateFile({
//   filename: `${prefixFileName}-%DATE%.log`,
//   dirname: Defaults.LOGS_DIR,
//   datePattern: datePattern,
//   maxSize: maxSize,
//   maxFiles: maxFiles,
//   format: loggerUnifiedFormat,
// });

// // Create winston logger
// export const logger = winston.createLogger({
//   level: appConfig.logger.level,
//   transports: [
//     rotateTransport,
//     new winston.transports.Console({
//       format: loggerUnifiedFormat,
//     }),
//   ]
// });