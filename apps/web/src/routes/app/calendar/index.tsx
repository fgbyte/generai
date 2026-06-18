import { createFileRoute } from "@tanstack/react-router";
import { Calendar } from "lucide-react";

import { CommingSoonMock } from "@/components/previews/comming-soon-mock";

export const Route = createFileRoute("/app/calendar/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex justify-center">
      <CommingSoonMock label="Calendar" icon={Calendar} />
    </div>
  );
}
