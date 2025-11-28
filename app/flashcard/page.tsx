import { redirect } from "next/navigation";

export default function FlashcardRedirectPage() {
  // redirect singular path to the canonical /flashcards route
  redirect("/flashcards");
}
