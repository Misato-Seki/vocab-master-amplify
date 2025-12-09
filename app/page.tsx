"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import "./../app/app.css";
import { Amplify } from "aws-amplify";
import outputs from "@/amplify_outputs.json";
import "@aws-amplify/ui-react/styles.css";
import { useAuthenticator } from "@aws-amplify/ui-react";

Amplify.configure(outputs);

const client = generateClient<Schema>();

export default function App() {
  const [words, setWords] = useState<Array<Schema["Word"]["type"]>>([]);
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

  function deleteWord(id: string) {
    client.models.Word.delete({ id })
  }

  const [isAddingWord, setIsAddingWord] = useState(false);
  const [newWord, setNewWord] = useState({
    word: "",
    meaning: "",
    example: "",
    image: "",
  });

  const router = useRouter();

  function openAddWordForm() {
    setNewWord({ word: "", meaning: "", example: "", image: "" });
    setIsAddingWord(true);
  }

  function goToFlashcard() {
    router.push("/flashcards");
  }

  // 🚀 AI 自動生成機能 (Bedrock)
  async function generateWithAI() {
    if (!newWord.word) {
      alert("単語を入力してください");
      return;
    }

    setIsGenerating(true);
    setGenerationProgress("AI が意味・例文・画像を生成中... (10-20秒)");

    try {
      // Amplify の Query を呼び出し
      const { data, errors } = await client.queries.generateWordContent({
        word: newWord.word,
      });

      if (errors) {
        console.error("Generation errors:", errors);
        throw new Error(errors[0].message);
      }

      if (data) {
        setGenerationProgress("完了! ✨");
        setNewWord(prev => ({
          ...prev,
          meaning: data.meaning,
          example: data.example,
          image: data.imageUrl,
        }));

        // 成功メッセージを2秒表示
        setTimeout(() => setGenerationProgress(""), 2000);
      }
    } catch (error) {
      console.error("AI generation failed:", error);
      setGenerationProgress("");

      // エラーメッセージを詳細に表示
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
      });
      setIsAddingWord(false);
      setNewWord({ word: "", meaning: "", example: "", image: "" });
    } catch (err) {
      console.error("Create word failed", err);
      alert("Failed to create word. See console for details.");
    }
  }

  return (
    <main style={{ padding: 16 }}>
      <button onClick={signOut}>Sign out</button>
      <h1>{user?.signInDetails?.loginId}'s flashcard</h1>
      <button onClick={goToFlashcard}>Start Anki!</button>
      <button onClick={openAddWordForm}>+ new word</button>

      {isAddingWord && (
        <form onSubmit={submitNewWord} style={{ border: "1px solid #ddd", padding: 12, marginTop: 8 }}>
          <h3>New Word</h3>
          <div>
            <label>
              Word: <input
                required
                value={newWord.word}
                onChange={(e) => setNewWord((s) => ({ ...s, word: e.target.value }))}
                disabled={isGenerating}
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
              }}
            >
              {isGenerating ? "🤖 生成中..." : "🚀 AI自動生成 (Bedrock)"}
            </button>
            {generationProgress && (
              <div style={{ marginTop: 4, fontSize: "0.9em", color: "#666" }}>
                {generationProgress}
              </div>
            )}
          </div>

          <div>
            <label>
              Meaning: <input
                value={newWord.meaning}
                onChange={(e) => setNewWord((s) => ({ ...s, meaning: e.target.value }))}
              />
            </label>
          </div>
          <div>
            <label>
              Example: <input
                value={newWord.example}
                onChange={(e) => setNewWord((s) => ({ ...s, example: e.target.value }))}
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

      <div>Word</div>
      <ul>
        {words.map((word) => {
          return (
            <li key={word.id} className="word-item">
              <div className="word-row">
                <div className="word-main">
                  <div className="word-title">{word.word}</div>
                  {word.meaning && <div className="word-meaning">Meaning: {word.meaning}</div>}
                  {word.example && <div className="word-example">Example: {word.example}</div>}
                </div>
                {word.image && (
                  <div className="word-img-wrap">
                    <img src={word.image} alt={word.word} className="word-img" />
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
