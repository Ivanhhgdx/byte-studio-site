const allowedOrigins = new Set([
  "https://bite-studio.ru",
  "https://www.bite-studio.ru",
]);

const json = (body, status, origin) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": origin,
      "Vary": "Origin",
    },
  });

const clean = (value, maxLength) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    if (!allowedOrigins.has(origin)) {
      return json({ ok: false, error: "Origin is not allowed" }, 403, "null");
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Max-Age": "86400",
          "Vary": "Origin",
        },
      });
    }

    if (request.method !== "POST") {
      return json({ ok: false, error: "Method not allowed" }, 405, origin);
    }

    const contentLength = Number(request.headers.get("Content-Length") || 0);
    if (contentLength > 12_000) {
      return json({ ok: false, error: "Payload is too large" }, 413, origin);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ ok: false, error: "Invalid JSON" }, 400, origin);
    }

    if (clean(payload.website, 200)) {
      return json({ ok: true }, 200, origin);
    }

    const name = clean(payload.name, 100);
    const contact = clean(payload.contact, 200);
    const message = clean(payload.message, 3000);
    const source = clean(payload.source, 500);

    if (!name || !contact || !message) {
      return json({ ok: false, error: "Required fields are missing" }, 422, origin);
    }

    const submittedAt = new Date().toLocaleString("ru-RU", {
      timeZone: "Asia/Krasnoyarsk",
    });
    const text = [
      "Новая заявка с bite-studio.ru",
      "",
      `Имя: ${name}`,
      `Контакт: ${contact}`,
      "",
      "О проекте:",
      message,
      "",
      `Страница: ${source || "bite-studio.ru"}`,
      `Время: ${submittedAt} (Красноярск)`,
    ].join("\n");

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          message_thread_id: Number(env.TELEGRAM_THREAD_ID),
          text,
          disable_web_page_preview: true,
        }),
      }
    );

    if (!telegramResponse.ok) {
      console.error("Telegram API error", telegramResponse.status);
      return json({ ok: false, error: "Delivery failed" }, 502, origin);
    }

    return json({ ok: true }, 200, origin);
  },
};
