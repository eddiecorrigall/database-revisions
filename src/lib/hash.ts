import { readFileSync } from 'fs'
import { createHash } from 'crypto'

export enum HashAlgorithm {
  SHA256 = 'sha256',
  SHA1 = 'sha1',
  MD5 = 'md5',
}

export const hash = (
  content: string | NodeJS.ArrayBufferView,
  algorithm?: HashAlgorithm
): string => {
  const hash = createHash(algorithm ?? HashAlgorithm.SHA1)
  hash.update(content)
  return hash.digest('hex')
}

export const hashFile = (file: string, algorithm?: HashAlgorithm): string => {
  const fileBuffer = readFileSync(file)
  return hash(fileBuffer, algorithm)
}
