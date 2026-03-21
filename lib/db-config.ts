type ResolveDatabaseConnectionInput = {
  nodeEnv?: string;
  databaseUrl?: string;
  directUrl?: string;
};

export function resolveDatabaseConnectionString(input: ResolveDatabaseConnectionInput) {
  if (input.nodeEnv === 'production') {
    return input.databaseUrl ?? input.directUrl ?? '';
  }

  return input.directUrl ?? input.databaseUrl ?? '';
}
