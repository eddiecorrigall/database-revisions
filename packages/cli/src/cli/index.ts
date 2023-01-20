import { getLogger } from '../lib/logger'

import { MigrationService } from '../service'

import { command as initCommand } from './command/init'
import { command as newCommand } from './command/new'
import { command as versionCommand } from './command/version'
import { command as listCommand } from './command/list'
import { command as upCommand } from './command/up'
import { command as downCommand } from './command/down'
import { Config } from '../config'
import { LocalCommand, RemoteCommand } from './command-types'
import {
  IConnectionManager, IStateManager
} from '@database-revisions/types'
import path from 'path'
import { existsSync } from 'fs'

export const REVISIONS_MODULES: Array<{
  databaseName: string
  moduleName: string
}> = [
  {
    databaseName: 'PostgreSQL',
    moduleName: '@database-revisions/postgresql'
  },
  {
    databaseName: 'MongoDB',
    moduleName: '@database-revisions/mongodb'
  }
]

export const DEFAULT_REVISIONS_CONFIG = './revisions.config.js'
export const DEFAULT_REVISIONS_DIRECTORY = './revisions'
export const DEFAULT_REVISIONS_MODULE = REVISIONS_MODULES[0].moduleName

const printUsage = (): void => {
  console.log('Usage: migrate [new|version|list|up|down|help]')
  console.log('Environment variables:')
  console.log('  REVISIONS_CONFIG - absolute path to database-revisions config')
}

const loadLocalCommand = (commandName: string): LocalCommand => {
  const command: LocalCommand | undefined = {
    init: initCommand,
    new: newCommand,
    help: printUsage as any
  }[commandName.toLowerCase()]
  if (command === undefined) {
    printUsage()
    throw new Error('unknown command')
  }
  return command
}

const loadRemoteCommand = (commandName: string): RemoteCommand | undefined => {
  const command: RemoteCommand | undefined = {
    version: versionCommand,
    list: listCommand,
    up: upCommand,
    down: downCommand
  }[commandName.toLowerCase()]
  return command
}

const loadConfig = (): Config | undefined => {
  const configPath = process.env.REVISIONS_CONFIG ?? path.resolve(
    process.cwd(),
    './revisions.config.js'
  )
  if (existsSync(configPath)) {
    return require(configPath)
  }
}

const main = async (): Promise<void> => {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    printUsage()
    throw new Error('command required')
  }
  const commandName = args[0]
  const remoteCommand = loadRemoteCommand(commandName)
  const config = loadConfig()
  if (remoteCommand !== undefined) {
    if (config === undefined) {
      console.error('Missing revisions config.')
      console.error('Please initialize the project using init command.')
      throw new Error('missing revisions config')
    }
    const { connectionManagerModule, stateManagerModule } = config
    const { getConnectionManager } = connectionManagerModule
    const { getStateManager } = stateManagerModule
    const logger = getLogger('CLI')
    // Load connection manager and persistent facade
    const db: IConnectionManager<unknown> = getConnectionManager({ logger })
    const state: IStateManager<any> = getStateManager({ logger })
    process.on('exit', () => {
      void db.shutdown()
    })
    const service = new MigrationService({ state, logger })
    await remoteCommand(config, db, state, service, ...args)
  } else {
    const localCommand = loadLocalCommand(commandName)
    await localCommand(config, ...args)
  }
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
