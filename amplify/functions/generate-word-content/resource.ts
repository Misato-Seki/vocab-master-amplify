import { defineFunction } from "@aws-amplify/backend";

export const generateWordContent = defineFunction({
  name: "generate-word-content",
  entry: "./handler.ts",
  timeoutSeconds: 60,
  memoryMB: 1024,
  environment: {
    NODE_OPTIONS: "--enable-source-maps",
  },
});