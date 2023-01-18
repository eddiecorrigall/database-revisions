import { expectEnv } from '../lib/env'
import { getLogger } from '../lib/logger'

import { PostgreSQLConnectionManager } from '../client/postgres'
import { PostgreSQLPersistence } from '../dao/postgres'
import { MigrationService } from '../service'

import { command as newCommand } from './command/new'
import { command as versionCommand } from './command/version'
import { command as listCommand } from './command/list'
import { command as upCommand } from './command/up'
import { command as downCommand } from './command/down'
import { Config } from '../config'
import { Command } from './command'
import {
  IConnectionManager,
  IPersistenceFacade
} from '@database-revisions/types'

const printUsage = (): void => {
  console.log('Usage: migrate [new|version|list|up|down|help]')
  console.log('Environment variables:')
  console.log(
    '  REVISIONS_NAMESPACE ' +
    '- namespace for managing more than one version'
  )
  console.log(
    '  REVISIONS_DIRECTORY ' +
    '- path to revisions directory containing revisions files'
  )
  console.log(
    '  REVISIONS_CLIENT    ' +
    '- database client type (eg. postgresql, mongodb, etc)'
  )
}

const loadCommand = (commandName: string): Command => {
  const command: Command | undefined = {
    new: newCommand,
    version: versionCommand,
    list: listCommand,
    up: upCommand,
    down: downCommand,
    help: printUsage as any
  }[commandName.toLowerCase()]
  if (command === undefined) {
    printUsage()
    throw new Error('unknown command')
  }
  return command
}

const loadConfig = (): Config => {
  // TODO: option to load from file
  const config: Config = {
    revisionsNamespace: expectEnv('REVISIONS_NAMESPACE'),
    revisionsDirectory: expectEnv('REVISIONS_DIRECTORY'),
    clientModule: expectEnv('REVISIONS_CLIENT')
  }
  return config
}

const main = async (): Promise<void> => {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    printUsage()
    throw new Error('command required')
  }
  const config = loadConfig()
  const command = loadCommand(args[0])
  const logger = getLogger('CLI')
  // Load connection manager and persistent facade
  let db: IConnectionManager<unknown>
  let dao: IPersistenceFacade<any>
  switch (config.clientModule) {
    case 'mongodb': {
      const {
        getConnectionManager,
        getStateManager
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      } = require('@database-revisions/mongodb')
      db = getConnectionManager({ logger })
      dao = getStateManager({ logger })
    } break
    case 'postgresql': {
      const pool = PostgreSQLConnectionManager.createPool()
      db = new PostgreSQLConnectionManager(pool, { logger })
      dao = new PostgreSQLPersistence({ logger })
    } break
    default: {
      throw new Error(`unknown client ${config.clientModule}`)
    }
  }
  process.on('exit', () => {
    void db.shutdown()
  })
  const service = new MigrationService({ dao, logger })
  await command(config, db, dao, service, ...args)
}

const onSuccess = (): void => {
  process.exit(0)
}

const onFailure = (reason?: string): void => {
  if (reason !== undefined) {
    console.error(reason)
  }
  process.exit(1)
}

main().then(
  onSuccess,
  onFailure
)
