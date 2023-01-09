import assert from 'assert'

import { expectEnv } from '../../lib/env'

describe('expectEnv', () => {
  it('should return the value of an existing environment variable', () => {
    process.env.MY_ENV_VAR = 'abc123'
    assert.equal('abc123', expectEnv('MY_ENV_VAR'))
  })
  it('should throw an error if the environment variable does not exist', () => {
    delete process.env.MY_ENV_VAR
    assert.throws(() => expectEnv('MY_ENV_VAR'))
  })
})
