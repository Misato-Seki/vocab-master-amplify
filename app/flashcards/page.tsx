"use client";

import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/data";
import { getUrl } from "aws-amplify/storage";
import type { Schema } from "@/amplify/data/resource";
import { Amplify } from "aws-amplify";
import outputs from "@/amplify_outputs.json";

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

export default function FlashcardsPage() {
  const [words, setWords] = useState<Array<Schema["Word"]["type"]>>([]);
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<Array<{ id?: string; isCorrect: boolean }>>([]);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const sub = client.models.Word.observeQuery().subscribe({
      next: (snapshot) => setWords([...snapshot.items] as any),
      error: (e) => console.error("observeQuery error", e),
    });

    return () => sub.unsubscribe();
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

  if (!words || words.length === 0) {
    return (
      <main style={{ padding: 16 }}>
        <h2>Flashcards</h2>
        <p>No words found yet — add some in the main page.</p>
        <p>
          <a href="/">Back to word list</a>
        </p>
      </main>
    );
  }

  const current = words[index];
  const currentImageUrl = current?.id ? imageUrls.get(current.id) : "";

  function handleAnswer(isCorrect: boolean) {
    const id = current?.id;

    setResults((prev) => {
      if (id && prev.some((r) => r.id === id)) return prev;
      return [...prev, { id, isCorrect }];
    });

    if (index === words.length - 1) {
      setFinished(true);
      setFlipped(false);
    } else {
      setFlipped(false);
      setIndex((i) => (i + 1) % words.length);
    }
  }

  function restartRound() {
    setResults([]);
    setIndex(0);
    setFlipped(false);
    setFinished(false);
  }

  function nextCard() {
    setFlipped(false);
    setIndex((i) => (i + 1) % words.length);
  }

  function prevCard() {
    setFlipped(false);
    setIndex((i) => (i - 1 + words.length) % words.length);
  }

  return (
    <main style={{ padding: 16 }}>
      <h2>Flashcards</h2>

      <div className="flashcards-container">
        <div
          className={`card ${flipped ? "flipped" : ""}`}
          onClick={() => setFlipped((s) => !s)}
          role="button"
          tabIndex={0}
        >
          <div className="card-inner">
            <div className="card-front">
              <div className="word-large">{current.word}</div>
            </div>
            <div className="card-back">
              {currentImageUrl && (
                <div className="card-back-image-wrap">
                  <img src={currentImageUrl} alt={current.word} className="card-back-image" />
                </div>
              )}

              {current.meaning && <div className="word-meaning">Meaning: {current.meaning}</div>}
              {current.example && <div className="word-example">Example: {current.example}</div>}
            </div>
          </div>
        </div>

        <div className="card-meta">
          <small>
            {index + 1} / {words.length}
          </small>
        </div>

        <div className="controls">
          <button onClick={prevCard} aria-label="Previous card">◀ Prev</button>
          <button onClick={() => setFlipped((s) => !s)} aria-label="Flip card">Flip</button>
          <button onClick={nextCard} aria-label="Next card">Next ▶</button>
        </div>

        {!finished && (
          <div className="answer-controls">
            <button
              className="btn-correct"
              onClick={() => handleAnswer(true)}
              aria-label="Mark correct"
            >
              ✅ Correct
            </button>
            <button
              className="btn-incorrect"
              onClick={() => handleAnswer(false)}
              aria-label="Mark incorrect"
            >
              ❌ Incorrect
            </button>
          </div>
        )}

        {finished && (
          <div className="result-panel">
            <h3>Round complete</h3>
            <p>
              Correct: <strong>{results.filter((r) => r.isCorrect).length}</strong> / {words.length}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={restartRound}>Restart</button>
              <a href="/" style={{ padding: "0.6em 1em", alignSelf: "center" }}>Back</a>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}