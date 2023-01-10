import { basename } from 'path'

import { expectEnv } from './lib/env'
import { getLogger } from './lib/logger'
import { MongoDBConnectionManager } from './client/mongodb'

import { PostgreSQLConnectionManager } from './client/postgres'
import { MongoDBPersistence } from './dao/mongodb'
import { PostgreSQLPersistence } from './dao/postgres'
import {
  DatabaseMigrationService,
  IDatabaseConnectionManager,
  IPersistenceFacade
} from './service'

// eg. your-app-name
const MIGRATE_NAMESPACE = expectEnv('MIGRATE_NAMESPACE')

// eg. /Users/eddiecorrigall/repos/my-project/dist/src/revisions
const MIGRATE_DIRECTORY = expectEnv('MIGRATE_DIRECTORY')

// eg. postgresql, mongodb, etc.
const MIGRATE_CLIENT = expectEnv('MIGRATE_CLIENT')

const logger = getLogger('CLI')
let db: IDatabaseConnectionManager<unknown>
let dao: IPersistenceFacade<any>

switch (MIGRATE_CLIENT) {
  case 'mongodb': {
    const uri = expectEnv('MONGODB_URI')
    const connection = MongoDBConnectionManager.createConnection(uri)
    db = new MongoDBConnectionManager(connection, { logger })
    dao = new MongoDBPersistence({ logger })
  } break
  case 'postgresql': {
    const pool = PostgreSQLConnectionManager.createPool()
    db = new PostgreSQLConnectionManager(pool, { logger })
    dao = new PostgreSQLPersistence({ logger })
  } break
  default: {
    console.error(`ERROR: Unknown client [${MIGRATE_CLIENT}]`)
    process.exit(1)
  }
}

process.on('exit', () => {
  void db.shutdown()
})

const migrationService = new DatabaseMigrationService({ dao, logger })

const _fetchCurrentVersion = async (): Promise<string | undefined> => {
  let version
  await db.transaction(async (client: unknown) => {
    await dao.initialize(client)
    version = await migrationService.fetchCurrentVersion(
      client,
      MIGRATE_NAMESPACE
    )
  })
  return version
}

const fetchCurrentVersion = async (): Promise<void> => {
  const currentVersion = await _fetchCurrentVersion()
  if (currentVersion === undefined) {
    console.log('no version')
  } else {
    console.log(currentVersion)
  }
}

const newRevision = async (description: string): Promise<void> => {
  const revisionFile = await migrationService.newRevision(
    MIGRATE_DIRECTORY,
    description
  )
  console.log(`file: ${revisionFile}`)
}

const listRevisions = async (): Promise<void> => {
  const revisions = migrationService.computeRevisions(MIGRATE_DIRECTORY)
  const currentVersion = await _fetchCurrentVersion()
  const currentVersionIndex = revisions.findIndex(
    (revision) => revision.version === currentVersion
  )
  for (let index = 0; index < revisions.length; index++) {
    const revision = revisions[index]
    const displayPreviousVersion = revision.previousVersion ?? '(base)'
    let displayVersion = revision.version
    if (index === currentVersionIndex) {
      displayVersion += ' (current)'
    } else if (index < currentVersionIndex) {
      displayVersion += ' (applied)'
    } else {
      displayVersion += ' (pending)'
    }
    const displayFile = basename(revision.file)
    console.log('---')
    console.log(`index:    ${index}`)
    console.log(`previous: ${displayPreviousVersion}`)
    console.log(`version:  ${displayVersion}`)
    console.log(`file:     ${displayFile}`)
  }
}

const upgrade = async (): Promise<void> => {
  await db.transaction(async (client: unknown) => {
    await dao.initialize(client)
    // Lock all concurrent writes, but allow concurrent reads
    await dao.acquireExclusiveLock(client)
    // Apply all pending revisions
    console.log('upgrading...')
    const {
      initialRevision,
      finalRevision
    } = await migrationService.upgrade(
      client, MIGRATE_NAMESPACE, MIGRATE_DIRECTORY)
    if (finalRevision === undefined) {
      console.log('nothing to upgrade')
    } else {
      if (initialRevision === undefined) {
        console.log(`version: (base) -> ${finalRevision.version}`)
        console.log(`file:    (base) -> ${basename(finalRevision.file)}`)
      } else {
        console.log(
          'version: ' +
          `${initialRevision.version} -> ${finalRevision.version}`
        )
        console.log(
          'file:    ' +
          `${basename(initialRevision.file)} -> ${basename(finalRevision.file)}`
        )
      }
    }
    // Unlock resource
    await dao.releaseExclusiveLock(client)
  })
  await listRevisions()
}

const downgrade = async (): Promise<void> => {
  await db.transaction(async (client: unknown) => {
    await dao.initialize(client)
    // Lock all concurrent writes, but allow concurrent reads
    await dao.acquireExclusiveLock(client)
    // Revert current revision
    console.log('downgrading...')
    const {
      initialRevision,
      finalRevision
    } = await migrationService.downgrade(
      client, MIGRATE_NAMESPACE, MIGRATE_DIRECTORY)
    if (finalRevision === undefined) {
      if (initialRevision === undefined) {
        console.log('nothing to downgrade')
      } else {
        console.log(`version: ${initialRevision.version} -> (base)`)
        console.log(`file:    ${basename(initialRevision.file)} -> (base)`)
      }
    } else {
      if (initialRevision === undefined) {
        throw new Error('this should not be possible')
      } else {
        console.log(
          'version: ' +
          `${initialRevision.version} -> ${finalRevision.version}`
        )
        console.log(
          'file:    ' +
          `${basename(initialRevision.file)} -> ${basename(finalRevision.file)}`
        )
      }
    }
    // Unlock resource
    await dao.releaseExclusiveLock(client)
  })
  await listRevisions()
}

const printUsage = async (): Promise<void> => {
  console.log('Usage: migrate [up|down|version|help]')
  console.log('Environment variables:')
  console.log(
    '  MIGRATE_NAMESPACE ' +
    '- namespace for managing more than one version'
  )
  console.log(
    '  MIGRATE_DIRECTORY ' +
    '- path to revisions directory containing revisions files'
  )
  console.log(
    '  MIGRATE_CLIENT    ' +
    '- database client type (eg. postgresql, mongodb, etc)'
  )
}

const args = process.argv.slice(2)

if (args.length === 0) {
  void printUsage().then(() => {
    process.exit(1)
  })
}

const onSuccess = (): void => {
  process.exit(0)
}

const onFailure = (reason?: string): void => {
  if (reason !== undefined) {
    console.log(`ERROR: ${reason}`)
  }
  process.exit(1)
}

const command = args[0].toLowerCase()

switch (command) {
  case 'version': fetchCurrentVersion().then(onSuccess, onFailure); break
  case 'new': {
    const description = process.argv[3]
    if (description === undefined) {
      void printUsage().then(() => {
        onFailure('missing description')
      })
    } else {
      newRevision(description).then(onSuccess, onFailure)
    }
    break
  }
  case 'list': listRevisions().then(onSuccess, onFailure); break
  case 'up': upgrade().then(onSuccess, onFailure); break
  case 'down': downgrade().then(onSuccess, onFailure); break
  case 'help': printUsage().then(onSuccess, onFailure); break
  default: {
    onFailure(`unknown command [${command}]`)
  }
}
