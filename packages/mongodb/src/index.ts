import {
  IConnectionManager,
  ILogger,
  IStateManager
} from '@database-revisions/types'
import { Client, MongoDBConnectionManager } from './client'
import { MongoDBPersistence } from './state'

export const getConnectionManager = (args: {
  logger: ILogger
}): IConnectionManager<Client> => {
  return new MongoDBConnectionManager(args)
}

export const getStateManager = (args: {
  logger: ILogger
}): IStateManager<Client> => {
  return new MongoDBPersistence(args)
}
