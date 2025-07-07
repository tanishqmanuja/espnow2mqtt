export function objectEnsureNonNullKeys(
  obj: Record<string, unknown>,
  keys: string[],
) {
  return keys.every(key => obj[key] !== null && obj[key] !== undefined);
}
