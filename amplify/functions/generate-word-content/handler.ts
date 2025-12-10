import type { Schema } from "../../data/resource";

type GenerateWordContentHandler = Schema["generateWordContent"]["functionHandler"];

// 環境変数からOpenAI APIキーを取得
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const USE_IMAGE_GENERATION = process.env.USE_IMAGE_GENERATION !== "false"; // デフォルトはtrue

export const handler: GenerateWordContentHandler = async (event) => {
  console.log("Event received:", JSON.stringify(event));

  const { word } = event.arguments;

  if (!word) {
    throw new Error("Word is required");
  }

  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  try {
    console.log(`Generating content for word: ${word}`);

    // OpenAI APIで意味・例文・画像プロンプトを生成
    const textResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // または "gpt-4o"
        messages: [
          {
            role: "user",
            content: `For the word "${word}", provide:
1. A clear, concise meaning/definition in English
2. A practical example sentence using this word
3. A simple, vivid description for an image that represents this word (in English, one sentence)

Respond ONLY in JSON format:
{
  "meaning": "Meaning of the word",
  "example": "Example sentence",
  "imagePrompt": "Vivid description for image generation"
}`
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

    // 画像生成を有効にしている場合のみ実行
    if (USE_IMAGE_GENERATION) {
      console.log("=== 画像生成を開始します ===");
      console.log("USE_IMAGE_GENERATION:", USE_IMAGE_GENERATION);
      
      try {
        const rawImagePrompt = generated.imagePrompt || `A simple illustration of ${word}`;
        
        // DALL-Eのコンテンツポリシーに準拠するようプロンプトをクリーンアップ
        const imagePrompt = `A simple, clean, educational illustration representing "${word}". ${rawImagePrompt}. Style: minimalist, friendly, suitable for vocabulary learning.`;
        
        console.log(`Raw image prompt: ${rawImagePrompt}`);
        console.log(`Final image prompt: ${imagePrompt}`);
        console.log(`Prompt length: ${imagePrompt.length} characters`);

        const requestBody = {
          model: "dall-e-2", // DALL-E 2の方が安価（$0.02/枚）
          prompt: imagePrompt.slice(0, 1000), // DALL-E 2は1000文字まで
          n: 1,
          size: "512x512", // DALL-E 2は512x512が最適
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
        console.log("DALL-E response headers:", JSON.stringify([...imageResponse.headers.entries()]));

        if (!imageResponse.ok) {
          const errorText = await imageResponse.text();
          console.error("❌ DALL-E API error status:", imageResponse.status);
          console.error("❌ DALL-E API error details:", errorText);
          
          // エラーの内容をパース
          try {
            const errorJson = JSON.parse(errorText);
            console.error("❌ Parsed error:", JSON.stringify(errorJson, null, 2));
          } catch (e) {
            console.error("❌ Could not parse error as JSON");
          }
          
          console.warn("⚠️ 画像生成に失敗しましたが、テキストデータは返します");
        } else {
          const imageData = await imageResponse.json();
          console.log("✅ DALL-E response data:", JSON.stringify(imageData, null, 2));
          
          if (imageData.data && imageData.data[0] && imageData.data[0].url) {
            imageUrl = imageData.data[0].url;
            console.log("✅ Image URL obtained:", imageUrl);
            console.log("✅ Image generation completed successfully");
          } else {
            console.error("❌ Unexpected response structure:", imageData);
          }
        }
      } catch (imageError) {
        console.error("❌ Image generation exception:", imageError);
        if (imageError instanceof Error) {
          console.error("❌ Error name:", imageError.name);
          console.error("❌ Error message:", imageError.message);
          console.error("❌ Error stack:", imageError.stack);
        }
        console.warn("⚠️ 画像生成をスキップして続行します");
      }
    } else {
      console.log("ℹ️ Image generation is disabled");
    }

    return {
      meaning: generated.meaning,
      example: generated.example,
      imageUrl: imageUrl || "", // 画像がない場合は空文字列
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