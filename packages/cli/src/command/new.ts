import { Config, LocalCommand } from '../types'
import { DEFAULT_REVISIONS_DIRECTORY } from '../constants'
import { newRevision } from '../revision'

export const command: LocalCommand = async (
  config: Config | undefined,
  ...args: string[]
): Promise<void> => {
  console.log('New revision...')
  console.log(`namespace: ${config?.revisionsNamespace ?? ''}`)
  console.log(`directory: ${config?.revisionsDirectory ?? ''}`)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_commandName, description] = args
  if (description === undefined) {
    throw new Error('missing description')
  }
  const revisionFile: string = await newRevision({
    directory: config?.revisionsDirectory ?? DEFAULT_REVISIONS_DIRECTORY,
    description
  })
  console.log(`file: ${revisionFile}`)
}
