import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/hackathons")({
  component: HackathonsLayout,
});

function HackathonsLayout() {
  return <Outlet />;
}
