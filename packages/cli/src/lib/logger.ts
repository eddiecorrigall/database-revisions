import bunyan from 'bunyan'

import { ILogger } from '@database-revisions/types'

const LOG_LEVEL = (process.env.LOG_LEVEL ?? 'error') as bunyan.LogLevelString

let loggerInstance: ILogger

export const getLogger = (name: string): ILogger => {
  if (loggerInstance === undefined) {
    loggerInstance = bunyan.createLogger({
      name,
      level: LOG_LEVEL
    })
  }
  return loggerInstance
}
