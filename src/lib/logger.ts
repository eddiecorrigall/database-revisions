import bunyan from 'bunyan';

const LOG_LEVEL = (process.env.LOG_LEVEL ?? 'error') as bunyan.LogLevelString;

type LogFunction = (message: string, payload?: Record<string, unknown>) => void;

export interface ILogger {
  debug: LogFunction;
  info: LogFunction;
  warn: LogFunction;
  error: LogFunction;
}

let loggerInstance: ILogger;

export const getLogger = (name: string): ILogger => {
  if (!loggerInstance) {
    loggerInstance = bunyan.createLogger({
      name,
      level: LOG_LEVEL,
    });
  }
  return loggerInstance;
};
