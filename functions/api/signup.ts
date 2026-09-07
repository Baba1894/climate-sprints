/**
 * Climate Sprints — contact form handler.
 * Cloudflare Pages Function. Lives at functions/api/signup.ts, serves POST /api/signup.
 *
 * v2 — 7 September 2026. Adds Cloudflare Turnstile and four further guards after
 * the September 2026 spam campaigns. Every guard runs before any Loops call, so a
 * rejected submission creates no contact, sends you no notification, and — the part
 * that actually mattered — sends the submitter no acknowledgement email.
 *
 * Environment variables (Pages → Settings → Variables and Secrets):
 *   LOOPS_API_KEY           Secret  from Loops → Settings → API
 *   LOOPS_LISTS             Text    JSON map of interest key → Loops list ID
 *   LOOPS_TRANSACTIONAL_ID  Text    template that notifies you of a new enquiry
 *   LOOPS_ACK_ID            Text    template that acknowledges receipt to the enquirer
 *   NOTIFY_EMAIL            Text    where your notification goes
 *   TURNSTILE_SECRET_KEY    Secret  NEW — from Turnstile → your widget → Secret Key
 *
 * Optional binding (Pages → Settings → Bindings → KV namespace):
 *   RATE_LIMIT              KV      NEW — namespace cs-rate-limit. Absent is fine;
 *                                   the rate-limit guards simply do not run.
 *
 * LOOPS_LISTS looks like this, on one line:
 *   {"general":"aaa","diligence":"bbb","portfolio":"ccc","mastermind":"ddd",
 *    "momentum":"eee","alignment":"fff","fractional":"ggg","conversations":"hhh"}
 *
 * Everyone is subscribed to "general". Everyone is additionally subscribed to
 * the list matching each interest they ticked. Adding or removing a list later
 * means editing that one variable — no code change.
 *
 * Roles are NOT lists. They are stored as properties, because a person does not
 * subscribe to being a family office, and unsubscribing should never delete the
 * fact that they are one.
 */

interface Env {
  LOOPS_API_KEY: string;
  LOOPS_LISTS?: string;
  LOOPS_TRANSACTIONAL_ID?: string;
  LOOPS_ACK_ID?: string;
  NOTIFY_EMAIL?: string;
  TURNSTILE_SECRET_KEY: string;
  RATE_LIMIT?: KVNamespace;
}

const LOOPS = "https://app.loops.so/api/v1";
const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Seconds. Humans take longer than this to fill the form; bots do not. */
const MIN_DWELL = 4;
/** Seconds. A page left open longer than this has a stale Turnstile token anyway. */
const MAX_DWELL = 3600;

/** Form checkbox value to readable label, for the notification and the summary property. */
const ROLES: Record<string, string> = {
  fund: "Angel, family office, fund or LP",
  cvc: "Corporate venture fund",
  developer: "Commercial-scale developer",
  founder: "Founder or CxO",
};

const INTERESTS: Record<string, string> = {
  diligence: "Technical and commercial diligence",
  portfolio: "Portfolio support",
  mastermind: "Climate Catalyst Mastermind",
  momentum: "Momentum Sprints",
  alignment: "Alignment Sprints",
  fractional: "Fractional or interim executive",
  method: "The published method and founder guide",
  conversations: "Conversations, guest inquiry",
};

/** Form value to the boolean property name written to Loops.
 *  Loops derives API names from the display name and camelCases them, so these
 *  are isCapital / wantMastermind rather than is_capital / want_mastermind.
 *  If a property is renamed in Loops, change it here too — a mismatch writes
 *  nowhere and reports nothing. */
const ROLE_FLAG: Record<string, string> = {
  fund: "isCapital",
  cvc: "isCorpvc",
  developer: "isDeveloper",
  founder: "isFounder",
};

const INTEREST_FLAG: Record<string, string> = {
  diligence: "wantDiligence",
  portfolio: "wantPortfolio",
  mastermind: "wantMastermind",
  momentum: "wantMomentum",
  alignment: "wantAlignment",
  fractional: "wantFractional",
  method: "wantMethod",
  conversations: "wantConversations",
};

/** Free-text and company-field patterns that are effectively never present in a
 *  real enquiry from an allocator. Tuned against the September 2026 campaigns. */
