/**
 * Climate Sprints — contact form handler.
 * Cloudflare Pages Function. Lives at functions/api/signup.ts, serves POST /api/signup.
 *
 * Environment variables (Pages → Settings → Variables and Secrets):
 *   LOOPS_API_KEY          secret   from Loops → Settings → API
 *   LOOPS_LIST_ID          plain    the mailing list contacts are subscribed to
 *   LOOPS_TRANSACTIONAL_ID plain    the transactional template that notifies you
 *   NOTIFY_EMAIL           plain    where the notification goes
 *
 * Behaviour: the visitor always gets a confirmation, even if Loops is down.
 * A failed submission is logged, never shown. Losing a lead to a 500 page is
 * worse than losing it to a silent retry.
 */

interface Env {
  LOOPS_API_KEY: string;
  LOOPS_LIST_ID: string;
  LOOPS_TRANSACTIONAL_ID: string;
  NOTIFY_EMAIL: string;
}

const LOOPS = "https://app.loops.so/api/v1";

const ROLES: Record<string, string> = {
  fund: "Angel, fund, family office or LP",
  cvc: "Corporate venture fund",
  developer: "Commercial-scale developer",
  founder: "Founder or CxO",
};

const INTERESTS: Record<string, string> = {
  diligence: "Diligence",
  portfolio: "Portfolio support",
  mastermind: "Mastermind 1Q2027",
  momentum: "Momentum Sprints",
  alignment: "Alignment Sprints",
  fractional: "Fractional or interim",
  conversations: "Conversations guest",
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
    const context_ = ((form.get("context") as string) || "").trim().slice(0, 2000);

    const roles = form.getAll("role").map(String);
    const interests = form.getAll("interest").map(String);

    const roleLabels = roles.map((r) => ROLES[r] || r).join(", ");
    const interestLabels = interests.map((i) => INTERESTS[i] || i).join(", ");

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.LOOPS_API_KEY}`,
    };

    // 1 — create or update the contact, with each interest as its own boolean
    //     so Loops can segment on them later.
    const properties: Record<string, unknown> = {
      email,
      firstName,
      lastName,
      company,
      source: "climatesprints.com",
      roleType: roleLabels,
      interestSummary: interestLabels,
      lookingAt: context_,
      subscribed: true,
    };
    for (const key of Object.keys(INTERESTS)) {
      properties[`want_${key}`] = interests.includes(key);
    }
    if (env.LOOPS_LIST_ID) {
      properties.mailingLists = { [env.LOOPS_LIST_ID]: true };
    }

    const contactRes = await fetch(`${LOOPS}/contacts/update`, {
      method: "PUT",
      headers,
      body: JSON.stringify(properties),
    });
    if (!contactRes.ok) {
      console.error("Loops contact failed", contactRes.status, await contactRes.text());
    }

    // 2 — notify. Separate call so a template problem cannot lose the contact.
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
            lookingAt: context_ || "(nothing written)",
            submittedAt: new Date().toISOString(),
          },
        }),
      });
      if (!notifyRes.ok) {
        console.error("Loops transactional failed", notifyRes.status, await notifyRes.text());
      }
    }

    return Response.redirect(`${origin}/thanks`, 303);
  } catch (err) {
    console.error("signup handler error", err);
    // Still thank them. Check the logs rather than showing an error page.
    return Response.redirect(`${origin}/thanks`, 303);
  }
};

// Anything other than POST goes back to the contact page.
export const onRequest: PagesFunction<Env> = async ({ request }) => {
  if (request.method === "POST") return new Response("Use onRequestPost", { status: 500 });
  return Response.redirect(`${new URL(request.url).origin}/contact`, 303);
};
