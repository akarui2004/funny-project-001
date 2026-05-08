import path from 'path';
import { TransportTargetOptions } from 'pino';
import appConfig from '../../config';
import appHelpers from '../../helpers';

abstract class BaseLogger {
  private logDir: string =  path.resolve(process.cwd(), 'logs');
  private baseFileName: string = 'app';

  constructor() {
    if (appConfig.logging?.path) this.setLogFolder(appConfig.logging.path);
    if (appConfig.logging?.baseFileName) this.setBaseFileName(appConfig.logging.baseFileName);
  }

  abstract init(): void;

  public setLogFolder(folderName: string) {
    this.logDir = path.resolve(process.cwd(), folderName);
  }

  public setLogDir(logDir: string) {
    this.logDir = logDir;
  }

  public setBaseFileName(baseFileName: string) {
    this.baseFileName = baseFileName;
  }

  protected loggerLevel(): string {
    if (appHelpers.isDev) return 'trace';

    return appConfig.logging?.level || 'info';
  }

  protected setupFileTransportTarget(): TransportTargetOptions {
    return {
      target: 'pino-roll',
      level: this.loggerLevel(),
      options: {
        file: path.join(this.logDir, this.baseFileName),
        frequency: appConfig.logging?.rotate?.frequency || 'daily',
        mkdir: appConfig.logging?.rotate?.mkdir || true,
        size: appConfig.logging?.rotate?.size || undefined,
      }
    }
  }

  protected setupPrettyTransportTarget(): TransportTargetOptions {
    // console.log(path.resolve(__dirname), 3000);
    return {
      target: path.resolve(__dirname, './prettyTransport.ts'),
      level: this.loggerLevel(),
      options: {
        colorize: true,
        levelFirst: true,
        translateTime: 'SYS:yyyyMMddHHmmss',
        ignore: 'pid,hostname'
      }
    }
  }
}

export default BaseLogger;
