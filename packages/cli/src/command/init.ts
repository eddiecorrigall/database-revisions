import prompts from 'prompts'
import { saveConfig } from '../config'

import {
  DEFAULT_REVISIONS_DIRECTORY,
  DEFAULT_REVISIONS_NAMESPACE,
  REVISIONS_MODULES
} from '../constants'
import { printConfig } from '../print'
import { Config, LocalCommand } from '../types'

export const command: LocalCommand = async (
  config: Config | undefined,
  ...args: string[]
): Promise<void> => {
  console.log('Initialize project...')
  const hasExistingConfig = config !== undefined
  if (hasExistingConfig) {
    printConfig(config)
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
      initial: DEFAULT_REVISIONS_NAMESPACE
    },
    {
      type: 'text',
      name: 'directory',
      message: 'Where will you store revision files?',
      initial: DEFAULT_REVISIONS_DIRECTORY
    },
    {
      type: 'select',
      name: 'connectionManagerModuleName',
      message: 'What connection manager will you be using?',
      choices: REVISIONS_MODULES
        .map(({ moduleName }) => ({
          title: moduleName,
          value: moduleName
        }))
        .concat({
          title: 'No thanks. I want to implement my own.',
          value: 'custom'
        })
    },
    {
      type: 'select',
      name: 'stateManagerModuleName',
      message: 'What state manager will you be using?',
      choices: REVISIONS_MODULES
        .map(({ moduleName }) => ({
          title: moduleName,
          value: moduleName
        }))
        .concat({
          title: 'No thanks. I want to implement my own.',
          value: 'custom'
        })
    }
  ])
  await saveConfig({
    namespace,
    directory,
    connectionManagerModuleName:
      connectionManagerModuleName === 'custom'
        ? undefined
        : connectionManagerModuleName,
    stateManagerModuleName:
      stateManagerModuleName === 'custom'
        ? undefined
        : stateManagerModuleName
  })
}
