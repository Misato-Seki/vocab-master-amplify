import type { Schema } from "../../data/resource";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

type GenerateWordContentHandler = Schema["generateWordContent"]["functionHandler"];

const bedrockClient = new BedrockRuntimeClient({
  region: "us-east-1",
});

export const handler: GenerateWordContentHandler = async (event) => {
  console.log("Event received:", JSON.stringify(event));

  const { word } = event.arguments;

  if (!word) {
    throw new Error("Word is required");
  }

  try {
    console.log(`Generating content for word: ${word}`);

    const claudePrompt = `For the word "${word}", provide:
      1. A clear, concise meaning/definition in English
      2. A practical example sentence using this word
      3. A simple, vivid description for an image that represents this word (in English, one sentence)

      Example format:
      - For "serendipity": "A peaceful scene of someone discovering something beautiful by chance, warm lighting, dreamy atmosphere"
      - For "resilience": "A strong tree standing firmly against powerful winds, dramatic sky, inspiring composition"

      Respond ONLY in JSON format with no preamble or markdown:
      {
        "meaning": "Meaning of the word in English",
        "example": "Example sentence using the word",
        "imagePrompt": "A vivid, detailed description for image generation"
      }`;

    const claudePayload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: claudePrompt,
        },
      ],
    };

    // Cross-region inference profileを使用
    const claudeCommand = new InvokeModelCommand({
      modelId: "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(claudePayload),
    });

    console.log("Calling Claude API...");
    const claudeResponse = await bedrockClient.send(claudeCommand);
    console.log("Claude response successfully received.");
    
    const claudeResult = JSON.parse(
      new TextDecoder().decode(claudeResponse.body)
    );

    console.log("Claude response received");

    const textContent =
      claudeResult.content.find((c: any) => c.type === "text")?.text || "";
    const cleanText = textContent.replace(/```json|```/g, "").trim();
    const generated = JSON.parse(cleanText);

    console.log("Generated content:", generated);

    // Generate image using Stability AI
    const imagePrompt = generated.imagePrompt || `A simple, clear illustration representing the concept of ${word}`;

    console.log(`Generating image with prompt: ${imagePrompt}`);

    const stabilityPayload = {
      text_prompts: [
        {
          text: imagePrompt,
          weight: 1,
        },
        {
          text: "blurry, bad quality, distorted, ugly, low resolution, text, watermark, duplicate",
          weight: -1,
        },
      ],
      cfg_scale: 7,
      steps: 30,
      seed: Math.floor(Math.random() * 1000000),
      width: 512,
      height: 512,
      samples: 1,
    };

    const stabilityCommand = new InvokeModelCommand({
      modelId: "stability.stable-diffusion-xl-v1",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(stabilityPayload),
    });

    console.log("Generated imagePrompt from Claude:", imagePrompt);
    console.log("Starting Stability AI call with modelId:", stabilityCommand.input.modelId);
    
    const stabilityResponse = await bedrockClient.send(stabilityCommand);
    const stabilityResult = JSON.parse(
      new TextDecoder().decode(stabilityResponse.body)
    );

    console.log("Image generation completed");

    const imageBase64 = stabilityResult.artifacts[0].base64;
    const imageUrl = `data:image/png;base64,${imageBase64}`;

    console.log("Image size (bytes):", imageBase64.length);

    return {
      meaning: generated.meaning,
      example: generated.example,
      imageUrl: imageUrl,
    };
  } catch (error) {
    console.error("Error generating word content:", error);

    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    throw new Error(
      `Failed to generate content: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};