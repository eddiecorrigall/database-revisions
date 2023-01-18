import {
  MigrationService
} from '../../service'
import { Config } from '../../config'
import { Command } from '.'
import {
  IConnectionManager, IStateManager
} from '@database-revisions/types'

export const command: Command = async (
  config: Config,
  db: IConnectionManager<unknown>,
  state: IStateManager<unknown>,
  service: MigrationService<unknown>,
  ...args: string[]
): Promise<void> => {
  console.log('New revision...')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_commandName, description] = args
  if (description === undefined) {
    throw new Error('missing description')
  }
  const revisionFile: string = await service.newRevision({
    directory: config.revisionsDirectory,
    description
  })
  console.log(`file: ${revisionFile}`)
}
