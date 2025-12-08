import type { Handler } from "aws-lambda";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

interface GenerateWordRequest {
  word: string;
}

interface GenerateWordResponse {
  meaning: string;
  example: string;
  imageUrl: string;
}

// Bedrock クライアントを初期化
const bedrockClient = new BedrockRuntimeClient({
  region: "eu-north-1",
});

export const handler: Handler = async (event) => {
  console.log("Event received:", JSON.stringify(event));

  const body: GenerateWordRequest =
    typeof event.body === "string" ? JSON.parse(event.body) : event.body;

  const { word } = body;

  if (!word) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Word is required" }),
    };
  }

  try {
    // Generate meaning and example using Claude
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

    const claudeCommand = new InvokeModelCommand({
      modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(claudePayload),
    });

    console.log("Calling Claude API...");
    const claudeResponse = await bedrockClient.send(claudeCommand);
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

    console.log("Calling Stability AI...");
    const stabilityResponse = await bedrockClient.send(stabilityCommand);
    const stabilityResult = JSON.parse(
      new TextDecoder().decode(stabilityResponse.body)
    );

    console.log("Image generation completed");

    // Encode image to base64 data URL
    const imageBase64 = stabilityResult.artifacts[0].base64;
    const imageUrl = `data:image/png;base64,${imageBase64}`;

    console.log("Image size (bytes):", imageBase64.length);

    // Return result
    const result: GenerateWordResponse = {
      meaning: generated.meaning,
      example: generated.example,
      imageUrl: imageUrl,
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error("Error generating word content:", error);

    // Error details
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to generate content",
        details: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};
