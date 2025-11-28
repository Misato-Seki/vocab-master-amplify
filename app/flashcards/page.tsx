"use client";

import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import { Amplify } from "aws-amplify";
import outputs from "@/amplify_outputs.json";

Amplify.configure(outputs);
const client = generateClient<Schema>();

export default function FlashcardsPage() {
  const [words, setWords] = useState<Array<Schema["Word"]["type"]>>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<Array<{ id?: string; isCorrect: boolean }>>([]);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    // use observeQuery so we get updates live (matches the main page approach)
    const sub = client.models.Word.observeQuery().subscribe({
      next: (snapshot) => setWords([...snapshot.items] as any),
      error: (e) => console.error("observeQuery error", e),
    });

    return () => sub.unsubscribe();
  }, []);

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

  function handleAnswer(isCorrect: boolean) {
    const id = current?.id;

    setResults((prev) => {
      if (id && prev.some((r) => r.id === id)) return prev; // already answered
      return [...prev, { id, isCorrect }];
    });

    // if we're on the last card, end round, otherwise advance
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
    // if we've looped back to 0 after last card, keep finished false — typical loop behavior
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
              {/* if image exists, show it at the top of the back */}
              {current.image && (
                <div className="card-back-image-wrap">
                  <img src={current.image} alt={current.word} className="card-back-image" />
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

        {/* Answer buttons: mark correct/incorrect; shows during the session (or after flip) */}
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

        {/* Result panel when finished */}
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
