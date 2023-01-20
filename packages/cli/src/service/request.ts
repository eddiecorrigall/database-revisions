import { IRevision, IRevisionModule } from '@database-revisions/types'

export interface UpgradePath {
  initialRevision: IRevision | undefined
  pendingRevisionModules: IRevisionModule[]
}

export interface DowngradePath {
  finalRevision: IRevision | undefined
  pendingRevisionModules: IRevisionModule[]
}

export interface FetchRevisionRequest {
  namespace: string
}

export interface UpgradeRequest {
  namespace: string
  directory: string
}

export interface DowngradeRequest {
  namespace: string
  directory: string
}
