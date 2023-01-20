import { main } from './main'

const onSuccess = (): void => {
  process.exit(0)
}

const onFailure = (reason?: string): void => {
  if (reason !== undefined) {
    console.error(reason)
  }
  process.exit(1)
}

main().then(
  onSuccess,
  onFailure
)
