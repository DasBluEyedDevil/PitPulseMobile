import { S3Client, HeadBucketCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const accountId: string | undefined = process.env.CLOUDFLARE_ACCOUNT_ID;
const accessKeyId: string | undefined = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey: string | undefined = process.env.R2_SECRET_ACCESS_KEY;

if (!accountId || !accessKeyId || !secretAccessKey) {
  throw new Error(
    'Missing required env vars: CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY'
  );
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

(async () => {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: 'soundcheck-photos' }));
    console.log('HeadBucket: OK (token has access)');
    const list = await s3.send(new ListObjectsV2Command({ Bucket: 'soundcheck-photos', MaxKeys: 1 }));
    console.log('Objects:', list.KeyCount || 0);
  } catch (e) {
    const err = e as Error;
    console.error('FAIL:', err.name, err.message);
    process.exit(1);
  }
})();
