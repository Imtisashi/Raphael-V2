const jsonResponse = (body: Record<string, unknown>, status = 410) => new Response(
  JSON.stringify(body),
  {
    status,
    headers: {
      "Content-Type": "application/json",
      "Connection": "keep-alive",
    },
  },
);

Deno.serve((request: Request) => {
  if (request.method === "OPTIONS") return jsonResponse({ ok: false, retired: true }, 410);

  return jsonResponse({
    ok: false,
    retired: true,
    replacement: "dispatch-push-queue",
    message: "This push dispatcher is retired. Use dispatch-push-queue.",
  });
});
