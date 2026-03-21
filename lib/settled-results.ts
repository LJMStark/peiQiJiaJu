export function collectSettledResults<T>(results: PromiseSettledResult<T>[]): {
  values: T[];
  errors: Array<{
    index: number;
    reason: unknown;
  }>;
} {
  const values: T[] = [];
  const errors: Array<{
    index: number;
    reason: unknown;
  }> = [];

  for (const [index, result] of results.entries()) {
    if (result.status === 'fulfilled') {
      values.push(result.value);
      continue;
    }

    errors.push({
      index,
      reason: result.reason,
    });
  }

  return { values, errors };
}
