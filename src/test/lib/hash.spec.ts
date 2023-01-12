import assert from 'assert'

import { hash, HashAlgorithm } from '../../lib/hash'

describe('hash', () => {
  describe('when content is string', () => {
    describe('when algorithm is sha256', () => {
      it('should return sha256 digest of string content', () => {
        assert.equal(
          hash('Hello world!', HashAlgorithm.SHA256),
          'c0535e4be2b79ffd93291305436bf889314e4a3faec05ecffcbb7df31ad9e51a'
        )
      })
    })
    describe('when algorithm is not provided', () => {
      it('should return sha1 digest of string content', () => {
        assert.equal(
          hash('Hello world!'),
          'd3486ae9136e7856bc42212385ea797094475802'
        )
      })
    })
  })
})
