import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

const TITLE_TEXT = `Hello dream-stack`;

function HomeComponent() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-2">
      <p className="font-karma text-xl text-red-500">{TITLE_TEXT}</p>
    </div>
  );
}
