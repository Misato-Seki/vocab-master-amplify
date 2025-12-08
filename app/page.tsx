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

  // Controlled form state for adding a new Word
  const [isAddingWord, setIsAddingWord] = useState(false);
  const [newWord, setNewWord] = useState({
    word: "",
    meaning: "",
    example: "",
    image: "",
  });

  // navigate to the flashcard player
  const router = useRouter();

  function openAddWordForm() {
    setNewWord({ word: "", meaning: "", example: "", image: "" });
    setIsAddingWord(true);
  }

  function goToFlashcard() {
    router.push("/flashcards");
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
      {/* Inline add-word form (appears when adding) */}
      {isAddingWord && (
        <form onSubmit={submitNewWord} style={{ border: "1px solid #ddd", padding: 12, marginTop: 8 }}>
          <h3>New Word</h3>
          <div>
            <label>
              Word: <input required value={newWord.word} onChange={(e) => setNewWord((s) => ({ ...s, word: e.target.value }))} />
            </label>
          </div>
          <div>
            <label>
              Meaning: <input value={newWord.meaning} onChange={(e) => setNewWord((s) => ({ ...s, meaning: e.target.value }))} />
            </label>
          </div>
          <div>
            <label>
              Example: <input value={newWord.example} onChange={(e) => setNewWord((s) => ({ ...s, example: e.target.value }))} />
            </label>
          </div>
          <div>
            <label>
              Image URL: <input value={newWord.image} onChange={(e) => setNewWord((s) => ({ ...s, image: e.target.value }))} />
            </label>
          </div>
          <div style={{ marginTop: 8 }}>
            <button type="submit">Create</button>
            <button type="button" onClick={() => setIsAddingWord(false)} style={{ marginLeft: 8 }}>Cancel</button>
          </div>
        </form>
      )}
      {/* Word list */}
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
                <button onClick={() => deleteWord(word.id)} aria-label={`Delete ${word.word}`}>Delete</button>
              </div>
            </li>
          );
        })}
      </ul>

      
    </main>
  );
}
