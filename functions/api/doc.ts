/**
 * Climate Sprints — gated document delivery.
 * Cloudflare Pages Function. Lives at functions/api/doc.ts, serves GET /api/doc.
 *
 * v1 — 11 September 2026.
 * v2 — 16 September 2026. Method editions to v1.4.2, Sample to v1.3.1. Stored
 *      filenames now carry a random token so they cannot be guessed.
 *
 * A request for the assessment method produces a signed, expiring link rather
 * than an attachment. This endpoint validates that link and streams the PDF.
 *
 * The link carries edition, requester email and expiry, signed with HMAC-SHA256.
 * Changing any of the three invalidates the signature, so a link cannot be
 * edited to reach the other edition or to extend its own life.
 *
 * Environment variables:
 *   DOC_SIGNING_KEY   Secret  the same key signup.ts signs with. If the two
 *                             differ, every link fails closed.
 *
 * WHAT THIS DOES AND DOES NOT DO
 *   It does: expire after seven days, bind the link to the address that asked
 *   for it, log every access with that address, and keep the filename out of
 *   public view.
 *   It does not: stop a determined person forwarding a live link within the
 *   window. The PDFs sit in the deployed site and are served from here; without
 *   object storage behind a private bucket, an unguessable path plus a signature
 *   is the honest limit of what a static host can enforce.
 */

interface Env {
  DOC_SIGNING_KEY?: string;
}

/** Edition key to the file served. Rename here when a version ships;
 *  live links keep working because the signature covers the edition, not
 *  the filename. The stored filename carries a random token: the PDFs are
 *  static files, so an unguessable name is part of the protection. When a
 *  new version ships, give its file a new token. */
const EDITIONS: Record<string, { path: string; filename: string }> = {
  allocator: {
    path: "/docs/private/cs-method-allocator-v1-4-2-43f4579ee8cc3b98.pdf",
    filename: "Climate_Sprints_Assessment-Methodology_v1.4.2_(2026.09.16).pdf",
  },
  founder: {
    path: "/docs/private/cs-method-founder-v1-4-2-01fd7a0b2f64bbc7.pdf",
    filename: "Climate_Sprints_Assessment-Guide-for-Founders_v1.4.2_(2026.09.16).pdf",
  },
  sample: {
    path: "/docs/private/cs-sample-assessment-v1-3-1-6a62593dbd3820ec.pdf",
    filename: "Climate_Sprints_Sample-Assessment_v1.3.1_(2026.09.16).pdf",
  },
};

function deny(reason: string, origin: string) {
  console.log(`[doc] denied (${reason})`);
  return Response.redirect(`${origin}/method?doc=expired`, 302);
}

/** Constant-time comparison. A timing-safe check costs nothing here and
 *  removes an entire class of question. */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const origin = url.origin;

  if (!env.DOC_SIGNING_KEY) {
    console.error("[doc] DOC_SIGNING_KEY not set — refusing every request");
    return deny("no signing key", origin);
  }

  const edition = url.searchParams.get("d") || "";
  const exp = url.searchParams.get("e") || "";
  const email = url.searchParams.get("m") || "";
  const sig = url.searchParams.get("s") || "";

  const doc = EDITIONS[edition];
  if (!doc) return deny(`unknown edition ${edition}`, origin);
  if (!exp || !email || !sig) return deny("incomplete link", origin);

  const expiry = parseInt(exp, 10);
  if (!Number.isFinite(expiry)) return deny("bad expiry", origin);
  if (Math.floor(Date.now() / 1000) > expiry) return deny(`expired for ${email}`, origin);

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.DOC_SIGNING_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${edition}|${email}|${expiry}`),
  );
  const expected = [...new Uint8Array(mac)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (!safeEqual(expected, sig.toLowerCase())) return deny(`bad signature for ${email}`, origin);

  // Valid. Log who opened what, then stream the file under its proper name.
  console.log(`[doc] served ${edition} to ${email}`);

  const file = await fetch(`${origin}${doc.path}`);
  if (!file.ok) {
    console.error(`[doc] source missing at ${doc.path}`);
    return deny("source missing", origin);
  }

  return new Response(file.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${doc.filename}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
};
