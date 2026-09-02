# DEPLOY — climatesprints.com

Static HTML. No build step, no dependencies, no node_modules. Every file in this
folder is the file that gets served.

---

## 1. Put the files in the repo

Copy the **contents** of this folder into the root of the repo, not the folder
itself. The repo root should look like this:

```
index.html
diligence.html
portfolio.html
momentum.html
alignment.html
fractional.html
mastermind.html
approach.html
practice.html
conversations.html
questions.html
thanks.html
contact.html
colophon.html
terms.html
privacy.html
disclaimer.html
404.html
robots.txt
sitemap.xml
llms.txt
_headers
_redirects
functions/
  api/signup.ts
assets/
  site.css
  sdg-wheel.png
  plates/*.jpg
```

Then:

```bash
cd /path/to/repo
git add -A
git commit -m "Site v3: full page set, USGS plates, SDG mark, Calendly CTAs"
git push origin main
```

---

## 2. Cloudflare Pages settings

In the Pages project, under **Settings → Builds & deployments**:

| Field | Value |
|---|---|
| Framework preset | **None** |
| Build command | *(leave empty)* |
| Build output directory | `/` |
| Root directory | `/` |

If Pages is already connected to the repo, the push in step 1 triggers a deploy.
First build takes under a minute because nothing is compiled.

**`_headers` and `_redirects`** are read automatically by Pages. They must sit at
the build output root, which they do.

---

## 3. Clean URLs

Internal links are written as `diligence.html` so the site works when you open it
from your Downloads folder. Cloudflare Pages serves `/diligence` and issues a 301
from `/diligence.html` to `/diligence` automatically, so links work either way —
they just take one extra hop.

If you want to remove that hop before launch, from the repo root:

```bash
# strip .html from internal links (macOS sed)
sed -i '' -E 's/href="([a-z0-9-]+)\.html"/href="\/\1"/g' *.html
sed -i '' 's|href="/index"|href="/"|g' *.html
```

Do this only when you are done reviewing locally, because it breaks `file://`
browsing.

---

## 4. Redirects from the two retiring domains

`_redirects` in this folder handles paths **within** climatesprints.com. The
domain-level 301s are configured separately, in the Cloudflare dashboard:

**Rules → Bulk Redirects → Create list**

| Source | Target | Status |
|---|---|---|
| `https://climatecatalystmastermind.com/*` | `https://climatesprints.com/mastermind` | 301 |
| `https://www.climatecatalystmastermind.com/*` | `https://climatesprints.com/mastermind` | 301 |
| `https://climatecatalystspodcast.com/*` | `https://climatesprints.com/conversations` | 301 |
| `https://www.climatecatalystspodcast.com/*` | `https://climatesprints.com/conversations` | 301 |

Enable **Subpath matching** and **Preserve query string**. Keep both domains
registered.

---

## 5. What does not work yet

Deploy this, but do not send it to anyone on the list until these are closed.

**The form is built but not configured.** `functions/api/signup.ts` is in the
repo and handles the POST. It will not work until the four environment variables
are set in Cloudflare. Follow `CONTACT-FORM-SETUP.md` — about forty-five minutes, no code. It covers Cloudflare DNS, Loops, the Pages variables and the test.

**GA4 has no measurement ID.** The consent gate is built and working, but
`assets/consent.js` line 6 holds a placeholder: `var GA_ID = 'G-XXXXXXXXXX'`.
Until you replace it, the script deliberately no-ops even on accept, so nothing
loads and nothing breaks. Drop in the real ID when you have it and the gate starts
working as intended: no tag before consent, decline as easy as accept, and a
"Cookie settings" link in the footer that clears the stored choice and reopens the
banner.

**Placeholders are visible on the live page.** Everything in red on the site is an
input that has not arrived: fee figures, prior affiliations for the bench, two
LinkedIn URLs, the legal entity name and address, the Calendly embed on the contact
page, and the sample assessment link.

Until those are closed, protect the deployment: **Settings → General → Access
policy**, or leave the custom domain pointed at a holding page and review on the
`*.pages.dev` preview URL.

---

## 6. After launch

- Submit `sitemap.xml` in Google Search Console and Bing Webmaster Tools.
- Verify the two retired domains actually 301 rather than resolving to their old
  hosts, which can take a DNS cycle.
- Check `climatesprints.com/404` renders the styled 404 rather than a Cloudflare
  default.

---

## 7. Social card

`assets/og.jpg` is 1200x630 and is referenced from every page via `og:image` and
`twitter:image`. Test it before sending any link:

- LinkedIn: https://www.linkedin.com/post-inspector/
- Facebook: https://developers.facebook.com/tools/debug/
- X: https://cards-dev.twitter.com/validator

Both LinkedIn and Facebook cache aggressively. If you change the card, rename the
file and update the meta tags, or the old image keeps showing for weeks.

`og.html` is the template it was rendered from. It is not linked from the site and
is excluded from the sitemap, but it is worth keeping in the repo so the card can be
regenerated. Screenshot it at 1200x630 at 2x and downscale.

---

## 8. Notes on assets

Plates are 1800px wide JPEGs at quality 66, roughly 250KB each, one per page and
two on Diligence, Approach and Practice. They are cached for a year via `_headers`,
so if you replace one, rename the file or the browser will keep serving the old one.

`assets/site.css` is the only stylesheet. Every page links to it. Change a token at
the top and it changes everywhere.
