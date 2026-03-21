type PgLikeError = {
  code?: string;
  message?: string;
};

function getPgErrorCode(error: unknown) {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as PgLikeError).code;
    return typeof code === 'string' ? code : '';
  }

  return '';
}

function getPgErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as PgLikeError).message;
    return typeof message === 'string' ? message : '';
  }

  return '';
}

export function shouldIgnorePgPoolError(error: unknown) {
  return (
    getPgErrorCode(error) === 'ERR_SSL_DECRYPTION_FAILED_OR_BAD_RECORD_MAC' ||
    getPgErrorMessage(error).includes('decryption failed or bad record mac')
  );
}
