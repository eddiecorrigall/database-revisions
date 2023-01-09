export const expectEnv = (name: string): string => {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`Environment variable is missing [${name}]`);
  }
  return value;
};
