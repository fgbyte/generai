import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BottomNavBar } from "@/components/bottom-nav-bar";
import { TopAppBar } from "@/components/top-app-bar";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/app")({
  beforeLoad: async () => {
    const session = await authClient.getSession().catch(() => null);

    if (!session?.data) {
      throw redirect({ to: "/" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const queryClient = useQueryClient();

  // When the user taps the History tab, mark the cached `history` query as
  // stale so the HistoryPage picks up fresh data on (re)entry. The global
  // QueryClient uses a 5 minute staleTime, so without this the cache keeps
  // serving the snapshot from the user's last visit even after new content
  // was generated in the Studio.
  const handleNavClick = (href: string) => {
    if (href === "/app/history") {
      queryClient.invalidateQueries({ queryKey: ["history"] });
    }
  };

  return (
    <div>
      <TopAppBar />
      <div className="pt-30 pb-section">
        <Outlet />
      </div>
      <BottomNavBar onItemClick={handleNavClick} />
    </div>
  );
}
