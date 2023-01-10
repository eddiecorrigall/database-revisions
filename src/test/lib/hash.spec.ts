import assert from 'assert'

import { hash } from '../../lib/hash'

describe('hash', () => {
  it('should return sha256 digest of string content by default', () => {
    assert.equal(
      hash('Hello world!'),
      'c0535e4be2b79ffd93291305436bf889314e4a3faec05ecffcbb7df31ad9e51a'
    )
  })
})
