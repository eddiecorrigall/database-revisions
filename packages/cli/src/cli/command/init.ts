import prompts from 'prompts'

import { writeFileSync } from 'fs'
import path from 'path'

import { Config } from '../../config'
import { LocalCommand } from '../command-types'
import { REVISIONS_MODULES } from '..'

export const command: LocalCommand = async (
  config: Config | undefined,
  ...args: string[]
): Promise<void> => {
  console.log('Initialize project...')
  const filePath = path.resolve(
    process.cwd(),
    './revisions.config.js'
  )
  const { canOverwrite } = await prompts([
    {
      style: 'emoji',
      type: 'toggle',
      name: 'canOverwrite',
      message: 'Config already exists. Do you want to overwrite file?',
      initial: false,
      active: 'yes',
      inactive: 'no'
    }
  ])
  if (!(canOverwrite as boolean)) {
    console.log('abort!')
    return
  }
  const {
    namespace,
    directory,
    connectionManagerModuleName,
    stateManagerModuleName
  } = await prompts([
    {
      type: 'text',
      name: 'namespace',
      message: 'What is your application name?',
      initial: 'default'
    },
    {
      type: 'text',
      name: 'directory',
      message: 'Where will you store revision files?',
      initial: './revisions'
    },
    {
      type: 'select',
      name: 'connectionManagerModuleName',
      message: 'What connection manager will you be using?',
      choices: REVISIONS_MODULES.map(({
        databaseName,
        moduleName
      }) => ({
        title: moduleName,
        value: moduleName
      })).concat({
        title: 'No thanks. I want to implement my own.',
        value: 'custom'
      })
    },
    {
      type: 'select',
      name: 'stateManagerModuleName',
      message: 'What state manager will you be using?',
      choices: REVISIONS_MODULES.map(({
        databaseName,
        moduleName
      }) => ({
        title: moduleName,
        value: moduleName
      })).concat({
        title: 'No thanks. I want to implement my own.',
        value: 'custom'
      })
    }
  ])
  const hasCustomConnectionManager = connectionManagerModuleName === 'custom'
  const hasCustomStateManager = stateManagerModuleName === 'custom'
  const fileContentLines = []
  fileContentLines.push('const path = require("path");')
  fileContentLines.push('module.exports = {')
  fileContentLines.push(
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    `  revisionsNamespace: '${namespace}',`
  )
  fileContentLines.push(
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    `  revisionsDirectory: path.resolve(__dirname, '${directory}'),`
  )
  if (hasCustomConnectionManager) {
    fileContentLines.push('  connectionManagerModule: {')
    fileContentLines.push('    getConnectionManager: () => {')
    fileContentLines.push('      throw new Error("not implemented");')
    fileContentLines.push('    },')
    fileContentLines.push('  },')
  } else {
    fileContentLines.push(
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      `  connectionManagerModule: require('${connectionManagerModuleName}'),`
    )
  }
  if (hasCustomStateManager) {
    fileContentLines.push('  stateManagerModule: {')
    fileContentLines.push('    getStateManager: () => {')
    fileContentLines.push('      throw new Error("not implemented");')
    fileContentLines.push('    },')
    fileContentLines.push('  },')
  } else {
    fileContentLines.push(
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      `  stateManagerModule: require('${stateManagerModuleName}'),`
    )
  }
  fileContentLines.push('}')
  const fileContent = fileContentLines.join('\n')
  writeFileSync(filePath, fileContent)
  console.log(`config file: ${filePath}`)
}
