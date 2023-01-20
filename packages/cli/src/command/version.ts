import { basename } from 'path'

import {
  IConnectionManager,
  IRevision,
  IStateManager
} from '@database-revisions/types'

import { MigrationService } from '../service/migration'
import { Config, RemoteCommand } from '../types'

export const command: RemoteCommand = async (
  config: Config,
  db: IConnectionManager<unknown>,
  state: IStateManager<unknown>,
  service: MigrationService<unknown>,
  ...args: string[]
): Promise<void> => {
  console.log('Fetching current revision...')
  console.log(`namespace: ${config.revisionsNamespace}`)
  console.log(`directory: ${config.revisionsDirectory}`)
  let currentRevision: IRevision | undefined
  await db.transaction(async (client: unknown) => {
    await state.initialize(client)
    currentRevision = await service.fetchCurrentRevision(client, {
      namespace: config.revisionsNamespace
    })
  })
  if (currentRevision === undefined) {
    console.log('version: (base)')
  } else {
    const displayPreviousVersion = currentRevision.previousVersion ?? '(base)'
    const displayVersion = currentRevision.version
    const displayFile = basename(currentRevision.file)
    console.log(`previous:   ${displayPreviousVersion}`)
    console.log(`version:    ${displayVersion}`)
    console.log(`file:       ${displayFile}`)
    if (currentRevision.createdAt !== undefined) {
      console.log(`created at: ${currentRevision.createdAt.toISOString()}`)
    }
    if (currentRevision.updatedAt !== undefined) {
      console.log(`updated at: ${currentRevision.updatedAt.toISOString()}`)
    }
  }
}
