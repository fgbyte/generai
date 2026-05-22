import { createFileRoute } from "@tanstack/react-router";

import { StudioPage } from "@/components/app/studio-page";

export const Route = createFileRoute("/app/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <StudioPage />;
}
