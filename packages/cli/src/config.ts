import {
  IConnectionManager,
  ILogger,
  IStateManager
} from '@database-revisions/types'

export interface Config {
  revisionsNamespace: string
  revisionsDirectory: string
  connectionManagerModule: {
    getConnectionManager: (args: {
      logger: ILogger
    }) => IConnectionManager<unknown>
  }
  stateManagerModule: {
    getStateManager: (args: {
      logger: ILogger
    }) => IStateManager<any>
  }
}
