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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    // ==================================================
    // API endpoint
    // ==================================================

    if (url.pathname === "/api/leads") {

      // ------------------------------------------------
      // CORS preflight
      // ------------------------------------------------

      if (request.method === "OPTIONS") {

        if (!ALLOWED_ORIGINS.has(origin)) {
          return new Response(null, {
            status: 403
          });
        }

        return new Response(null, {
          status: 204,
          headers: corsHeaders(origin)
        });
      }

      // ------------------------------------------------
      // Save new lead
      // ------------------------------------------------

      if (request.method === "POST") {

        // Allow direct requests with no Origin,
        // but reject unknown browser origins.

        if (
          origin &&
          !ALLOWED_ORIGINS.has(origin)
        ) {
          return Response.json(
            {
              success: false,
              error: "Origin not allowed"
            },
            {
              status: 403,
              headers: corsHeaders(origin)
            }
          );
        }

        try {
          const data = await request.json();

          // --------------------------------------------
          // Required fields
          // --------------------------------------------

          if (!data.name || !data.mobile) {
            return Response.json(
              {
                success: false,
                error: "Name and mobile are required"
              },
              {
                status: 400,
                headers: corsHeaders(origin)
              }
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

          // --------------------------------------------
          // Save lead to D1
          // --------------------------------------------

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

          // --------------------------------------------
          // Send immediate email
          // Failure here must NOT delete or lose lead
          // --------------------------------------------

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

          // --------------------------------------------
          // Success response
          // --------------------------------------------

          return Response.json(
            {
              success: true,
              id,
              email_sent: emailSent
            },
            {
              status: 201,
              headers: corsHeaders(origin)
            }
          );

        } catch (error) {

          console.error(
            "Lead save error:",
            error
          );

          return Response.json(
            {
              success: false,
              error:
                error.message ||
                "Unknown server error"
            },
            {
              status: 500,
              headers: corsHeaders(origin)
            }
          );
        }
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
