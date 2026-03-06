export async function POST(req: Request) {
  const body = await req.text();

  const response = await fetch("http://localhost:8000/chat", {
    method: "POST",
    headers: {
      "Content-Type": req.headers.get("Content-Type") || "application/json",
    },
    body,
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type":
        response.headers.get("Content-Type") || "text/event-stream",
      "x-vercel-ai-ui-message-stream":
        response.headers.get("x-vercel-ai-ui-message-stream") || "v1",
    },
  });
}
