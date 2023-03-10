import assert from 'assert'

import { IRevision, IRevisionModule } from '@database-revisions/types'

import {
  computeVersion,
  fileFilter,
  generateFileName,
  resolveUpgradePath,
  verifyRevisionModule
} from '../../src/revision'
import { hash } from '../lib/hash'

const firstRevisionFileHash = 'hash1'
const firstRevision: IRevision = {
  previousVersion: undefined,
  version: firstRevisionFileHash,
  file: 'bbb.revision.js' // second lexicographically, but first revision
}
const firstRevisionModule: IRevisionModule = {
  previousVersion: firstRevision.previousVersion,
  up: (client: unknown) => {},
  down: (client: unknown) => {},
  version: firstRevision.version,
  file: firstRevision.file,
  fileHash: firstRevisionFileHash
}

const secondRevisionFileHash = 'hash2'
const secondRevision: IRevision = {
  previousVersion: firstRevision.version,
  version: hash(secondRevisionFileHash + firstRevision.version),
  file: 'aaa.revisions.js' // first lexicographically, but second revision
}
const secondRevisionModule: IRevisionModule = {
  previousVersion: secondRevision.previousVersion,
  up: (client: unknown) => {},
  down: (client: unknown) => {},
  version: secondRevision.version,
  file: secondRevision.file,
  fileHash: secondRevisionFileHash
}

const thirdRevisionFileHash = 'hash3'
const thirdRevision: IRevision = {
  previousVersion: secondRevision.version,
  version: hash(thirdRevisionFileHash + secondRevision.version),
  file: 'ccc.revisions.js' // third lexicographically, and third revision
}
const thirdRevisionModule: IRevisionModule = {
  previousVersion: thirdRevision.previousVersion,
  up: (client: unknown) => {},
  down: (client: unknown) => {},
  version: thirdRevision.version,
  file: thirdRevision.file,
  fileHash: thirdRevisionFileHash
}

const validUnorderedRevisionModules = [
  secondRevisionModule,
  firstRevisionModule,
  thirdRevisionModule
]

describe('fileFilter', () => {
  const filesThatMatch = [
    'this-is-a-revision.revision.js',
    '123_this-is-a-revision.revision.js',
    'path/to/revisions/123_this-is-a-revision.revision.js',
    'path/to/revisions/123_this-is-a-revision.revision.ts',
    generateFileName('a revision file name generated by a function')
  ]

  const filesThatDoNotMatch = [
    'this-is-not-a-revision.spec.js'
  ]

  describe('when file pattern is a match', () => {
    filesThatMatch.forEach((file: string) => {
      it(`should match ${file}`, () => {
        assert.equal(fileFilter(file), true)
      })
    })
  })

  describe('when file pattern is NOT a match', () => {
    filesThatDoNotMatch.forEach((file: string) => {
      it(`should NOT match ${file}`, () => {
        assert.equal(fileFilter(file), false)
      })
    })
  })
})

describe('resolveUpgradePath', () => {
  describe('when current version is undefined', () => {
    it('should return all revisions in correct order', () => {
      assert.deepEqual(
        resolveUpgradePath(validUnorderedRevisionModules, undefined),
        {
          initialRevision: undefined,
          pendingRevisionModules: [
            firstRevisionModule,
            secondRevisionModule,
            thirdRevisionModule
          ]
        }
      )
    })
    it('should throw error if initial revision does not exist', () => {
      assert.throws(() => {
        resolveUpgradePath([secondRevisionModule], undefined)
      })
    })
  })

  describe('when revisions has current version', () => {
    describe('when revisions are pending', () => {
      it('should return pending revisions in correct order', () => {
        assert.deepEqual(
          resolveUpgradePath(
            validUnorderedRevisionModules,
            secondRevision
          ),
          {
            initialRevision: secondRevision,
            pendingRevisionModules: [thirdRevisionModule]
          }
        )
      })
    })
    describe('when no revisions are pending', () => {
      it('should return an empty list', () => {
        assert.deepEqual(
          resolveUpgradePath(
            validUnorderedRevisionModules,
            thirdRevision
          ),
          {
            initialRevision: thirdRevision,
            pendingRevisionModules: []
          }
        )
      })
    })
  })

  describe('when does not contain current version', () => {
    it('should throw error', () => {
      assert.throws(() => {
        resolveUpgradePath(
          validUnorderedRevisionModules,
          {
            ...thirdRevision,
            version: 'not-a-version'
          }
        )
      })
    })
  })
})

/*
describe('resolveDowngradePath', () => {
  // TODO
})
*/

describe('verifyRevisionModule', () => {
  describe('when revision has no previous version (first revision)', () => {
    describe('when file hash matches version', () => {
      it('should not throw error', () => {
        assert.doesNotThrow(() => {
          verifyRevisionModule(
            firstRevision,
            {
              previousVersion: firstRevision.previousVersion,
              up: () => {},
              down: () => {},
              version: firstRevision.version,
              file: firstRevision.file,
              fileHash: firstRevision.version
            }
          )
        })
      })
    })
    describe('when file hash is bad', () => {
      it('should throw error', () => {
        assert.throws(() => {
          const badFileHash = 'bad hash'
          verifyRevisionModule(
            firstRevision,
            {
              previousVersion: firstRevision.previousVersion,
              up: () => {},
              down: () => {},
              version: badFileHash,
              file: firstRevision.file,
              fileHash: badFileHash
            }
          )
        })
      })
    })
  })
  describe('when revision has previous version', () => {
    describe('when file hash is correct', () => {
      it('should not throw error', () => {
        assert.doesNotThrow(() => {
          verifyRevisionModule(
            secondRevision,
            {
              previousVersion: firstRevision.version,
              up: () => {},
              down: () => {},
              version: secondRevision.version,
              file: secondRevision.file,
              fileHash: secondRevisionFileHash
            }
          )
        })
      })
    })
    describe('when file hash is bad', () => {
      it('should throw error', () => {
        assert.throws(() => {
          const badFileHash = 'bad hash'
          verifyRevisionModule(
            secondRevision,
            {
              previousVersion: firstRevision.version,
              up: () => {},
              down: () => {},
              version: computeVersion(firstRevision.version, badFileHash),
              file: secondRevision.file,
              fileHash: badFileHash
            }
          )
        })
      })
    })
    describe('when previous version is mismatched', () => {
      it('should throw error', () => {
        assert.throws(() => {
          verifyRevisionModule(
            secondRevision,
            {
              previousVersion: firstRevision.version,
              up: () => {},
              down: () => {},
              version: 'not the second version',
              file: secondRevision.file,
              fileHash: secondRevisionFileHash
            }
          )
        })
      })
    })
  })
})
