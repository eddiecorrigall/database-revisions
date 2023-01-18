import {
  IConnectionManager,
  ILogger,
  IStateManager
} from '@database-revisions/types'
import { Client, PostgreSQLConnectionManager } from './client'
import { PostgreSQLStateManager } from './state'

export const getConnectionManager = (args: {
  logger: ILogger
}): IConnectionManager<Client> => {
  return new PostgreSQLConnectionManager(args)
}

export const getStateManager = (args: {
  logger: ILogger
}): IStateManager<Client> => {
  return new PostgreSQLStateManager(args)
}
