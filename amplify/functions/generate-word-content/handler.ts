import type { Schema } from "../../data/resource";  
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

type GenerateWordContentHandler = Schema["generateWordContent"]["functionHandler"];

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const USE_IMAGE_GENERATION = process.env.USE_IMAGE_GENERATION !== "false";

export const handler: GenerateWordContentHandler = async (event) => {
  console.log("Event received:", JSON.stringify(event));

  const { word, language } = event.arguments;

  if (!word) {
    throw new Error("Word is required");
  }

  if (!language || !["japanese", "finnish"].includes(language)) {
    throw new Error("Language must be 'japanese' or 'finnish'");
  }

  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  try {
    console.log(`Generating content for word: ${word}, language: ${language}`);

    // 言語に応じてプロンプトを変更
    let userPrompt = "";
    
    if (language === "japanese") {
      // 日本語学習者向け（フィンランド語話者）
      userPrompt = `You are a Japanese language teacher for Finnish-speaking beginners.

For the Japanese word "${word}", provide:

1. **Meaning in Finnish**: A clear, concise definition in Finnish language
2. **Example sentence in Japanese**: 
   - Use simple vocabulary suitable for beginners (JLPT N5-N4 level)
   - Keep it SHORT (maximum 15 characters)
   - Add furigana readings in parentheses for ALL kanji
   - Format: 漢字（かんじ）
   - Example: "私（わたし）は学生（がくせい）です"
3. **Image description**: A simple description for an illustration (in English, one sentence)

Respond ONLY in JSON format:
{
  "meaning": "Definition in Finnish",
  "example": "Japanese sentence with furigana: 漢字（かんじ）",
  "imagePrompt": "Simple illustration description in English"
}`;
    } else {
      // フィンランド語学習者向け（日本語話者）
      userPrompt = `You are a Finnish language teacher for Japanese-speaking beginners.

For the Finnish word "${word}", provide:

1. **Meaning in Japanese**: A clear, concise definition in Japanese language
2. **Example sentence in Finnish**: 
   - Use simple vocabulary suitable for beginners (A1-A2 level)
   - Keep it SHORT and easy to understand
   - Use common, everyday words
   - Example: "Minä olen opiskelija" (not complex grammar)
3. **Image description**: A simple description for an illustration (in English, one sentence)

Respond ONLY in JSON format:
{
  "meaning": "Definition in Japanese",
  "example": "Simple Finnish sentence for beginners",
  "imagePrompt": "Simple illustration description in English"
}`;
    }

    const textResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert language teacher who creates content for absolute beginners. Always provide simple, clear, and beginner-friendly content."
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!textResponse.ok) {
      const errorText = await textResponse.text();
      console.error("OpenAI text API error:", errorText);
      throw new Error(`OpenAI API error: ${textResponse.status}`);
    }

    const textData = await textResponse.json();
    const content = textData.choices[0].message.content;
    const generated = JSON.parse(content.replace(/```json|```/g, "").trim());

    console.log("Generated content:", generated);

    let imageUrl = "";

    if (USE_IMAGE_GENERATION) {
      console.log("=== 画像生成を開始します ===");
      
      try {
        const rawImagePrompt = generated.imagePrompt || `A simple illustration of ${word}`;
        
        const imagePrompt = `A simple, clean, educational illustration representing "${word}". ${rawImagePrompt}. Style: minimalist, friendly, suitable for language learning, no text in image.`;
        
        console.log(`Final image prompt: ${imagePrompt}`);

        const requestBody = {
          model: "dall-e-2",
          prompt: imagePrompt.slice(0, 1000),
          n: 1,
          size: "512x512",
        };

        console.log("DALL-E request body:", JSON.stringify(requestBody, null, 2));

        const imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify(requestBody),
        });

        console.log("DALL-E response status:", imageResponse.status);

        if (!imageResponse.ok) {
          const errorText = await imageResponse.text();
          console.error("❌ DALL-E API error status:", imageResponse.status);
          console.error("❌ DALL-E API error details:", errorText);
          console.warn("⚠️ 画像生成に失敗しましたが、テキストデータは返します");
        } else {
          const imageData = await imageResponse.json();
          console.log("✅ DALL-E response received");
          
          if (imageData.data && imageData.data[0] && imageData.data[0].url) {
            const generatedImageUrl = imageData.data[0].url;
            console.log("✅ Image generation completed successfully");

            // 画像をダウンロード
            const imageFetchResponse = await fetch(generatedImageUrl);
            if (!imageFetchResponse.ok) {
              throw new Error(`Failed to download image: ${imageFetchResponse.status}`);
            }
            const imageBuffer = Buffer.from(await imageFetchResponse.arrayBuffer());

            // S3にアップロード
            const s3Key = `word-images/${word}-${Date.now()}.png`;
            const s3Client = new S3Client({ region: process.env.AWS_REGION });
            await s3Client.send(new PutObjectCommand({
              Bucket: process.env.STORAGE_WORDIMAGES_BUCKETNAME,
              Key: s3Key,
              Body: imageBuffer,
              ContentType: 'image/png',
            }));

            imageUrl = s3Key;
            console.log("✅ Image uploaded to S3 successfully");
          } else {
            console.error("❌ Unexpected response structure:", imageData);
          }
        }
      } catch (imageError) {
        console.error("❌ Image generation exception:", imageError);
        console.warn("⚠️ 画像生成をスキップして続行します");
      }
    } else {
      console.log("ℹ️ Image generation is disabled");
    }

    return {
      meaning: generated.meaning,
      example: generated.example,
      imageUrl: imageUrl || "",
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