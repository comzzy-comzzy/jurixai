import { createFileRoute } from "@tanstack/react-router";

const handleHealth = async () => {
  return Response.json({
    ok: true,
    status: "healthy",
    timestamp: new Date().toISOString()
  });
};

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: handleHealth,
      POST: handleHealth
    }
  }
});
