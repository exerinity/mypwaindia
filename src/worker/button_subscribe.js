const SUBSCRIBE_ORIGINS = [
  "https://mypayindia.sbs",
  "https://www.mypayindia.sbs",
  "https://mpi.exerinity.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];

function subCors(origin) {
  const allow = SUBSCRIBE_ORIGINS.includes(origin) ? origin : SUBSCRIBE_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function subJson(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...subCors(origin) }
  });
}

async function verifyUsername(auth, userBase) {
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const me = await fetch(`${userBase}/api/v2/user/info`, {
    headers: { Authorization: auth, Accept: "application/json" }
  }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  return me && me.success ? (me.data?.username ?? null) : null;
}

export const subscribe = {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: subCors(origin) });
    }

    const userBase = env.MPI_USER_BASE || "https://bastion.mypayindia.sbs";
    const payBase = env.MPI_PAY_BASE || "https://mypayindia.com";
    const planId = 5;
    const secret = env.MPI_SECRET_KEY;

    if (url.pathname === "/status" && request.method === "GET") {
      const username = await verifyUsername(request.headers.get("Authorization"), userBase);
      if (!username) return subJson({ subscribed: false, error: "unauthorized" }, 401, origin);

      const subsRes = await fetch(`${payBase}/api/v2/pay/subscriptions`, {
        headers: { Authorization: `Bearer ${secret}`, Accept: "application/json" }
      }).then((r) => r.json()).catch(() => null);

      const subs = subsRes && subsRes.success ? (subsRes.data || []) : [];
      const match = subs.find((s) =>
        s.payer_username === username &&
        (s.status === "active" || s.status === "trialing") &&
        (planId === null || s.plan_id === planId)
      );

      return subJson({
        subscribed: !!match,
        status: match?.status ?? null,
        plan: match?.plan_name ?? null,
        current_period_end: match?.current_period_end ?? null,
        cancel_at_period_end: match?.cancel_at_period_end ?? false
      }, 200, origin);
    }

    if (url.pathname === "/subscribe" && request.method === "POST") {
      if (!planId) return subJson({ error: "no plan configured" }, 500, origin);
      const username = await verifyUsername(request.headers.get("Authorization"), userBase);

      const res = await fetch(`${payBase}/api/v2/pay/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          plan_id: planId,
          return_url: env.RETURN_URL || "https://mypayindia.sbs/iotm/button",
          ...(username ? { order_id: `clicker-${username}` } : {})
        })
      }).then((r) => r.json()).catch(() => null);

      if (!res || !res.success) return subJson({ error: res?.message || "failed to create session" }, 502, origin);
      return subJson({ checkout_url: res.data.checkout_url, session_id: res.data.session_id }, 200, origin);
    }

    return subJson({ error: "not found" }, 404, origin);
  }
};
