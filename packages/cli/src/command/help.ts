import { printUsage } from '../print'
import { Config, LocalCommand } from '../types'

export const command: LocalCommand = async (
  config: Config | undefined,
  ...args: string[]
): Promise<void> => {
  printUsage()
}
