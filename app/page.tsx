"use client";

import { useState, useEffect, type FormEvent } from "react";
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
  // const [todos, setTodos] = useState<Array<Schema["Todo"]["type"]>>([]);
  const [words, setWords] = useState<Array<Schema["Word"]["type"]>>([]);
  const [categorys, setCategories] = useState<Array<Schema["Category"]["type"]>>([]);
  const { user, signOut } = useAuthenticator();

  // function listTodos() {
  //   client.models.Todo.observeQuery().subscribe({
  //     next: (data) => setTodos([...data.items]),
  //   });
  // }

  function listWords() {
    client.models.Word.observeQuery().subscribe({
      next: (data) => setWords([...data.items])
    })
  }

  function listCategories() {
    client.models.Category.observeQuery().subscribe({
      next: (data) => setCategories([...data.items])
    })
  }

  useEffect(() => {
    // listTodos();
    listWords();
    listCategories();
  }, []);

  // function createTodo() {
  //   client.models.Todo.create({
  //     content: window.prompt("Todo content"),
  //   });
  // }
    
  function deleteWord(id: string) {
    client.models.Word.delete({ id })
  }

  function deleteCategory(id: string) {
    client.models.Category.delete({ id })
  }

  function createCategory() {
    const name = window.prompt("Category name");
    if (!name) return;
    client.models.Category.create({
      name,
    })
  }

  // Controlled form state for adding a new Word (replaces prompt-based flow)
  const [isAddingWord, setIsAddingWord] = useState(false);
  const [newWord, setNewWord] = useState({
    word: "",
    meaning: "",
    example: "",
    image: "",
    categoryId: "",
  });

  function openAddWordForm() {
    if (categorys.length === 0) return alert("Please create a category first before adding a word.");
    setNewWord({ word: "", meaning: "", example: "", image: "", categoryId: categorys[0]?.id ?? "" });
    setIsAddingWord(true);
  }

  async function submitNewWord(e?: FormEvent) {
    e?.preventDefault();
    if (!newWord.word || !newWord.categoryId) return alert("Word and category are required");

    try {
      await client.models.Word.create({
        word: newWord.word,
        meaning: newWord.meaning || undefined,
        example: newWord.example || undefined,
        image: newWord.image || undefined,
        categoryId: newWord.categoryId,
      });
      setIsAddingWord(false);
      setNewWord({ word: "", meaning: "", example: "", image: "", categoryId: "" });
    } catch (err) {
      console.error("Create word failed", err);
      alert("Failed to create word. See console for details.");
    }
  }

  return (
    <main>
      <button onClick={signOut}>Sign out</button>
      <h1>{user?.signInDetails?.loginId}'s todos</h1>
      {/* <button onClick={createTodo}>+ new</button> */}
      <button onClick={createCategory}>+ new category</button>
      <button onClick={openAddWordForm}>+ new word</button>
      {/* <ul>
        {todos.map((todo) => (
          <li 
            onClick={() => deleteTodo(todo.id)}
            key={todo.id}>{todo.content}</li>
        ))}
      </ul> */}
      {/* Word list */}
      <div>Word</div>
      <ul>
        {words.map((word) => {
          const category = categorys.find((c) => c.id === word.categoryId);
          return (
            <li key={word.id} className="word-item">
              <div className="word-row">
                <div className="word-main">
                  <div className="word-title">{word.word}</div>
                  {word.meaning && <div className="word-meaning">Meaning: {word.meaning}</div>}
                  {word.example && <div className="word-example">Example: {word.example}</div>}
                  {category && <div className="word-category">Category: {category.name}</div>}
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
          <div>
            <label>
              Category: 
              <select required value={newWord.categoryId} onChange={(e) => setNewWord((s) => ({ ...s, categoryId: e.target.value }))}>
                <option value="">-- choose category --</option>
                {categorys.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id})
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div style={{ marginTop: 8 }}>
            <button type="submit">Create</button>
            <button type="button" onClick={() => setIsAddingWord(false)} style={{ marginLeft: 8 }}>Cancel</button>
          </div>
        </form>
      )}
      <div>Category</div>
      <ul>
        {categorys.map((category) => (
          <li 
            onClick={() => deleteCategory(category.id)}
            key={category.id}>{category.name}</li>
        ))}
      </ul>
      <div>
        🥳 App successfully hosted. Try creating a new todo.
        <br />
        <a href="https://docs.amplify.aws/nextjs/start/quickstart/nextjs-app-router-client-components/">
          Review next steps of this tutorial.
        </a>
      </div>
    </main>
  );
}
