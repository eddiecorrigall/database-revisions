export const expectEnv = (name: string): string => {
  const value = process.env[name]
  if (value === undefined) {
    throw new Error(`environment variable missing - ${name}`)
  }
  return value
}
