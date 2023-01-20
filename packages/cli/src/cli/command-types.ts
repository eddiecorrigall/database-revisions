import {
  IConnectionManager, IStateManager
} from '@database-revisions/types'
import { Config } from '../config'
import {
  MigrationService
} from '../service'

export type LocalCommand = (
  config: Config | undefined,
  ...args: string[]
) => Promise<void>

export type RemoteCommand = (
  config: Config,
  db: IConnectionManager<unknown>,
  state: IStateManager<unknown>,
  service: MigrationService<unknown>,
  ...args: string[]
) => Promise<void>
