import { readdirSync } from 'fs'
import { join as pathJoin } from 'path'

import { hash, hashFile } from './lib/hash'

export interface IRevision {
  readonly file: string
  readonly version: string
  readonly previousVersion: string | undefined
  readonly createdAt?: Date
  readonly updatedAt?: Date
}

export interface IRevisionModule {
  previousVersion: string | undefined
  up: (client: unknown) => unknown
  down: (client: unknown) => unknown
  // transients...
  file: string
  fileHash: string
}

export const computeVersion = (
  previousVersion: string | undefined,
  fileHash: string
): string => {
  // Build a Merkel Tree
  // https://en.wikipedia.org/wiki/Merkle_tree
  return previousVersion === undefined
    ? fileHash
    : hash(fileHash + previousVersion)
}

export const revisionModuleAsRevision = (
  revisionModule: IRevisionModule
): IRevision => {
  return {
    file: revisionModule.file,
    version: computeVersion(
      revisionModule.previousVersion,
      revisionModule.fileHash
    ),
    previousVersion: revisionModule.previousVersion
  }
}

export const fileFilter = (filename: string): boolean => {
  const pattern = /^.+\.revision\.(ts|js)$/
  return pattern.test(filename)
}

export const loadFile = (file: string): IRevisionModule => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { previousVersion, up, down } = require(file)
  if (previousVersion !== undefined && typeof previousVersion !== 'string') {
    throw new Error(
      'revision file missing previousVersion variable'
    )
  }
  if (typeof up !== 'function') {
    throw new Error('revision file missing up function')
  }
  if (typeof down !== 'function') {
    throw new Error('revision file missing down function')
  }
  return {
    file,
    fileHash: hashFile(file),
    previousVersion,
    up,
    down
  }
}

export const loadDirectory = (revisionDirectory: string): IRevisionModule[] => {
  // assume revision order is lexicographically ordered
  const files = readdirSync(revisionDirectory)
    .filter(fileFilter)
    .map((file) => pathJoin(revisionDirectory, file))
  const revisionModules: IRevisionModule[] = []
  for (const file of files) {
    revisionModules.push(loadFile(file))
  }
  if (revisionModules.length === 0) {
    return []
  } else {
    return sortAndVerifyRevisionModules(revisionModules)
  }
}

export const verifyRevisionModule = (
  trustedRevision: IRevision,
  revisionModule: IRevisionModule
): IRevisionModule => {
  const hasValidPreviousVersion =
    trustedRevision.previousVersion === revisionModule.previousVersion
  if (!hasValidPreviousVersion) {
    throw new Error(
      'previous version invalid - ' +
      `expected ${trustedRevision.previousVersion ?? 'undefined (base)'} ` +
      `but got ${revisionModule.previousVersion ?? 'undefined (base)'}`
    )
  }
  const untrustedVersion = computeVersion(
    revisionModule.previousVersion,
    revisionModule.fileHash
  )
  const hasValidVersion = trustedRevision.version === untrustedVersion
  if (!hasValidVersion) {
    throw new Error(
      'version mismatch - ' +
      `expected ${trustedRevision.version} ` +
      `but got ${untrustedVersion} ` +
      `for file ${trustedRevision.file}`
    )
  }
  return revisionModule
}

export const sortAndVerifyRevisionModules = (
  unsortedRevisionModules: IRevisionModule[]
): IRevisionModule[] => {
  // complexity: runtime is O(n), space O(n)
  // determine initial revision and build lookup table...
  let initialRevisionModule
  const revisionModuleByPreviousVersion: Record<string, IRevisionModule> = {}
  for (const revisionModule of unsortedRevisionModules) {
    if (revisionModule.previousVersion === undefined) {
      initialRevisionModule = revisionModule
    } else {
      revisionModuleByPreviousVersion[
        revisionModule.previousVersion
      ] = revisionModule
    }
  }
  if (initialRevisionModule === undefined) {
    throw new Error('missing first revision')
  }
  // use lookup table to traverse from initial revision to final revision
  const sortedRevisionModules: IRevisionModule[] = []
  let nextRevisionModule = initialRevisionModule
  while (true) {
    sortedRevisionModules.push(nextRevisionModule)
    nextRevisionModule = revisionModuleByPreviousVersion[
      computeVersion(
        nextRevisionModule.previousVersion,
        nextRevisionModule.fileHash
      )
    ]
    if (nextRevisionModule === undefined) {
      break
    }
  }
  if (sortedRevisionModules.length !== unsortedRevisionModules.length) {
    const suspectedFile = sortedRevisionModules[
      sortedRevisionModules.length - 1
    ].file
    throw new Error(`revisions are disjoint - check file ${suspectedFile}`)
  }
  return sortedRevisionModules
}

