import { basename } from 'path'

import {
  IConnectionManager,
  IPersistenceFacade,
  MigrationService
} from '../../service'
import { Config } from '../../config'
import { Command } from '.'

export const command: Command = async (
  config: Config,
  db: IConnectionManager<unknown>,
  dao: IPersistenceFacade<unknown>,
  service: MigrationService<unknown>,
  ...args: string[]
): Promise<void> => {
  console.log('Downgrading database...')
  await db.transaction(async (client: unknown) => {
    await dao.initialize(client)
    // Lock all concurrent writes, but allow concurrent reads
    await dao.acquireExclusiveLock(client)
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
    await dao.releaseExclusiveLock(client)
  })
}
