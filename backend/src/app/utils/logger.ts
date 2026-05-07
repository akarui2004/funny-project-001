import pino, { LoggerOptions, Logger as PinoLogger } from 'pino';
import appHelpers from '../helpers';
import BaseLogger from './base/baseLogger';

class Logger extends BaseLogger {
  private _logger: PinoLogger | undefined;
  private context?: string;

  private get logger(): PinoLogger {
    if (!this._logger) throw new Error('Logger not initialized. Call init() first.');
    return this._logger;
  }

  constructor(context?: string) {
    super();
    this.context = context; // Store the context for later use in log messages
  }

  public init() {
    const targets = appHelpers.isDev
      ? [this.setupPrettyTransportTarget()]
      : [this.setupFileTransportTarget(), this.setupPrettyTransportTarget()];

    const options: LoggerOptions = {
      level: this.loggerLevel(),
      timestamp: pino.stdTimeFunctions.isoTime,
      base: this.context ? { context: this.context } : undefined,
      serializers: {
        err: pino.stdSerializers.err,
        error: pino.stdSerializers.err
      }
    };

    this._logger = pino(options, pino.transport({ targets }));
  }

  info(msg: string, obj?: object): void {
    this.logger.info(obj || {}, msg);
  }

  warn(msg: string, obj?: object): void {
    this.logger.warn(obj || {}, msg);
  }

  error(msg: string | Error, obj?: object): void {
    if (msg instanceof Error) {
      this.logger.error({ err: msg, ... (obj || {}) });
    } else {
      this.logger.error(obj || {}, msg);
    }
  }

  debug(msg: string, obj?: object): void {
    this.logger.debug(obj || {}, msg);
  }

  fatal(msg: string, obj?: object): void {
    this.logger.fatal(obj || {}, msg);
  }

  child(bindings: object): Logger {
    const childLogger = new Logger(this.context);
    childLogger.setLogger(this.logger.child(bindings));
    return childLogger;
  }

  public setLogger(pinoLogger: PinoLogger) {
    this._logger = pinoLogger;
  }
}

const logger = new Logger();
logger.init();

export default logger;