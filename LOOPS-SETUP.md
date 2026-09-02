# LOOPS SETUP — climatesprints.com contact form

Do these in order. Steps 1–5 are in Loops, 6–7 are in Cloudflare, 8 is the test.

Roughly 30 minutes. The Pages Function is already written and in the repo at
`functions/api/signup.ts` — you do not need to touch code.

> Loops changes its interface periodically. Menu names below are what to look
> for rather than exact labels; the API endpoints in the function are the stable
> part. If a screen does not match, the thing you need is named in bold.

---

## 1 · Verify your sending domain

Loops → Settings → **Sending domain** (or Domains).

Add `climatesprints.com` and Loops will give you DNS records — normally a DKIM
CNAME or TXT, a return-path CNAME, and possibly an SPF include.

Add them in Cloudflare → DNS for the domain. **Set the proxy status to DNS only
(grey cloud) for every record Loops gives you.** Proxying an email
authentication record breaks it, and this is the single most common reason a
setup silently fails.

Wait for Loops to show the domain verified. Usually minutes, occasionally an hour.

**Also add a DMARC record** if there isn't one, since without it deliverability
to institutional inboxes suffers and your audience is entirely institutional
inboxes:

```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@climatesprints.com
```

Start at `p=none` so you observe rather than block. Tighten to `quarantine`
after a few weeks of clean reports.

---

## 2 · Create the mailing list

Loops → **Audience** → Lists → create a list.

Name it something durable like `Climate Sprints — general`. Copy the **list ID**.
It is usually visible in the URL or in the list settings.

**Save it. You need it in step 6.**

---

## 3 · Create the custom contact properties

Loops → Settings → **Contact properties**.

Create each of these. Type matters — get it wrong and the value silently fails to
write.

| Property name | Type |
|---|---|
| `company` | string |
| `source` | string |
| `roleType` | string |
| `interestSummary` | string |
| `lookingAt` | string |
| `want_diligence` | boolean |
| `want_portfolio` | boolean |
| `want_mastermind` | boolean |
| `want_momentum` | boolean |
| `want_alignment` | boolean |
| `want_fractional` | boolean |
| `want_conversations` | boolean |

`firstName`, `lastName` and `email` already exist as standard fields.

The seven booleans are the reason for doing this properly rather than dumping
everything into one text field. They let you send the Mastermind note only to
people who ticked Mastermind, which is the difference between a list you can use
and a list you can only blast.

---

## 4 · Create the notification template

Loops → **Transactional** → create a new transactional email.

Send it to yourself. Subject something like `New enquiry — {{name}}, {{company}}`.

Body, using these exact variable names:

```
{{name}}
{{contactEmail}}
{{company}}

They are: {{roleType}}
Interested in: {{interests}}

What they are looking at:
{{lookingAt}}

Submitted {{submittedAt}}
```

Publish it, then copy the **transactional ID**. Save it for step 6.

---

## 5 · Get the API key

Loops → Settings → **API**. Create a key, copy it once, store it in a password
manager. It will not be shown again.

---

## 6 · Add the four variables in Cloudflare

Cloudflare dashboard → your Pages project → Settings → **Variables and Secrets**.

Add all four to the **Production** environment. Add them to Preview as well if
you want the form to work on preview deployments.

| Name | Type | Value |
|---|---|---|
| `LOOPS_API_KEY` | **Secret** | the key from step 5 |
| `LOOPS_LIST_ID` | Plain text | the list ID from step 2 |
| `LOOPS_TRANSACTIONAL_ID` | Plain text | the ID from step 4 |
| `NOTIFY_EMAIL` | Plain text | where enquiries should land |

`LOOPS_API_KEY` must be a **Secret**, not plain text. A plain-text value is
visible to anyone with dashboard access and appears in build logs.

---

## 7 · Redeploy

Environment variables are read at deploy time, so the existing deployment will
not see them. Push any commit, or use **Retry deployment** on the latest build.

---

## 8 · Test it

1. Open `climatesprints.com/contact`, fill the form with a real address you can
   check, tick two or three interests, write something in the free-text field.
2. Submit. You should land on `climatesprints.com/thanks`.
3. Check the notification arrived at `NOTIFY_EMAIL`.
4. Check Loops → Audience. The contact should exist with `company`, `roleType`,
   `interestSummary`, `lookingAt` populated and the right booleans set true.
5. Submit again with the same address and a different set of tick-boxes. It
   should update the existing contact rather than create a duplicate.

**If the notification arrives but the contact does not**, the transactional
template is fine and a custom property name is wrong. Check spelling in step 3
against the table exactly.

**If neither arrives**, check Cloudflare → your Pages project → **Functions →
Real-time logs** while you submit. The handler logs the Loops response body on
failure, which will name the problem.

---

## How it behaves

The visitor always reaches `/thanks`, even if Loops is down or a key is wrong.
That is deliberate. Showing an error page to a fund manager loses the lead
permanently; a silent failure that you find in the logs loses it temporarily.
Check the logs after any change.

There is a honeypot field named `website`, hidden off-screen. Bots fill every
field they find; people never see it. A submission with that field populated is
silently discarded.

---

## What this does not do yet

**No double opt-in.** The form sets `subscribed: true` directly. That is
defensible under legitimate interest for someone who filled in a form asking for
information, and it matches what the privacy notice says. If you start sending
to Germany or Austria in volume, revisit — those markets expect confirmed opt-in
and the standard is stricter than the law.

**No reCAPTCHA.** The honeypot handles the volume you will get. If you start
seeing real spam, Cloudflare Turnstile is the right addition and it is free.

**No auto-reply to the enquirer.** Worth adding once the sequences exist. For now
a personal reply from you is better than an automated one, given the audience.
