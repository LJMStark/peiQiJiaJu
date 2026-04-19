import 'server-only';
import { S3Client } from '@aws-sdk/client-s3';
import { getR2Config } from '@/lib/storage-config';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import https from 'https';

const globalForS3 = global as unknown as { s3Client?: S3Client };

export function getS3Client() {
  if (globalForS3.s3Client) {
    return globalForS3.s3Client;
  }

  const config = getR2Config();

  // 配置带 keep-alive 的自定义请求处理器，解决 R2 以及国内网络环境下常见的 TLS 握手中断及 socket 挂起报错
  const requestHandler = new NodeHttpHandler({
    httpsAgent: new https.Agent({
      maxSockets: 50,
      keepAlive: true,
      timeout: 60000,
    }),
    connectionTimeout: 10000, // 10秒连接超时
    socketTimeout: 60000, // 60秒 socket 读写超时
  });

  const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    maxAttempts: 3,
    requestHandler,
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForS3.s3Client = s3Client;
  }

  return s3Client;
}
