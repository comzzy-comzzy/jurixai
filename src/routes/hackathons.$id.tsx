import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/hackathons/$id")({
  component: HackathonLayout,
});

function HackathonLayout() {
  return <Outlet />;
}
