const DEFAULT_DATABASE_POOL_MAX = 5;

export function resolveDatabasePoolMax(envValue = process.env.DATABASE_POOL_MAX) {
  const parsed = Number.parseInt(envValue?.trim() ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : DEFAULT_DATABASE_POOL_MAX;
}
