export interface IRevision {
  readonly file: string
  readonly version: string
  readonly previousVersion: string | undefined
  // Optional metadata
  readonly createdAt?: Date // When the namespace entry was created
  readonly updatedAt?: Date // When the namespace entry was updated
}

export interface IRevisionModule {
  previousVersion: string | undefined
  up: (client: unknown) => unknown
  down: (client: unknown) => unknown
  // Transients values computed at runtime
  version: string
  file: string
  fileHash: string
}

export interface IConnectionManager<Client> {
  shutdown: () => Promise<void>
  ping: () => Promise<void>
  transaction: <Data>(
    callback: (client: Client) => Promise<Data | undefined>
  ) => Promise<Data | undefined>
}

export interface IPersistenceFacade<Client> {
  // Implement a persistence facade to manage state in a database

  // (Idempotent) Create a table / document to persist state
  initialize: (client: Client) => Promise<void>

  // Manage access to resource such that reads are concurrent but not writes
  acquireExclusiveLock: (client: Client) => Promise<void>
  releaseExclusiveLock: (client: Client) => Promise<void>

  // (Idempotent) Get the current version for the given namespace
  fetchCurrentRevision: (
    client: Client,
    namespace: string
  ) => Promise<IRevision | undefined>

  // (Idempotent) Set the current version for the given namespace
  setCurrentRevision: (
    client: Client,
    namespace: string,
    revision: IRevision
  ) => Promise<void>

  // Remove the namespace (and the revision from persistence)
  removeNamespace: (client: Client, namespace: string) => Promise<void>
}
