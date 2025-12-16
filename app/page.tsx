"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { generateClient } from "aws-amplify/data";
import { getUrl } from "aws-amplify/storage";
import type { Schema } from "@/amplify/data/resource";
import "./../app/app.css";
import { Amplify } from "aws-amplify";
import outputs from "@/amplify_outputs.json";
import "@aws-amplify/ui-react/styles.css";
import { useAuthenticator } from "@aws-amplify/ui-react";

Amplify.configure(outputs);

const client = generateClient<Schema>();

// S3キーから署名付きURLを取得するヘルパー関数
async function getImageUrl(s3Key: string): Promise<string> {
  if (!s3Key) return "";
  
  // すでにHTTP(S)のURLの場合はそのまま返す(後方互換性)
  if (s3Key.startsWith('http://') || s3Key.startsWith('https://')) {
    return s3Key;
  }
  
  try {
    const result = await getUrl({
      path: s3Key,
      options: {
        validateObjectExistence: false,
        expiresIn: 3600, // 1時間有効
      },
    });
    return result.url.toString();
  } catch (error) {
    console.error("Failed to get image URL:", error);
    return "";
  }
}

export default function App() {
  const [words, setWords] = useState<Array<Schema["Word"]["type"]>>([]);
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());
  const { user, signOut } = useAuthenticator();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState("");

  function listWords() {
    client.models.Word.observeQuery().subscribe({
      next: (data) => setWords([...data.items])
    })
  }

  useEffect(() => {
    listWords();
  }, []);

  // 画像URLを解決する
  useEffect(() => {
    async function resolveImageUrls() {
      const urlMap = new Map<string, string>();
      
      for (const word of words) {
        if (word.image && word.id) {
          const url = await getImageUrl(word.image);
          urlMap.set(word.id, url);
        }
      }
      
      setImageUrls(urlMap);
    }
    
    if (words.length > 0) {
      resolveImageUrls();
    }
  }, [words]);

  function deleteWord(id: string) {
    client.models.Word.delete({ id })
  }

  const [isAddingWord, setIsAddingWord] = useState(false);
  const [newWord, setNewWord] = useState({
    word: "",
    meaning: "",
    example: "",
    image: "",
    language: "japanese" as "japanese" | "finnish",
  });

  const router = useRouter();

  function openAddWordForm() {
    setNewWord({ word: "", meaning: "", example: "", image: "", language: "japanese" });
    setIsAddingWord(true);
  }

  function goToFlashcard() {
    router.push("/flashcards");
  }

  // 🚀 AI 自動生成機能 (OpenAI)
  async function generateWithAI() {
    if (!newWord.word) {
      alert("単語を入力してください");
      return;
    }

    setIsGenerating(true);
    // const langLabel = newWord.language === "japanese" ? "日本語" : "フィンランド語";
    setGenerationProgress("Generating word contents... (10-20sec)");

    try {
      const { data, errors } = await client.queries.generateWordContent({
        word: newWord.word,
        language: newWord.language,
      });

      if (errors) {
        console.error("Generation errors:", errors);
        throw new Error(errors[0].message);
      }

      if (data) {
        setGenerationProgress("Done! ✨");
        setNewWord(prev => ({
          ...prev,
          meaning: data.meaning,
          example: data.example,
          image: data.imageUrl,
        }));

        setTimeout(() => setGenerationProgress(""), 2000);
      }
    } catch (error) {
      console.error("AI generation failed:", error);
      setGenerationProgress("");

      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Generation Failed: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  }

  async function submitNewWord(e?: FormEvent) {
    e?.preventDefault();
    if (!newWord.word) return alert("Word is required");

    try {
      await client.models.Word.create({
        word: newWord.word,
        meaning: newWord.meaning || undefined,
        example: newWord.example || undefined,
        image: newWord.image || undefined,
        language: newWord.language || undefined,
      });
      setIsAddingWord(false);
      setNewWord({ word: "", meaning: "", example: "", image: "", language: "japanese" });
    } catch (err) {
      console.error("Create word failed", err);
      alert("Failed to create word. See console for details.");
    }
  }

  return (
    <main style={{ width: "100%", maxWidth: 600, margin: "0 auto"  }}>
      <button onClick={signOut}>Sign out</button>
      <h1>Dashboard</h1>
      <button onClick={goToFlashcard}>Start Studying!</button>
      <button onClick={openAddWordForm}>+ New Word</button>

      {isAddingWord && (
        <form onSubmit={submitNewWord} style={{ border: "1px solid #ddd", padding: 12, marginTop: 8 }}>
          <h3>New Word</h3>

          {/* 言語選択 */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: "bold" }}>
              学習言語 / Oppimiskieli:
            </label>
            <select
              value={newWord.language}
              onChange={(e) => setNewWord((s) => ({ ...s, language: e.target.value as "japanese" | "finnish" }))}
              disabled={isGenerating}
              style={{ padding: 8, fontSize: "1rem", width: "100%" }}
            >
              <option value="japanese">🇯🇵 日本語</option>
              <option value="finnish">🇫🇮 Suomi</option>
            </select>
          </div>

          <div>
            <label>
              単語 / Sana:
              <input
                required
                value={newWord.word}
                onChange={(e) => setNewWord((s) => ({ ...s, word: e.target.value }))}
                disabled={isGenerating}
                placeholder={newWord.language === "japanese" ? "例: 勉強" : "esim: opiskella"}
                style={{ width: "100%", padding: 8, fontSize: "1rem" }}
              />
            </label>
          </div>

          {/* 🎨 AI生成ボタン */}
          <div style={{ marginTop: 8, marginBottom: 8 }}>
            <button
              type="button"
              onClick={generateWithAI}
              disabled={!newWord.word || isGenerating}
              style={{
                backgroundColor: isGenerating ? "#ccc" : "#FF9900",
                color: "white",
                cursor: isGenerating ? "not-allowed" : "pointer",
                fontWeight: "bold",
                padding: "12px 24px",
                fontSize: "1rem",
              }}
            >
              {isGenerating ? "🤖 Generating..." : "🚀 AI Generate"}
            </button>
            {generationProgress && (
              <div style={{ marginTop: 4, fontSize: "0.9em", color: "#666" }}>
                {generationProgress}
              </div>
            )}
          </div>

          <div>
            <label>
              意味/ Merkitys:
              <input
                value={newWord.meaning}
                onChange={(e) => setNewWord((s) => ({ ...s, meaning: e.target.value }))}
                style={{ width: "100%", padding: 8 }}
              />
            </label>
          </div>
          <div>
            <label>
              例文 / Esimerkkilause:
              <input
                value={newWord.example}
                onChange={(e) => setNewWord((s) => ({ ...s, example: e.target.value }))}
                style={{ width: "100%", padding: 8 }}
                placeholder={newWord.language === "japanese" ? "例: 私（わたし）は勉強（べんきょう）します" : "esim: Minä opiskelen"}
              />
            </label>
          </div>
          <div>
            <label>
              Image URL: <textarea
                value={newWord.image}
                onChange={(e) => setNewWord((s) => ({ ...s, image: e.target.value }))}
                rows={3}
                style={{ width: "100%", fontSize: "0.8em" }}
              />
            </label>
          </div>

          {/* 画像プレビュー */}
          {newWord.image && (
            <div style={{ marginTop: 8, marginBottom: 8 }}>
              <strong>プレビュー:</strong>
              <div style={{ marginTop: 4 }}>
                <img
                  src={newWord.image}
                  alt="Preview"
                  style={{ maxWidth: 300, maxHeight: 300, borderRadius: 8, border: "1px solid #ddd" }}
                />
              </div>
            </div>
          )}

          <div style={{ marginTop: 8 }}>
            <button type="submit">Create</button>
            <button
              type="button"
              onClick={() => {
                setIsAddingWord(false);
                setGenerationProgress("");
              }}
              style={{ marginLeft: 8 }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <h1>Words</h1>
      <ul>
        {words.map((word) => {
          const langFlag = word.language === "japanese" ? "🇯🇵" : word.language === "finnish" ? "🇫🇮" : "";
          const imageUrl = word.id ? imageUrls.get(word.id) : "";
          return (
            <li key={word.id} className="word-item">
              <div className="word-row">
                <div className="word-main">
                  <div className="word-title">
                    {langFlag} {word.word}
                  </div>
                  {word.meaning && <div className="word-meaning">Meaning: {word.meaning}</div>}
                  {word.example && <div className="word-example">Example: {word.example}</div>}
                </div>
                {imageUrl && (
                  <div className="word-img-wrap">
                    <img src={imageUrl} alt={word.word} className="word-img" />
                  </div>
                )}
              </div>
              <div style={{ marginTop: 8 }}>
                <button onClick={() => deleteWord(word.id)} aria-label={`Delete ${word.word}`}>
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}