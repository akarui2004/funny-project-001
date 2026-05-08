import pinoPretty from 'pino-pretty';

export default function (opts: any) {
  return pinoPretty({
    ...opts,
    colorize: true,
    levelFirst: true,
    ignore: 'pid,hostname',
    translateTime: 'SYS:yyyyMMddHHmmss', // or false if you want full control

    messageFormat: (log: any, messageKey: string, levelLabel: string) => {
      const time = log.time
        ? new Date(log.time).toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
        : new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

      return `${time} [${levelLabel.toUpperCase()}] ${log[messageKey] || ''}`;
    },
  });
}
