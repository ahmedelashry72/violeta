export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/leads" && request.method === "POST") {
      try {
        const data = await request.json();

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

        return Response.json({
          success: true
        });
      } catch (error) {
        return Response.json(
          {
            success: false,
            error: error.message
          },
          { status: 500 }
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};
