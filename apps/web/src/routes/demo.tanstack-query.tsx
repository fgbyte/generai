import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { env } from "@generai/env/web";
import { hc } from "hono/client";
import type { AppType } from "@server/index";

const client = hc<AppType>(env.VITE_SERVER_URL); //url for the server but loaded for env/web

export const Route = createFileRoute("/demo/tanstack-query")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data } = useQuery({
    queryKey: ["people"],
    queryFn: async () => {
      const resp = await client.api.people.$get(); //rpc
      if (!resp.ok) {
        throw new Error("Failed to fetch people");
      }
      return resp.json();
    },
    initialData: [],
  });

  return (
    <ul className="mb-4 space-y-2">
      {data?.map((people) => (
        <li key={people.id}>
          <p>{people.name}</p>
        </li>
      ))}
    </ul>
  );
}
