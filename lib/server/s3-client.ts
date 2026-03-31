import 'server-only';
import { S3Client } from '@aws-sdk/client-s3';
import { getR2Config } from '@/lib/storage-config';

const globalForS3 = global as unknown as { s3Client?: S3Client };

export function getS3Client() {
  if (globalForS3.s3Client) {
    return globalForS3.s3Client;
  }

  const config = getR2Config();
  const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForS3.s3Client = s3Client;
  }

  return s3Client;
}
