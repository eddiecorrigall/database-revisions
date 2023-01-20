import { Config, LocalCommand } from '../types'

export const printUsage = (): void => {
  console.log('Usage: migrate [new|version|list|up|down|help]')
  console.log('Environment variables:')
  console.log('  REVISIONS_CONFIG - absolute path to database-revisions config')
}

export const command: LocalCommand = async (
  config: Config | undefined,
  ...args: string[]
): Promise<void> => {
  printUsage()
}
