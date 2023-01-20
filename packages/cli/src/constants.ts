export const REVISIONS_MODULES: Array<{
  databaseName: string
  moduleName: string
}> = [
  {
    databaseName: 'PostgreSQL',
    moduleName: '@database-revisions/postgresql'
  },
  {
    databaseName: 'MongoDB',
    moduleName: '@database-revisions/mongodb'
  }
]

export const DEFAULT_REVISIONS_CONFIG = './revisions.config.js'
export const DEFAULT_REVISIONS_DIRECTORY = './revisions'
export const DEFAULT_REVISIONS_MODULE = REVISIONS_MODULES[0].moduleName
