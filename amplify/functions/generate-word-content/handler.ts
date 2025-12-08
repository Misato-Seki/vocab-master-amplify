import type { Handler } from "aws-lambda";

interface GenerateWordRequest {
  word: string;
}

interface GenerateWordResponse {
  meaning: string;
  example: string;
  imageUrl: string;
}

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
    // Generate content using Claude
    console.log(`Generating content for word: ${word}`);

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: `For the English word "${word}", provide:
                1. A clear, concise meaning/definition in English
                2. A practical example sentence using this word
                3. A simple, vivid image description (in English, one sentence, suitable for AI image generation)

                Example format:
                - For "serendipity": "A peaceful scene of someone discovering something beautiful by chance"
                - For "resilience": "A strong tree standing firmly against powerful winds"

                Respond ONLY in JSON format with no preamble or markdown:
                {
                "meaning": "Meaning in English",
                "example": "Example sentence using the word",
                "imagePrompt": "A vivid, simple description for image generation"
                }`,
          },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      throw new Error(`Claude API error: ${claudeResponse.statusText}`);
    }

    const claudeData = await claudeResponse.json();
    const textContent = claudeData.content.find((c: any) => c.type === "text")?.text || "";
    const cleanText = textContent.replace(/```json|```/g, "").trim();
    const generated = JSON.parse(cleanText);

    console.log("Generated content:", generated);

    // Generate image using Replicate
    const imagePrompt = generated.imagePrompt || `A simple, clear illustration of the concept of ${word}`;

    console.log(`Generating image with prompt: ${imagePrompt}`);

    // Generate prediction
    const replicateResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
      },
      body: JSON.stringify({
        version: "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b", // SDXL Lightning
        input: {
          prompt: imagePrompt,
          negative_prompt: "blurry, bad quality, distorted, ugly, low resolution, text, watermark",
          width: 512,
          height: 512,
          num_outputs: 1,
          num_inference_steps: 4,
          guidance_scale: 7.5,
        },
      }),
    });

    if (!replicateResponse.ok) {
      throw new Error(`Replicate API error: ${replicateResponse.statusText}`);
    }

    const prediction = await replicateResponse.json();
    console.log("Prediction created:", prediction.id);

    // Wait for the image genaration to complete
    let imageUrl = "";
    let attempts = 0;
    const maxAttempts = 30; // Wait up to 60 seconds

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 2 seconds

      const statusResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: {
            "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!statusResponse.ok) {
        throw new Error(`Status check failed: ${statusResponse.statusText}`);
      }

      const status = await statusResponse.json();
      console.log(`Attempt ${attempts + 1}: Status = ${status.status}`);

      if (status.status === "succeeded") {
        imageUrl = status.output[0];
        console.log("Image generated successfully:", imageUrl);
        break;
      } else if (status.status === "failed") {
        throw new Error(`Image generation failed: ${status.error}`);
      } else if (status.status === "canceled") {
        throw new Error("Image generation was canceled");
      }

      attempts++;
    }

    if (!imageUrl) {
      throw new Error("Image generation timed out after 60 seconds");
    }

    // Return the generated content
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
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to generate content",
        details: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};
