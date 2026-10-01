const ALLOWED_ORIGINS = new Set([
  "https://violetaksa.com",
  "https://www.violetaksa.com"
]);

function corsHeaders(origin) {
  if (!ALLOWED_ORIGINS.has(origin)) return {};

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    if (url.pathname === "/api/leads") {

      if (request.method === "OPTIONS") {
        if (!ALLOWED_ORIGINS.has(origin)) {
          return new Response(null, { status: 403 });
        }

        return new Response(null, {
          status: 204,
          headers: corsHeaders(origin)
        });
      }

      if (request.method === "POST") {
        if (origin && !ALLOWED_ORIGINS.has(origin)) {
          return Response.json(
            { success: false, error: "Origin not allowed" },
            { status: 403 }
          );
        }

        try {
          const data = await request.json();

          if (!data.name || !data.mobile) {
            return Response.json(
              { success: false, error: "Name and mobile are required" },
              {
                status: 400,
                headers: corsHeaders(origin)
              }
            );
          }

          await env.DB.prepare(`
            INSERT INTO leads
            (
              created_at,
              name,
              mobile,
              project_type,
              service,
              spaces,
              region,
              budget,
              notes,
              language,
              lead_source,
              status,
              idempotency_key
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            new Date().toISOString(),
            data.name || "",
            data.mobile || "",
            data.project_type || "",
            data.service || "",
            data.spaces || "",
            data.region || "",
            data.budget || "",
            data.notes || "",
            data.language || "ar",
            data.lead_source || "website",
            data.status || "new",
            data.idempotency_key || crypto.randomUUID()
          ).run();

          return Response.json(
            { success: true },
            { headers: corsHeaders(origin) }
          );

        } catch (error) {
          return Response.json(
            {
              success: false,
              error: error.message
            },
            {
              status: 500,
              headers: corsHeaders(origin)
            }
          );
        }
      }

      return new Response("Method Not Allowed", {
        status: 405,
        headers: corsHeaders(origin)
      });
    }

    return env.ASSETS.fetch(request);
  }
};
