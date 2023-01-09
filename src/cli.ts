import { basename } from 'path';

import { expectEnv } from './lib/env';
import { getLogger } from './lib/logger';
import { MongoDBConnectionManager } from './client/mongodb';

import { PostgreSQLConnectionManager } from './client/postgres';
import { MongoDBPersistence } from './dao/mongodb';
import { PostgreSQLPersistence } from './dao/postgres';
import { DatabaseMigrationService, IDatabaseConnectionManager, IPersistenceFacade } from './service';

// eg. your-app-name
const MIGRATE_NAMESPACE = expectEnv('MIGRATE_NAMESPACE');

// eg. /Users/eddiecorrigall/repos/my-project/dist/src/revisions
const MIGRATE_DIRECTORY = expectEnv('MIGRATE_DIRECTORY');

// eg. postgresql, mongodb, etc.
const MIGRATE_CLIENT = expectEnv('MIGRATE_CLIENT');

const logger = getLogger('CLI');
let db: IDatabaseConnectionManager;
let dao: IPersistenceFacade;

switch (MIGRATE_CLIENT) {
  case 'mongodb': {
    const uri = expectEnv('MONGODB_URI');
    const connection = MongoDBConnectionManager.createConnection(uri);
    db = new MongoDBConnectionManager(connection, { logger });
    dao = new MongoDBPersistence({ logger });
  } break;
  case 'postgresql': {
    const pool = PostgreSQLConnectionManager.createPool();
    db = new PostgreSQLConnectionManager(pool, { logger });
    dao = new PostgreSQLPersistence({ logger });
  } break;
  default: {
    console.error(`ERROR: Unknown client [${MIGRATE_CLIENT}]`);
    process.exit(1);
  }
}

process.on('exit', () => {
  db.shutdown();
});

const migrationService = new DatabaseMigrationService({ dao, logger });

const _fetchCurrentVersion = async (): Promise<string | undefined> => {
  let version;
  await db.transaction(async (client: unknown) => {
    await dao.initialize(client);
    version = await migrationService.fetchCurrentVersion(client, MIGRATE_NAMESPACE);
  });
  return version;
};

const fetchCurrentVersion = async () => {
  const currentVersion = await _fetchCurrentVersion();
  if (currentVersion) {
    console.log(currentVersion);
  }
};

const listRevisions = async () => {
  const revisions = migrationService.computeRevisions(MIGRATE_DIRECTORY);
  const currentVersion = await _fetchCurrentVersion();
  const currentVersionIndex = revisions.findIndex((revision) => revision.version === currentVersion);
  for (let index = 0; index < revisions.length; index++) {
    const revision = revisions[index];
    const displayPreviousVersion = revision.previousVersion ?? '(base)';
    let displayVersion = revision.version;
    if (index === currentVersionIndex) {
      displayVersion += ' (current)';
    } else if (index < currentVersionIndex) {
      displayVersion += ' (applied)';
    } else {
      displayVersion += ' (pending)';
    }
    const displayFile = basename(revision.file);
    console.log('---');
    console.log(`index:    ${index}`);
    console.log(`previous: ${displayPreviousVersion}`);
    console.log(`version:  ${displayVersion}`);
    console.log(`file:     ${displayFile}`);
  }
};

const upgrade = async () => {
  await db.transaction(async (client: unknown) => {
    await dao.initialize(client);
    // Lock all concurrent writes, but allow concurrent reads
    await dao.acquireExclusiveLock(client);
    // Apply all pending revisions
    console.log('upgrading...');
    const {
      initialRevision,
      finalRevision,
    } = await migrationService.upgrade(client, MIGRATE_NAMESPACE, MIGRATE_DIRECTORY);
    if (finalRevision === undefined) {
      console.log('nothing to upgrade');
    } else {
      if (initialRevision === undefined) {
        console.log(`version: (base) -> ${finalRevision.version}`);
        console.log(`file:    (base) -> ${basename(finalRevision.file)}`);
      } else {
        console.log(`version: ${initialRevision.version} -> ${finalRevision.version}`);
        console.log(`file:    ${basename(initialRevision.file)} -> ${basename(finalRevision.file)}`);
      }
    }
    // Unlock resource
    await dao.releaseExclusiveLock(client);
  });
  await listRevisions();
};

const downgrade = async () => {
  await db.transaction(async (client: unknown) => {
    await dao.initialize(client);
    // Lock all concurrent writes, but allow concurrent reads
    await dao.acquireExclusiveLock(client);
    // Revert current revision
    console.log('downgrading...');
    const {
      initialRevision,
      finalRevision,
    } = await migrationService.downgrade(client, MIGRATE_NAMESPACE, MIGRATE_DIRECTORY);
    if (finalRevision === undefined) {
      if (initialRevision === undefined) {
        console.log('nothing to downgrade');
      } else {
        console.log(`version: ${initialRevision.version} -> (base)`);
        console.log(`file:    ${basename(initialRevision.file)} -> (base)`);
      }
    } else {
      console.log(`version: ${initialRevision?.version} -> ${finalRevision.version}`);
      console.log(`file:    ${initialRevision?.file ? basename(initialRevision.file) : ''} -> ${basename(finalRevision.file)}`);
    }
    // Unlock resource
    await dao.releaseExclusiveLock(client);
  });
  await listRevisions();
};

const printUsage = async () => {
  console.log('Usage: migrate [up|down|version|help]');
  console.log('Environment variables:');
  console.log('  MIGRATE_NAMESPACE - namespace for managing more than one version');
  console.log('  MIGRATE_DIRECTORY - path to revisions directory containing revisions files');
  console.log('  MIGRATE_CLIENT    - database client type (eg. postgresql, mongodb, etc)');
};

const args = process.argv.slice(2);

if (!args.length) {
  printUsage();
  process.exit(1);
}

const command = args[0].toLowerCase();
let commandPromise: Promise<unknown>;

switch (command) {
  case 'version': commandPromise = fetchCurrentVersion(); break;
  case 'list': commandPromise = listRevisions(); break;
  case 'up': commandPromise = upgrade(); break;
  case 'down': commandPromise = downgrade(); break;
  case 'help': commandPromise = printUsage(); break;
  default: {
    console.error(`ERROR: Unknown command [${command}]`);
    printUsage();
    process.exit(1);
  }
}

commandPromise.then(() => {
  process.exit(0);
});
