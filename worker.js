const ALLOWED_ORIGINS = new Set([
  "https://violetaksa.com",
  "https://www.violetaksa.com"
]);

function corsHeaders(origin) {
  if (!ALLOWED_ORIGINS.has(origin)) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getReportEmails(env) {
  return String(env.REPORT_EMAILS || "")
    .split(",")
    .map(email => email.trim())
    .filter(Boolean);
}

function normalizeWhatsAppNumber(mobile = "") {
  let number = String(mobile).replace(/\D/g, "");

  if (number.startsWith("05")) {
    number = `966${number.slice(1)}`;
  }

  return number;
}

function isOriginAllowed(origin) {
  return !origin || ALLOWED_ORIGINS.has(origin);
}

function jsonResponse(data, status, origin) {
  return Response.json(data, {
    status,
    headers: corsHeaders(origin)
  });
}

async function sendLeadEmail(env, lead) {
  if (!env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is missing");
  }

  const recipients = getReportEmails(env);

  if (!recipients.length) {
    throw new Error("REPORT_EMAILS is empty");
  }

  const whatsappNumber = normalizeWhatsAppNumber(lead.mobile);

  const whatsappLink = whatsappNumber
    ? `https://wa.me/${whatsappNumber}`
    : "";

  const subject = `VIOLETA | طلب جديد من ${lead.name}`;

  const html = `
    <div style="font-family:Arial,sans-serif;direction:rtl;text-align:right;max-width:680px;margin:auto;color:#222">

      <div style="background:#1d1d1d;color:#fff;padding:22px;border-radius:12px 12px 0 0">
        <h2 style="margin:0">VIOLETA</h2>
        <p style="margin:8px 0 0">طلب مشروع جديد من الموقع</p>
      </div>

      <div style="border:1px solid #ddd;border-top:none;padding:24px;border-radius:0 0 12px 12px">

        <table style="width:100%;border-collapse:collapse">

          <tr>
            <td style="padding:8px;font-weight:bold">الاسم</td>
            <td style="padding:8px">${escapeHtml(lead.name)}</td>
          </tr>

          <tr>
            <td style="padding:8px;font-weight:bold">رقم الجوال</td>
            <td style="padding:8px">${escapeHtml(lead.mobile)}</td>
          </tr>

          <tr>
            <td style="padding:8px;font-weight:bold">نوع المشروع</td>
            <td style="padding:8px">${escapeHtml(lead.project_type)}</td>
          </tr>

          <tr>
            <td style="padding:8px;font-weight:bold">الخدمة المطلوبة</td>
            <td style="padding:8px">${escapeHtml(lead.service)}</td>
          </tr>

          <tr>
            <td style="padding:8px;font-weight:bold">المساحات</td>
            <td style="padding:8px">${escapeHtml(lead.spaces)}</td>
          </tr>

          <tr>
            <td style="padding:8px;font-weight:bold">المنطقة</td>
            <td style="padding:8px">${escapeHtml(lead.region)}</td>
          </tr>

          <tr>
            <td style="padding:8px;font-weight:bold">الميزانية</td>
            <td style="padding:8px">${escapeHtml(lead.budget)}</td>
          </tr>

          <tr>
            <td style="padding:8px;font-weight:bold">الملاحظات</td>
            <td style="padding:8px">${escapeHtml(lead.notes)}</td>
          </tr>

          <tr>
            <td style="padding:8px;font-weight:bold">مصدر العميل</td>
            <td style="padding:8px">${escapeHtml(lead.lead_source)}</td>
          </tr>

          <tr>
            <td style="padding:8px;font-weight:bold">وقت التسجيل</td>
            <td style="padding:8px">${escapeHtml(lead.created_at)}</td>
          </tr>

        </table>

        ${
          whatsappLink
            ? `
            <div style="margin-top:24px">
              <a
                href="${whatsappLink}"
                style="
                  display:inline-block;
                  background:#25D366;
                  color:#ffffff;
                  text-decoration:none;
                  padding:12px 20px;
                  border-radius:8px;
                  font-weight:bold;
                "
              >
                التواصل مع العميل على واتساب
              </a>
            </div>
            `
            : ""
        }

      </div>
    </div>
  `;

  const response = await fetch(
    "https://api.resend.com/emails",
    {
      method: "POST",

      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        from:
          env.RESEND_FROM_EMAIL ||
          "VIOLETA <onboarding@resend.dev>",

        to: recipients,

        subject,

        html
      })
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result?.message ||
      `Resend error ${response.status}`
    );
  }

  return result;
}

