import {
  IConnectionManager, IStateManager
} from '@database-revisions/types'
import { Config } from '../../config'
import {
  MigrationService
} from '../../service'

export type Command = (
  config: Config,
  db: IConnectionManager<unknown>,
  state: IStateManager<unknown>,
  service: MigrationService<unknown>,
  ...args: string[]
) => Promise<void>
