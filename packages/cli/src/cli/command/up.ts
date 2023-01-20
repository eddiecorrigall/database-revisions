import { basename } from 'path'

import {
  MigrationService
} from '../../service'
import { Config } from '../../config'
import { RemoteCommand } from '.'
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
  console.log('Upgrading database...')
  await db.transaction(async (client: unknown) => {
    await state.initialize(client)
    // Lock all concurrent writes, but allow concurrent reads
    await state.acquireExclusiveLock(client)
    // Apply all pending revisions
    const {
      initialRevision,
      pendingRevisionModules
    } = await service.upgrade(client, {
      namespace: config.revisionsNamespace,
      directory: config.revisionsDirectory
    })
    const finalRevisionModule = pendingRevisionModules[
      pendingRevisionModules.length - 1
    ]
    if (pendingRevisionModules.length === 0) {
      console.log('...nothing to upgrade')
    } else if (initialRevision === undefined) {
      console.log(`version: (base) -> ${finalRevisionModule.version}`)
      console.log(`file:    (base) -> ${basename(finalRevisionModule.file)}`)
    } else {
      console.log(
        'version: ' +
        initialRevision.version +
        ' -> ' +
        finalRevisionModule.version
      )
      console.log(
        'file:    ' +
        basename(initialRevision.file) +
        ' -> ' +
        basename(finalRevisionModule.file)
      )
    }
    // Unlock resource
    await state.releaseExclusiveLock(client)
  })
}
