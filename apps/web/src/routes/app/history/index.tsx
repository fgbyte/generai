import { createFileRoute } from "@tanstack/react-router";

import { HistoryPage } from "@/components/dashboard/history-page";

export const Route = createFileRoute("/app/history/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <HistoryPage />;
}
