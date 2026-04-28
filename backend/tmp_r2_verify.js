const { S3Client, HeadBucketCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const accountId = '86104e02025c4d8a71e0cfe0c4349f1c';
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: 'b318817698e6d65d17b1e33286b41449',
    secretAccessKey: '83403ae0e4ee8230f9f7c823a7b4594da36c062ad3cceb86931a2ea6c4f28949'
  }
});
(async () => {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: 'soundcheck-photos' }));
    console.log('HeadBucket: OK (token has access)');
    const list = await s3.send(new ListObjectsV2Command({ Bucket: 'soundcheck-photos', MaxKeys: 1 }));
    console.log('Objects:', list.KeyCount || 0);
  } catch (e) {
    console.error('FAIL:', e.name, e.message);
    process.exit(1);
  }
})();
