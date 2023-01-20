import { basename } from 'path'

import { MigrationService } from '../service/migration'
import { Config, RemoteCommand } from '../types'
import {
  IConnectionManager, IStateManager
} from '@database-revisions/types'

export const command: RemoteCommand = async (
  config: Config,
  db: IConnectionManager<unknown>,
  state: IStateManager<unknown>,
  service: MigrationService<unknown>,
  ...args: string[]
): Promise<void> => {
  console.log('Downgrading database...')
  console.log(`namespace: ${config.revisionsNamespace}`)
  console.log(`directory: ${config.revisionsDirectory}`)
  await db.transaction(async (client: unknown) => {
    await state.initialize(client)
    // Lock all concurrent writes, but allow concurrent reads
    await state.acquireExclusiveLock(client)
    // Revert current revision
    const {
      finalRevision,
      pendingRevisionModules
    } = await service.downgrade(client, {
      namespace: config.revisionsNamespace,
      directory: config.revisionsDirectory
    })

    const initialRevisionModule = pendingRevisionModules[0]

    if (pendingRevisionModules.length === 0) {
      console.log('...nothing to downgrade')
    } else if (finalRevision === undefined) {
      console.log(`version: ${initialRevisionModule.version} -> (base)`)
      console.log(`file:    ${basename(initialRevisionModule.file)} -> (base)`)
    } else {
      console.log(
        'version: ' +
        initialRevisionModule.version +
        ' -> ' +
        finalRevision.version
      )
      console.log(
        'file:    ' +
        basename(initialRevisionModule.file) +
        ' -> ' +
        basename(finalRevision.file)
      )
    }
    // Unlock resource
    await state.releaseExclusiveLock(client)
  })
}
