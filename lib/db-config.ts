type ResolveDatabaseConnectionInput = {
  nodeEnv?: string;
  databaseUrl?: string;
  directUrl?: string;
};

const DEFAULT_DATABASE_POOL_MAX = 5;

export function resolveDatabaseConnectionString(input: ResolveDatabaseConnectionInput) {
  if (input.nodeEnv === 'production') {
    return input.databaseUrl ?? input.directUrl ?? '';
  }

  return input.directUrl ?? input.databaseUrl ?? '';
}

export function resolveDatabasePoolMax(envValue = process.env.DATABASE_POOL_MAX) {
  const parsed = Number.parseInt(envValue?.trim() ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : DEFAULT_DATABASE_POOL_MAX;
}
