import { createFileRoute } from "@tanstack/react-router";

import { HistoryPage } from "@/components/app/history-page";

export const Route = createFileRoute("/app/history/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <HistoryPage />;
}