export const resolveUpgradePath = (
  revisionModules: IRevisionModule[], // local file system (sorted and verified)
  currentRevision: IRevision | undefined // remote server (source of truth)
): {
  initialRevision: IRevision | undefined
  pendingRevisions: IRevision[]
} => {
  /* scenarios:
   * - nothing to upgrade
   * - all revisions are pending
   * - some pending revisions
   */
  const sortedRevisionModules = sortAndVerifyRevisionModules(revisionModules)
  // locate next pending revision...
  let nextRevisionModuleIndex
  if (currentRevision === undefined) {
    // all revisions are pending
    // locate first pending revision module
    if (sortedRevisionModules.length === 0) {
      // nothing to do
      return {
        initialRevision: undefined,
        pendingRevisions: []
      }
    }
    nextRevisionModuleIndex = 0
  } else {
    // locate and verify revision module
    const currentRevisionModuleIndex = sortedRevisionModules.findIndex(
      (revisionModule) => revisionModule.file === currentRevision.file
    )
    if (currentRevisionModuleIndex < 0) {
      throw new Error(
        'no upgrade path - cannot find revision module for current version'
      )
    }
    const currentRevisionModule =
      sortedRevisionModules[currentRevisionModuleIndex]
    verifyRevisionModule(currentRevision, currentRevisionModule)
    nextRevisionModuleIndex = currentRevisionModuleIndex + 1
    if (nextRevisionModuleIndex >= sortedRevisionModules.length) {
      // nothing to do
      return {
        initialRevision: currentRevision,
        pendingRevisions: []
      }
    }
  }
  return {
    initialRevision: currentRevision,
    pendingRevisions: sortedRevisionModules.slice(
      nextRevisionModuleIndex
    ).map(revisionModuleAsRevision)
  }
}

export const resolveDowngradePath = (
  revisions: IRevision[],
  currentRevision: IRevision | undefined
): {
  finalRevision: IRevision | undefined // used to set version
  pendingRevisions: IRevision[] // used to invoke down
} => {
  /* scenarios:
   * - nothing to downgrade
   * - has no previous version / previous version is base
   * - has previous version
   */
  if (currentRevision === undefined) {
    // nothing to downgrade
    return {
      finalRevision: undefined,
      pendingRevisions: []
    }
  }
  verifyRevisionModule(currentRevision, loadFile(currentRevision.file))
  if (currentRevision.previousVersion === undefined) {
    // first revision after base
    return {
      finalRevision: undefined,
      pendingRevisions: [currentRevision]
    }
  }
  // check for valid revision dependency (previous version)
  const previousAppliedRevision = revisions.find(
    (revision) => revision.version === currentRevision.previousVersion
  )
  if (previousAppliedRevision === undefined) {
    // should have a previous version
    throw new Error('no upgrade path - missing revision dependency')
  }
  verifyRevisionModule(
    previousAppliedRevision,
    loadFile(previousAppliedRevision.file)
  )
  return {
    finalRevision: previousAppliedRevision,
    pendingRevisions: [currentRevision]
  }
}

export const generateFileName = (description: string): string => {
  const timestamp = Date.now()
  const label = description
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .substring(0, 50)
  return `${timestamp}_${label}.revision.js`
}

export const generateFileContent = (
  previousVersion: string | undefined
): string => (
  (
    previousVersion === undefined
      ? 'const previousVersion = undefined\n'
      : `const previousVersion = '${previousVersion}'\n`
  ) +
  'const up = async (client) => {}\n' +
  'const down = async (client) => {}\n' +
  'module.exports = { previousVersion, up, down }\n'
)