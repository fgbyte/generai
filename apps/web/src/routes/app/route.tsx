import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BottomNavBar } from "@/components/bottom-nav-bar";
import { TopAppBar } from "@/components/top-app-bar";

export const Route = createFileRoute("/app")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <TopAppBar />
      <div className="pt-30 pb-section">
        <Outlet />
      </div>
      <BottomNavBar />
    </div>
  );
}
