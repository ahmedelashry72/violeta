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


const SAUDI_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;

function getSaudiDayContext(now = new Date()) {
  const shifted = new Date(now.getTime() + SAUDI_UTC_OFFSET_MS);

  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth();
  const day = shifted.getUTCDate();

  const startUtcMs =
    Date.UTC(year, month, day) - SAUDI_UTC_OFFSET_MS;

  const elapsedTodayMs =
    Math.max(0, now.getTime() - startUtcMs);

  const currentStart =
    new Date(startUtcMs);

  const currentEnd =
    new Date(now.getTime());

  const previousStart =
    new Date(startUtcMs - 24 * 60 * 60 * 1000);

  const previousEnd =
    new Date(previousStart.getTime() + elapsedTodayMs);

  return {
    currentStart,
    currentEnd,
    previousStart,
    previousEnd,
    saudiDate:
      `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  };
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function getChangePercent(current, previous) {
  const currentNumber = Number(current || 0);
  const previousNumber = Number(previous || 0);

  if (previousNumber === 0) {
    return currentNumber === 0 ? 0 : 100;
  }

  return (
    ((currentNumber - previousNumber) / previousNumber) * 100
  );
}

function getChangeLabel(current, previous) {
  const change =
    getChangePercent(current, previous);

  if (change > 0) {
    return `▲ ${Math.abs(change).toFixed(1)}%`;
  }

  if (change < 0) {
    return `▼ ${Math.abs(change).toFixed(1)}%`;
  }

  return "— 0.0%";
}

async function getDailyMetrics(env, startIso, endIso) {
  const analyticsSummary = await env.DB.prepare(`
    SELECT
      COUNT(DISTINCT CASE
        WHEN event_name = 'page_view'
        THEN session_id
      END) AS visitors,

      COUNT(DISTINCT CASE
        WHEN event_name = 'wizard_open'
        THEN session_id
      END) AS wizard_opens,

      COUNT(DISTINCT CASE
        WHEN event_name = 'lead_submit_attempt'
        THEN session_id
      END) AS submit_attempts

    FROM analytics_events

    WHERE created_at >= ?
      AND created_at < ?
  `)
    .bind(startIso, endIso)
    .first();

  const leadSummary = await env.DB.prepare(`
    SELECT COUNT(*) AS leads

    FROM leads

    WHERE created_at >= ?
      AND created_at < ?
  `)
    .bind(startIso, endIso)
    .first();

  const funnelRows = await env.DB.prepare(`
    SELECT
      step,
      COUNT(DISTINCT session_id) AS sessions

    FROM analytics_events

    WHERE event_name = 'wizard_step'
      AND created_at >= ?
      AND created_at < ?
      AND step <> ''

    GROUP BY step
  `)
    .bind(startIso, endIso)
    .all();

  const leads =
    Number(leadSummary?.leads || 0);

  const visitors =
    Number(analyticsSummary?.visitors || 0);

  const wizardOpens =
    Number(analyticsSummary?.wizard_opens || 0);

  const submitAttempts =
    Number(analyticsSummary?.submit_attempts || 0);

  const conversionRate =
    visitors > 0
      ? (leads / visitors) * 100
      : 0;

  const wizardConversionRate =
    wizardOpens > 0
      ? (leads / wizardOpens) * 100
      : 0;

  const funnel = {};

  for (const row of funnelRows?.results || []) {
    funnel[row.step] =
      Number(row.sessions || 0);
  }

  return {
    visitors,
    wizard_opens: wizardOpens,
    submit_attempts: submitAttempts,
    leads,
    conversion_rate: conversionRate,
    wizard_conversion_rate: wizardConversionRate,
    funnel
  };
}

async function getRecentLeads(env, startIso, endIso) {
  const result = await env.DB.prepare(`
    SELECT
      name,
      mobile,
      project_type,
      service,
      region,
      budget,
      created_at

    FROM leads

    WHERE created_at >= ?
      AND created_at < ?

    ORDER BY created_at DESC

    LIMIT 10
  `)
    .bind(startIso, endIso)
    .all();

  return result?.results || [];
}

function renderMetricCard(label, value, comparison = "") {
  return `
    <td style="width:33.33%;padding:8px;vertical-align:top">
      <div style="border:1px solid #e5e7eb;border-radius:10px;padding:16px;background:#ffffff">
        <div style="font-size:13px;color:#6b7280;margin-bottom:8px">
          ${escapeHtml(label)}
        </div>

        <div style="font-size:26px;font-weight:700;color:#111827">
          ${escapeHtml(value)}
        </div>

        ${
          comparison
            ? `
              <div style="font-size:12px;color:#6b7280;margin-top:8px">
                ${escapeHtml(comparison)}
              </div>
            `
            : ""
        }
      </div>
    </td>
  `;
}

function renderFunnelRows(funnel = {}) {
  const steps = [
    ["intro", "فتح البداية"],
    ["type", "نوع المشروع"],
    ["commercial", "نوع النشاط التجاري"],
    ["service", "الخدمة"],
    ["location", "الموقع"],
    ["scope", "نطاق المشروع"],
    ["rooms", "المساحات"],
    ["details", "التفاصيل"],
    ["budget", "الميزانية"],
    ["contact", "بيانات التواصل"],
    ["success", "نجاح الإرسال"]
  ];

  return steps
    .map(([key, label]) => `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #eee">
          ${escapeHtml(label)}
        </td>

        <td style="padding:10px;border-bottom:1px solid #eee;text-align:center;font-weight:700">
          ${formatNumber(funnel[key] || 0)}
        </td>
      </tr>
    `)
    .join("");
}

function renderLeadRows(leads = []) {
  if (!leads.length) {
    return `
      <tr>
        <td colspan="6" style="padding:18px;text-align:center;color:#6b7280">
          لا توجد طلبات جديدة اليوم.
        </td>
      </tr>
    `;
  }

  return leads
    .map(lead => {
      const whatsappNumber =
        normalizeWhatsAppNumber(lead.mobile);

      const mobileHtml =
        whatsappNumber
          ? `
            <a
              href="https://wa.me/${whatsappNumber}"
              style="color:#0f766e;text-decoration:none"
            >
              ${escapeHtml(lead.mobile)}
            </a>
          `
          : escapeHtml(lead.mobile);

      return `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #eee">
            ${escapeHtml(lead.name)}
          </td>

          <td style="padding:10px;border-bottom:1px solid #eee">
            ${mobileHtml}
          </td>

          <td style="padding:10px;border-bottom:1px solid #eee">
            ${escapeHtml(lead.project_type)}
          </td>

          <td style="padding:10px;border-bottom:1px solid #eee">
            ${escapeHtml(lead.service)}
          </td>

          <td style="padding:10px;border-bottom:1px solid #eee">
            ${escapeHtml(lead.region)}
          </td>

          <td style="padding:10px;border-bottom:1px solid #eee">
            ${escapeHtml(lead.budget)}
          </td>
        </tr>
      `;
    })
    .join("");
}

async function sendDailyReport(env) {
  if (!env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is missing");
  }

  const recipients =
    getReportEmails(env);

  if (!recipients.length) {
    throw new Error("REPORT_EMAILS is empty");
  }

  const context =
    getSaudiDayContext();

  const currentStartIso =
    context.currentStart.toISOString();

  const currentEndIso =
    context.currentEnd.toISOString();

  const previousStartIso =
    context.previousStart.toISOString();

  const previousEndIso =
    context.previousEnd.toISOString();

  const [
    current,
    previous,
    recentLeads
  ] = await Promise.all([
    getDailyMetrics(
      env,
      currentStartIso,
      currentEndIso
    ),

    getDailyMetrics(
      env,
      previousStartIso,
      previousEndIso
    ),

    getRecentLeads(
      env,
      currentStartIso,
      currentEndIso
    )
  ]);

  const subject =
    `VIOLETA | التقرير اليومي | ${context.saudiDate}`;

  const html = `
    <div style="font-family:Arial,sans-serif;direction:rtl;text-align:right;max-width:900px;margin:auto;background:#f7f7f7;padding:24px;color:#111827">

      <div style="background:#1d1d1d;color:#fff;padding:24px;border-radius:14px;margin-bottom:18px">
        <h1 style="margin:0;font-size:28px">
          VIOLETA
        </h1>

        <p style="margin:8px 0 0">
          التقرير اليومي للموقع — ${escapeHtml(context.saudiDate)}
        </p>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:10px">
        <tr>
          ${renderMetricCard(
            "الزوار / الجلسات",
            formatNumber(current.visitors),
            `مقارنة بنفس الوقت أمس: ${getChangeLabel(
              current.visitors,
              previous.visitors
            )}`
          )}

          ${renderMetricCard(
            "بدأوا النموذج",
            formatNumber(current.wizard_opens),
            `مقارنة بنفس الوقت أمس: ${getChangeLabel(
              current.wizard_opens,
              previous.wizard_opens
            )}`
          )}

          ${renderMetricCard(
            "الطلبات الجديدة",
            formatNumber(current.leads),
            `مقارنة بنفس الوقت أمس: ${getChangeLabel(
              current.leads,
              previous.leads
            )}`
          )}
        </tr>

        <tr>
          ${renderMetricCard(
            "محاولات الإرسال",
            formatNumber(current.submit_attempts)
          )}

          ${renderMetricCard(
            "Conversion من الزيارة",
            formatPercent(current.conversion_rate)
          )}

          ${renderMetricCard(
            "Conversion من فتح النموذج",
            formatPercent(current.wizard_conversion_rate)
          )}
        </tr>
      </table>

      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:18px;margin-top:18px">
        <h2 style="margin:0 0 14px;font-size:20px">
          Funnel مراحل النموذج
        </h2>

        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr>
              <th style="padding:10px;background:#f3f4f6;text-align:right">
                المرحلة
              </th>

              <th style="padding:10px;background:#f3f4f6;text-align:center">
                عدد الجلسات
              </th>
            </tr>
          </thead>

          <tbody>
            ${renderFunnelRows(current.funnel)}
          </tbody>
        </table>
      </div>

      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:18px;margin-top:18px">
        <h2 style="margin:0 0 14px;font-size:20px">
          آخر الطلبات الجديدة اليوم
        </h2>

        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr>
              <th style="padding:10px;background:#f3f4f6;text-align:right">الاسم</th>
              <th style="padding:10px;background:#f3f4f6;text-align:right">الجوال</th>
              <th style="padding:10px;background:#f3f4f6;text-align:right">المشروع</th>
              <th style="padding:10px;background:#f3f4f6;text-align:right">الخدمة</th>
              <th style="padding:10px;background:#f3f4f6;text-align:right">المنطقة</th>
              <th style="padding:10px;background:#f3f4f6;text-align:right">الميزانية</th>
            </tr>
          </thead>

          <tbody>
            ${renderLeadRows(recentLeads)}
          </tbody>
        </table>
      </div>

      <div style="margin-top:18px;padding:14px 18px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;color:#6b7280;font-size:12px">
        التقرير يغطي اليوم من الساعة 12:00 منتصف الليل بتوقيت السعودية حتى وقت الإرسال،
        والمقارنة تتم مع نفس المدة من اليوم السابق.
      </div>

    </div>
  `;

  const response = await fetch(
    "https://api.resend.com/emails",
    {
      method: "POST",

      headers: {
        "Authorization":
          `Bearer ${env.RESEND_API_KEY}`,

        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({
        from:
          env.RESEND_FROM_EMAIL ||
          "VIOLETA <onboarding@resend.dev>",

        to:
          recipients,

        subject,

        html
      })
    }
  );

  const result =
    await response.json();

  if (!response.ok) {
    throw new Error(
      result?.message ||
      `Resend error ${response.status}`
    );
  }

  return result;
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
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(
      sendDailyReport(env)
    );
  }
};