async function handleLead(request, env, origin) {
  if (
    origin &&
    !ALLOWED_ORIGINS.has(origin)
  ) {
    return jsonResponse(
      {
        success: false,
        error: "Origin not allowed"
      },
      403,
      origin
    );
  }

  try {
    const data = await request.json();

    if (!data.name || !data.mobile) {
      return jsonResponse(
        {
          success: false,
          error: "Name and mobile are required"
        },
        400,
        origin
      );
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const idempotencyKey =
      data.idempotency_key ||
      crypto.randomUUID();

    const lead = {
      id,
      created_at: createdAt,

      name:
        data.name || "",

      mobile:
        data.mobile || "",

      project_type:
        data.project_type || "",

      service:
        data.service || "",

      spaces:
        data.spaces || "",

      region:
        data.region || "",

      budget:
        data.budget || "",

      notes:
        data.notes || "",

      language:
        data.language || "ar",

      lead_source:
        data.lead_source || "website",

      status:
        data.status || "new",

      idempotency_key:
        idempotencyKey
    };

    await env.DB.prepare(`
      INSERT INTO leads (
        id,
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
      .bind(
        lead.id,
        lead.created_at,
        lead.name,
        lead.mobile,
        lead.project_type,
        lead.service,
        lead.spaces,
        lead.region,
        lead.budget,
        lead.notes,
        lead.language,
        lead.lead_source,
        lead.status,
        lead.idempotency_key
      )
      .run();

    let emailSent = false;

    try {
      await sendLeadEmail(env, lead);
      emailSent = true;
    } catch (emailError) {
      console.error(
        "Lead email error:",
        emailError
      );
    }

    return jsonResponse(
      {
        success: true,
        id,
        email_sent: emailSent
      },
      201,
      origin
    );

  } catch (error) {

    console.error(
      "Lead save error:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          error.message ||
          "Unknown server error"
      },
      500,
      origin
    );
  }
}

async function handleAnalytics(request, env, origin) {
  if (
    origin &&
    !ALLOWED_ORIGINS.has(origin)
  ) {
    return jsonResponse(
      {
        success: false,
        error: "Origin not allowed"
      },
      403,
      origin
    );
  }

  try {
    const data = await request.json();

    if (!data.session_id || !data.event_name) {
      return jsonResponse(
        {
          success: false,
          error:
            "session_id and event_name are required"
        },
        400,
        origin
      );
    }

    const id = crypto.randomUUID();
    const createdAt =
      new Date().toISOString();

    let metadata = "";

    if (data.metadata !== undefined) {
      metadata =
        typeof data.metadata === "string"
          ? data.metadata
          : JSON.stringify(data.metadata);
    }

    await env.DB.prepare(`
      INSERT INTO analytics_events (
        id,
        session_id,
        event_name,
        step,
        page,
        metadata,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
      .bind(
        id,
        String(data.session_id),
        String(data.event_name),
        data.step
          ? String(data.step)
          : "",
        data.page
          ? String(data.page)
          : "home",
        metadata,
        createdAt
      )
      .run();

    return jsonResponse(
      {
        success: true,
        id
      },
      201,
      origin
    );

  } catch (error) {

    console.error(
      "Analytics save error:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          error.message ||
          "Unknown server error"
      },
      500,
      origin
    );
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const origin =
      request.headers.get("Origin") || "";

    // ==================================================
    // Leads API
    // ==================================================

    if (url.pathname === "/api/leads") {

      if (request.method === "OPTIONS") {
        if (!isOriginAllowed(origin)) {
          return new Response(null, {
            status: 403
          });
        }

        return new Response(null, {
          status: 204,
          headers: corsHeaders(origin)
        });
      }

      if (request.method === "POST") {
        return handleLead(
          request,
          env,
          origin
        );
      }

      return new Response(
        "Method Not Allowed",
        {
          status: 405,
          headers: corsHeaders(origin)
        }
      );
    }

    // ==================================================
    // Analytics API
    // ==================================================

    if (url.pathname === "/api/analytics") {

      if (request.method === "OPTIONS") {
        if (!isOriginAllowed(origin)) {
          return new Response(null, {
            status: 403
          });
        }

        return new Response(null, {
          status: 204,
          headers: corsHeaders(origin)
        });
      }

      if (request.method === "POST") {
        return handleAnalytics(
          request,
          env,
          origin
        );
      }

      return new Response(
        "Method Not Allowed",
        {
          status: 405,
          headers: corsHeaders(origin)
        }
      );
    }

    // ==================================================
    // Serve website assets
    // ==================================================

    return env.ASSETS.fetch(request);
  }
};
