import { createFileRoute } from "@tanstack/react-router";

import { CalendarPage } from "@/components/app/calendar-page";

export const Route = createFileRoute("/app/calendar/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <CalendarPage />;
}
