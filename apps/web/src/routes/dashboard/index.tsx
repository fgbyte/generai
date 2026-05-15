import { createFileRoute } from "@tanstack/react-router";

import { StudioPage } from "@/components/dashboard/studio-page";

export const Route = createFileRoute("/dashboard/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <StudioPage />;
}
