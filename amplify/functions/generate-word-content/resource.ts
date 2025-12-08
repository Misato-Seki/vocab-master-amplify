import { defineFunction } from "@aws-amplify/backend";

export const generateWordContent = defineFunction({
    name: "genarate-word-content",
    entry: "./handler.ts",
    timeoutSeconds: 90,
    memoryMB: 512,
    environment: {
        NODE_OPTIONS: "--enable-source-maps",
    }
})