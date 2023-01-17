import {
  IConnectionManager,
  IPersistenceFacade
} from '@database-revisions/types'
import { Config } from '../../config'
import {
  MigrationService
} from '../../service'

export type Command = (
  config: Config,
  db: IConnectionManager<unknown>,
  dao: IPersistenceFacade<unknown>,
  service: MigrationService<unknown>,
  ...args: string[]
) => Promise<void>
