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
  version: string
  file: string
  fileHash: string
}
