/**
 * Climate Sprints — contact form handler.
 * Cloudflare Pages Function. Lives at functions/api/signup.ts, serves POST /api/signup.
 *
 * Environment variables (Pages → Settings → Variables and Secrets):
 *   LOOPS_API_KEY           Secret  from Loops → Settings → API
 *   LOOPS_LISTS             Text    JSON map of interest key → Loops list ID
 *   LOOPS_TRANSACTIONAL_ID  Text    template that notifies you of a new enquiry
 *   LOOPS_ACK_ID            Text    template that acknowledges receipt to the enquirer
 *   NOTIFY_EMAIL            Text    where your notification goes
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
}

const LOOPS = "https://app.loops.so/api/v1";

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
  conversations: "Conversations, guest inquiry",
};

/** Form value to the boolean property name written to Loops. */
const ROLE_FLAG: Record<string, string> = {
  fund: "is_capital",
  cvc: "is_corpvc",
  developer: "is_developer",
  founder: "is_founder",
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = new URL(request.url).origin;

  try {
    const form = await request.formData();

    // Honeypot. Real people leave it empty; bots fill everything.
    if ((form.get("website") as string | null)?.trim()) {
      return Response.redirect(`${origin}/thanks`, 303);
    }

    const email = ((form.get("email") as string) || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return Response.redirect(`${origin}/contact?error=email`, 303);
    }

    const firstName = ((form.get("firstName") as string) || "").trim();
    const lastName = ((form.get("lastName") as string) || "").trim();
    const company = ((form.get("company") as string) || "").trim();
    const lookingAt = ((form.get("context") as string) || "").trim().slice(0, 2000);

    const roles = form.getAll("role").map(String);
    const interests = form.getAll("interest").map(String);

    const roleLabels = roles.map((r) => ROLES[r] || r).join(", ");
    const interestLabels = interests.map((i) => INTERESTS[i] || i).join(", ");

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
    for (const key of Object.keys(INTERESTS)) {
      properties[`want_${key}`] = interests.includes(key);
    }
    if (Object.keys(mailingLists).length) properties.mailingLists = mailingLists;

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.LOOPS_API_KEY}`,
    };

    const contactRes = await fetch(`${LOOPS}/contacts/update`, {
      method: "PUT",
      headers,
      body: JSON.stringify(properties),
    });
    if (!contactRes.ok) {
      console.error("Loops contact failed", contactRes.status, await contactRes.text());
    }

    // ---- notify. Separate call so a template problem cannot lose the contact.
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
          },
        }),
      });
      if (!notifyRes.ok) {
        console.error("Loops transactional failed", notifyRes.status, await notifyRes.text());
      }
    }

    // ---- acknowledge to the person who submitted. Transactional, not marketing:
    //      triggered by their own action and carrying no promotional content.
    if (env.LOOPS_ACK_ID) {
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
