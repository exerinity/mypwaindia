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

const ALWAYS_SUBSCRIBED_IDS = [228];
export const PLANS = {
  clicker: { id: 5, order: "clicker", returnVar: "RETURN_URL", returnUrl: "https://mypayindia.sbs/iotm/button" },
  agent: { id: 7, order: "agent", returnVar: "AGENT_RETURN_URL", returnUrl: "https://mypayindia.sbs/i/clanker" }
};

export function resolvePlan(name) {
  return typeof name === "string" && Object.prototype.hasOwnProperty.call(PLANS, name) ? PLANS[name] : PLANS.clicker;
}

export async function subscriptionStatus(user, env, planId = PLANS.clicker.id) {
  if (ALWAYS_SUBSCRIBED_IDS.includes(user.id)) {
    return {
      subscribed: true,
      status: "active",
      plan: "Complimentary",
      current_period_end: null,
      cancel_at_period_end: false
    };
  }

  const payBase = env.MPI_PAY_BASE || "https://mypayindia.com";
  const subsRes = await fetch(`${payBase}/api/v2/pay/subscriptions`, {
    headers: { Authorization: `Bearer ${env.MPI_SECRET_KEY}`, Accept: "application/json" }
  }).then((r) => r.json()).catch(() => null);

  const subs = subsRes && subsRes.success ? (subsRes.data || []) : [];
  const match = subs.find((s) =>
    s.payer_username === user.username &&
    (s.status === "active" || s.status === "trialing") &&
    (planId === null || s.plan_id === planId)
  );

  return {
    subscribed: !!match,
    status: match?.status ?? null,
    plan: match?.plan_name ?? null,
    current_period_end: match?.current_period_end ?? null,
    cancel_at_period_end: match?.cancel_at_period_end ?? false
  };
}

export async function verifyUser(auth, userBase) {
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const me = await fetch(`${userBase}/api/v2/user/info`, {
    headers: { Authorization: auth, Accept: "application/json" }
  }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!me || !me.success || !me.data) return null;
  const username = me.data.username ?? null;
  if (!username) return null;
  return { username, id: Number(me.data.id ?? me.data.user_id) };
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
    const secret = env.MPI_SECRET_KEY;

    if (url.pathname === "/status" && request.method === "GET") {
      const user = await verifyUser(request.headers.get("Authorization"), userBase);
      if (!user) return subJson({ subscribed: false, error: "unauthorized" }, 401, origin);
      const plan = resolvePlan(url.searchParams.get("plan"));
      return subJson(await subscriptionStatus(user, env, plan.id), 200, origin);
    }

    if (url.pathname === "/subscribe" && request.method === "POST") {
      const body = await request.json().catch(() => null);
      const plan = resolvePlan(body?.plan);
      const username = (await verifyUser(request.headers.get("Authorization"), userBase))?.username ?? null;

      const res = await fetch(`${payBase}/api/v2/pay/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          plan_id: plan.id,
          return_url: env[plan.returnVar] || plan.returnUrl,
          ...(username ? { order_id: `${plan.order}-${username}` } : {})
        })
      }).then((r) => r.json()).catch(() => null);

      if (!res || !res.success) return subJson({ error: res?.message || "failed to create session" }, 502, origin);
      return subJson({ checkout_url: res.data.checkout_url, session_id: res.data.session_id }, 200, origin);
    }

    return subJson({ error: "not found" }, 404, origin);
  }
};
