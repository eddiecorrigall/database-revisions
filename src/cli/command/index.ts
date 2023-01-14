import { Config } from '../../config'
import {
  IConnectionManager,
  IPersistenceFacade,
  MigrationService
} from '../../service'

export type Command = (
  config: Config,
  db: IConnectionManager<unknown>,
  dao: IPersistenceFacade<unknown>,
  service: MigrationService<unknown>,
  ...args: string[]
) => Promise<void>