const SPAM_TEXT: RegExp[] = [
  /https?:\/\//i,
  /\bwww\./i,
  /\b(backlink|back link|link building|seo (service|ranking|expert|agency))\b/i,
  /\b(crypto|forex|bitcoin)\s+(invest|trading|signal|bot)/i,
  /\b(guest post|write for us|casino|escort|viagra)\b/i,
  /(telegram|whatsapp|skype)\s*[:@]/i,
  /<a\s+href/i,
  /\[url=/i,
];

/** Name-field patterns. The RobertVor campaign is the second entry. */
const SPAM_NAME: RegExp[] = [
  /https?:\/\//i,
  /vor(gm|bn|xx|hd)\b/i,
  /[<>{}[\]]/,
  /(.)\1{4,}/,
];

/** Bot-certain. Redirect to /thanks exactly as the honeypot always has, so the
 *  bot records a success, does not retry with variations, and learns nothing. */
function swallow(origin: string, reason: string) {
  console.log(`[signup] blocked (${reason})`);
  return Response.redirect(`${origin}/thanks`, 303);
}

/** Human-plausible. Send them back with something they can act on. */
function bounce(origin: string, code: string, reason: string) {
  console.log(`[signup] rejected (${reason})`);
  return Response.redirect(`${origin}/contact?error=${code}`, 303);
}

async function verifyTurnstile(token: string, ip: string, secret: string) {
  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  if (ip) body.append("remoteip", ip);
  const res = await fetch(SITEVERIFY, { method: "POST", body });
  return (await res.json()) as {
    success: boolean;
    hostname?: string;
    "error-codes"?: string[];
  };
}

function matches(text: string, patterns: RegExp[]) {
  return patterns.some((p) => p.test(text));
}

/** Returns true if this key has already hit its limit. No-ops without the binding. */
async function overLimit(env: Env, key: string, limit: number, ttl: number) {
  if (!env.RATE_LIMIT) return false;
  try {
    const raw = await env.RATE_LIMIT.get(key);
    const n = raw ? parseInt(raw, 10) : 0;
    if (n >= limit) return true;
    await env.RATE_LIMIT.put(key, String(n + 1), { expirationTtl: ttl });
    return false;
  } catch (e) {
    console.error("rate limit store unavailable", e);
    return false; // fail open: never block a real person over a KV outage
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = new URL(request.url).origin;
  const ip = request.headers.get("CF-Connecting-IP") || "";
  const country = request.headers.get("CF-IPCountry") || "";

  try {
    const form = await request.formData();
    const str = (k: string) => ((form.get(k) as string) || "").trim();

    // ==========================================================
    // GUARDS. Nothing below runs until all of these pass.
    // ==========================================================

    // 1 · Turnstile. Fails closed. This is the one that stops the campaigns.
    const token = str("cf-turnstile-response");
    if (!token) return bounce(origin, "verify", "no turnstile token");

    const outcome = await verifyTurnstile(token, ip, env.TURNSTILE_SECRET_KEY);
    if (!outcome.success) {
      return bounce(origin, "verify", `turnstile: ${(outcome["error-codes"] || []).join(",")}`);
    }
    if (outcome.hostname && !outcome.hostname.endsWith("climatesprints.com")) {
      return swallow(origin, `hostname ${outcome.hostname}`);
    }

    // 2 · Honeypot. Unchanged field name, so the existing markup keeps working.
    if (str("website")) return swallow(origin, "honeypot");

    // 3 · Dwell time. Written by script at page render; a direct POST has none.
    const rendered = parseInt(str("rendered"), 10);
    if (!Number.isFinite(rendered)) return swallow(origin, "no render timestamp");
    const dwell = (Date.now() - rendered) / 1000;
    if (dwell < MIN_DWELL) return swallow(origin, `dwell ${dwell.toFixed(1)}s`);
    if (dwell > MAX_DWELL) return bounce(origin, "expired", "stale form");

    // 4 · Field content.
    const email = str("email").toLowerCase();
    if (!email || !email.includes("@")) return bounce(origin, "email", "bad email");

    const firstName = str("firstName");
    const lastName = str("lastName");
    const company = str("company");
    const lookingAt = str("context").slice(0, 2000);

    if (firstName.length > 60 || lastName.length > 60) return swallow(origin, "name length");
    if (matches(`${firstName} ${lastName}`, SPAM_NAME)) return swallow(origin, "name pattern");
    if (matches(`${lookingAt} ${company}`, SPAM_TEXT)) return swallow(origin, "text pattern");

    // 5 · Rate limits.
    if (await overLimit(env, `e:${email}`, 2, 86400)) {
      return bounce(origin, "duplicate", `email limit ${email}`);
    }
    if (ip && (await overLimit(env, `i:${ip}`, 5, 3600))) {
      return bounce(origin, "duplicate", `ip limit ${ip}`);
    }

    // ==========================================================
    // Past the guards. Original logic from here, with two changes
    // marked REVIEW below.
    // ==========================================================

    const roles = form.getAll("role").map(String);
    const interests = form.getAll("interest").map(String);

    const roleLabels = roles.map((r) => ROLES[r] || r).join(", ");
    const interestLabels = interests.map((i) => INTERESTS[i] || i).join(", ");

    // REVIEW · soft signal. Nothing ticked in either group was the signature of
    // the RobertVor campaign. Not a rejection — a real person can legitimately
    // submit with only a note — but such a submission is notified to you for
    // review and is NOT written to Loops and NOT acknowledged until you look.
    const unreviewed = roles.length === 0 && interests.length === 0;

    // ---- mailing lists: general, plus one per ticked interest
    let lists: Record<string, string> = {};
    try {
      lists = env.LOOPS_LISTS ? JSON.parse(env.LOOPS_LISTS) : {};
    } catch {
      console.error("LOOPS_LISTS is not valid JSON — no lists will be set");
    }
    const mailingLists: Record<string, boolean> = {};
    if (lists.general) mailingLists[lists.general] = true;
    for (const key of interests) {
      const id = lists[key];
      if (id) mailingLists[id] = true;
    }

    // ---- properties
    const properties: Record<string, unknown> = {
      email,
      firstName,
      lastName,
      company,
      source: "climatesprints.com",
      roleType: roleLabels,
      interestSummary: interestLabels,
      lookingAt,
      subscribed: true,
    };
    for (const key of Object.keys(ROLE_FLAG)) {
      properties[ROLE_FLAG[key]] = roles.includes(key);
    }
    for (const key of Object.keys(INTEREST_FLAG)) {
      properties[INTEREST_FLAG[key]] = interests.includes(key);
    }
    if (Object.keys(mailingLists).length) properties.mailingLists = mailingLists;

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.LOOPS_API_KEY}`,
    };

    if (!unreviewed) {
      const contactRes = await fetch(`${LOOPS}/contacts/update`, {
        method: "PUT",
        headers,
        body: JSON.stringify(properties),
      });
      if (!contactRes.ok) {
        console.error("Loops contact failed", contactRes.status, await contactRes.text());
      }
    }

    // ---- notify. Separate call so a template problem cannot lose the contact.
    //      Fires in both cases, so a flagged submission is never silently lost.
    if (env.LOOPS_TRANSACTIONAL_ID && env.NOTIFY_EMAIL) {
      const notifyRes = await fetch(`${LOOPS}/transactional`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          transactionalId: env.LOOPS_TRANSACTIONAL_ID,
          email: env.NOTIFY_EMAIL,
          dataVariables: {
            name: `${firstName} ${lastName}`.trim() || "(no name given)",
            contactEmail: email,
            company: company || "(none)",
            roleType: roleLabels || "(none selected)",
            interests: interestLabels || "(none selected)",
            lookingAt: lookingAt || "(nothing written)",
            submittedAt: new Date().toISOString(),
            // REVIEW · new diagnostic fields. Add them to the template when
            // convenient; unused dataVariables are ignored by Loops.
            status: unreviewed ? "REVIEW — nothing selected, not added to Loops" : "added",
            dwellSeconds: dwell.toFixed(1),
            country: country || "(unknown)",
          },
        }),
      });
      if (!notifyRes.ok) {
        console.error("Loops transactional failed", notifyRes.status, await notifyRes.text());
      }
    }

    // ---- acknowledge to the person who submitted. Transactional, not marketing:
    //      triggered by their own action and carrying no promotional content.
    //      Suppressed for flagged submissions so we never mail an address we
    //      have not yet decided to trust.
    if (env.LOOPS_ACK_ID && !unreviewed) {
      const ackRes = await fetch(`${LOOPS}/transactional`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          transactionalId: env.LOOPS_ACK_ID,
          email,
          dataVariables: {
            firstName: firstName || "there",
            interests: interestLabels || "what we do",
          },
        }),
      });
      if (!ackRes.ok) {
        console.error("Loops acknowledgement failed", ackRes.status, await ackRes.text());
      }
    }

    return Response.redirect(`${origin}/thanks`, 303);
  } catch (err) {
    console.error("signup handler error", err);
    // Still thank them. Check the logs rather than showing an error page.
    return Response.redirect(`${origin}/thanks`, 303);
  }
};

export const onRequest: PagesFunction<Env> = async ({ request }) => {
  if (request.method === "POST") return new Response("Use onRequestPost", { status: 500 });
  return Response.redirect(`${new URL(request.url).origin}/contact`, 303);
};
