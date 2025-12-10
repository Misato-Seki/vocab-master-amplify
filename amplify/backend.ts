import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { generateWordContent } from './functions/generate-word-content/resource.js';

const backend = defineBackend({
  auth,
  data,
  generateWordContent,
});

// Accessibility for Bedrock from Lambda
// backend.generateWordContent.resources.lambda.addToRolePolicy(
//   new PolicyStatement({
//     actions: [
//       'bedrock:InvokeModel',
//       'bedrock:InvokeModelWithResponseStream',
//     ],
//     resources: [
//       // Claude 3.5 Sonnet v2 - 通常のモデル
//       'arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0',
//       // Stable Diffusion XL
//       'arn:aws:bedrock:us-east-1::foundation-model/stability.stable-diffusion-xl-v1',
//     ],
//   })
// );

console.log('✅ Backend definition complete');