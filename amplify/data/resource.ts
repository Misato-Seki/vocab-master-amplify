import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { generateWordContent } from "../functions/generate-word-content/resource";

const schema = a.schema({
  Word: a
    .model({
      word: a.string().required(),
      meaning: a.string(),
      example: a.string(),
      image: a.string(),
      language: a.string(), // "japanese" or "finnish"
      logs: a.hasMany("Log", "wordId"),
    }).authorization(allow => [allow.owner()]),

  Log: a
    .model({
      wordId: a.id(),
      word: a.belongsTo('Word', 'wordId'),
      reviewedAt: a.datetime().required(),
      isCorrect: a.boolean().required(),
    }).authorization(allow => [allow.owner()]),

  // Query to call Lambda function
  generateWordContent: a
    .query()
    .arguments({
      word: a.string().required(),
      language: a.string().required(), // "japanese" or "finnish"
    })
    .returns(a.customType({
      meaning: a.string().required(),
      example: a.string().required(),
      imageUrl: a.string().required(),
    }))
    .authorization(allow => [allow.authenticated()])
    .handler(a.handler.function(generateWordContent)),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});