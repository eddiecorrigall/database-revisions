import { getLogger } from './lib/logger'

import { MigrationService } from './service/migration'

import { command as initCommand } from './command/init'
import { command as newCommand } from './command/new'
import { command as versionCommand } from './command/version'
import { command as listCommand } from './command/list'
import { command as upCommand } from './command/up'
import { command as downCommand } from './command/down'
import { command as helpCommand, printUsage } from './command/help'
import { Config, LocalCommand, RemoteCommand } from './types'
import {
  IConnectionManager, IStateManager
} from '@database-revisions/types'
import path from 'path'
import { existsSync } from 'fs'

const loadLocalCommand = (commandName: string): LocalCommand | undefined => {
  const command: LocalCommand | undefined = {
    init: initCommand,
    new: newCommand,
    help: helpCommand
  }[commandName.toLowerCase()]
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

export const main = async (): Promise<void> => {
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
    if (localCommand === undefined) {
      throw new Error('unknown command')
    }
    await localCommand(config, ...args)
  }
}
