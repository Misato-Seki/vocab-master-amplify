import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'wordImages',
  access: (allow) => ({
    'word-images/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
    ],
  }),
});