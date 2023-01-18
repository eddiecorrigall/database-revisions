import {
  IConnectionManager,
  ILogger,
  IPersistenceFacade
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
}): IPersistenceFacade<Client> => {
  return new MongoDBPersistence(args)
}
