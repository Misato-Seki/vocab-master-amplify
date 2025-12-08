import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { generateWordContent } from './functions/generate-word-content/resource.js';

const backend = defineBackend({
  auth,
  data,
  generateWordContent,
});

backend.generateWordContent.addEnvironment("ANTHROPIC_API_KEY", "placeholder");
backend.generateWordContent.addEnvironment("REPLICATE_API_TOKEN", "placeholder");
