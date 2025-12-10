import { defineFunction } from "@aws-amplify/backend";

export const generateWordContent = defineFunction({
  name: "generate-word-content",
  entry: "./handler.ts",
  timeoutSeconds: 60,
  memoryMB: 1024,
  environment: {
    NODE_OPTIONS: "--enable-source-maps",
    // OpenAI APIキーを環境変数として設定
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
    // 画像生成を無効にする場合は "false" に設定
    // DALL-E 2: $0.02/枚、DALL-E 3: $0.04-0.08/枚
    USE_IMAGE_GENERATION: "true", // "false"にすると画像生成をスキップ
  },
});