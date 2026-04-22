import { ProtectedScaffoldPage } from "@/components/protected-scaffold-page";

export default function SessionsPage() {
  return (
    <ProtectedScaffoldPage
      body="Session notes and recaps will be added with the session model and notes editor."
      eyebrow="Sessions"
      title="Sessions"
    />
  );
}
