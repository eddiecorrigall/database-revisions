import { Config } from './types'

export const printConfig = (config?: Config): void => {
  console.log(`namespace: ${config?.revisionsNamespace ?? ''}`)
  console.log(`directory: ${config?.revisionsDirectory ?? ''}`)
}

export const printUsage = (): void => {
  console.log('Usage: database-revisions [new|version|list|up|down|help]')
  console.log('Environment variables:')
  console.log('  REVISIONS_CONFIG - absolute path to database-revisions config')
}
