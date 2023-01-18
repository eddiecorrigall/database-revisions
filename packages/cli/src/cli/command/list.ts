import { basename } from 'path'

import {
  IConnectionManager,
  IRevision,
  IStateManager
} from '@database-revisions/types'

import {
  MigrationService
} from '../../service'
import { Config } from '../../config'
import { Command } from '.'
import { loadDirectory } from '../../revision'

export const command: Command = async (
  config: Config,
  db: IConnectionManager<unknown>,
  state: IStateManager<unknown>,
  service: MigrationService<unknown>,
  ...args: string[]
): Promise<void> => {
  console.log('Listing revisions...')
  let currentRevision: IRevision | undefined
  await db.transaction(async (client: unknown) => {
    await state.initialize(client)
    currentRevision = await service.fetchCurrentRevision(client, {
      namespace: config.revisionsNamespace
    })
  })
  const revisionModules = loadDirectory(config.revisionsDirectory)
  const currentRevisionModuleIndex = revisionModules.findIndex(
    (revision) => revision.version === currentRevision?.version
  )
  for (let index = 0; index < revisionModules.length; index++) {
    const revisionModule = revisionModules[index]
    const displayPreviousVersion = revisionModule.previousVersion ?? '(base)'
    let displayVersion = revisionModule.version
    if (index === currentRevisionModuleIndex) {
      displayVersion += ' (current)'
    } else if (index < currentRevisionModuleIndex) {
      displayVersion += ' (applied)'
    } else {
      displayVersion += ' (pending)'
    }
    const displayFile = basename(revisionModule.file)
    console.log('---')
    console.log(`index:    ${index}`)
    console.log(`previous: ${displayPreviousVersion}`)
    console.log(`version:  ${displayVersion}`)
    console.log(`file:     ${displayFile}`)
  }
}
