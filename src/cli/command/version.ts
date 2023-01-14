import { basename } from 'path'

import { IRevision } from '../../revision'
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
  console.log('Fetching current revision...')
  let currentRevision: IRevision | undefined
  await db.transaction(async (client: unknown) => {
    await dao.initialize(client)
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
    console.log(`previous: ${displayPreviousVersion}`)
    console.log(`version:  ${displayVersion}`)
    console.log(`file:     ${displayFile}`)
  }
}