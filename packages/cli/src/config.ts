import fs from 'fs'
import path from 'path'

import { DEFAULT_REVISIONS_CONFIG } from './constants'
import { Config } from './types'

export const getConfigPath = (): string => {
  return process.env.REVISIONS_CONFIG ?? path.resolve(
    process.cwd(),
    DEFAULT_REVISIONS_CONFIG
  )
}

export const loadConfig = async (): Promise<Config | undefined> => {
  const configPath = getConfigPath()
  if (fs.existsSync(configPath)) {
    return await import(configPath)
  }
}

export const saveConfig = async (args: {
  namespace: string
  directory: string
  connectionManagerModuleName?: string
  stateManagerModuleName?: string
}): Promise<void> => {
  const configLines = []
  configLines.push('const path = require(\'path\');')
  configLines.push('')
  configLines.push('module.exports = {')
  configLines.push(
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    `  revisionsNamespace: '${args.namespace}',`
  )
  configLines.push(
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    `  revisionsDirectory: path.resolve(__dirname, '${args.directory}'),`
  )
  if (args.connectionManagerModuleName === undefined) {
    configLines.push('  connectionManagerModule: {')
    configLines.push('    getConnectionManager: () => {')
    configLines.push('      throw new Error(\'not implemented\');')
    configLines.push('    },')
    configLines.push('  },')
  } else {
    configLines.push(
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      `  connectionManagerModule: require('${
        args.connectionManagerModuleName
      }'),`
    )
  }
  if (args.stateManagerModuleName === undefined) {
    configLines.push('  stateManagerModule: {')
    configLines.push('    getStateManager: () => {')
    configLines.push('      throw new Error(\'not implemented\');')
    configLines.push('    },')
    configLines.push('  },')
  } else {
    configLines.push(
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      `  stateManagerModule: require('${
        args.stateManagerModuleName
      }'),`
    )
  }
  configLines.push('};')
  configLines.push('')
  const configContent = configLines.join('\n')
  const configPath = getConfigPath()
  fs.writeFileSync(configPath, configContent)
  console.log(`config file: ${configPath}`)
}
