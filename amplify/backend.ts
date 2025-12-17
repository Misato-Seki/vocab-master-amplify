import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { storage } from './storage/resource.js';
import { generateWordContent } from './functions/generate-word-content/resource.js';

const backend = defineBackend({
  auth,
  data,
  storage,
  generateWordContent,
});

// Lambda関数にS3バケットへのアクセス権限を付与
backend.generateWordContent.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      's3:PutObject',
      's3:GetObject',
      's3:DeleteObject',
    ],
    resources: [
      `${backend.storage.resources.bucket.bucketArn}/word-images/*`,
    ],
  })
);

// 環境変数にS3バケット名を追加
backend.generateWordContent.addEnvironment(
  'STORAGE_WORDIMAGES_BUCKETNAME',
  backend.storage.resources.bucket.bucketName
);

console.log('✅ Backend definition complete');