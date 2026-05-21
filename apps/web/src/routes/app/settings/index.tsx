import { createFileRoute } from "@tanstack/react-router";

import { SettingsPage } from "@/components/app/settings-page";

export const Route = createFileRoute("/app/settings/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <SettingsPage />;
}
