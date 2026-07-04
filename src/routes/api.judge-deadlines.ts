import { createFileRoute } from "@tanstack/react-router";
import { triggerExpiredHackathons } from "@/lib/jurix/actions.server";

const handleTrigger = async () => {
  try {
    const results = await triggerExpiredHackathons({ data: { triggered_by: "cron" } });
    return Response.json({ ok: true, results });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Judging trigger failed." },
      { status: 500 },
    );
  }
};

export const Route = createFileRoute("/api/judge-deadlines")({
  server: {
    handlers: {
      GET: handleTrigger,
      POST: handleTrigger,
    },
  },
});
