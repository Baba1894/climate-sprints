# CLIMATE SPRINTS
## Contact form — complete setup guide
### Cloudflare DNS · Loops · Cloudflare Pages · Testing

2 September 2026. **This document supersedes both earlier ones** — the Loops setup guide and the Loops IDs worksheet. Work from this one only.

Roughly 45 minutes. No code. The Pages Function is already written and in the repo at `functions/api/signup.ts`.

> Loops changes its interface from time to time. Menu names below are what to look for rather than exact labels. Where a screen does not match, the thing you need is in **bold**.

---

# PART 0 — WHAT YOU ARE BUILDING

Someone fills in the form on climatesprints.com. Five things then happen:

1. A hidden honeypot field is checked. If a bot filled it, the submission is silently discarded.
2. A contact is created or updated in Loops with sixteen properties.
3. They are subscribed to **General**, plus one list for each interest they ticked.
4. **You** get a notification with everything they entered.
5. **They** get an acknowledgement confirming receipt and saying you will reply within one business day.
6. They land on `climatesprints.com/thanks`.

If Loops is unreachable, steps 2 to 5 fail quietly and the visitor still reaches `/thanks`. That is deliberate. An error page loses a fund manager permanently; a logged failure loses them until you check the logs.

**Five things to collect as you go.** Write them down — you need all five in Part 5.

| | What | From |
|---|---|---|
| 1 | API key | Part 2, step 2.1 |
| 2 | Eight list IDs, assembled into one JSON line | Part 2, step 2.2 |
| 3 | Notification template ID | Part 3 |
| 4 | Acknowledgement template ID | Part 4 |
| 5 | Notify address — `practice@climatesprints.com` | already created |

---

# PART 1 — CLOUDFLARE DNS

Loops sends on your behalf. Without these records your mail lands in spam, and your entire audience is institutional inboxes, which run the strictest filters that exist.

## 1.1 Add the domain in Loops

Loops → Settings → **Sending domain** (or Domains). Add `climatesprints.com`.

Loops returns a set of DNS records. Typically:

- a **DKIM** record, CNAME or TXT, on a subdomain such as `loops._domainkey`
- a **return-path** or bounce CNAME, often on `bounce` or similar
- sometimes an **SPF** include

## 1.2 Add them in Cloudflare

Cloudflare dashboard → `climatesprints.com` → **DNS** → Records → Add record.

Enter exactly what Loops gives you. Then, for every one of them:

> ### Set the proxy status to **DNS only** — the grey cloud, not the orange one.
>
> Cloudflare proxies web traffic. Proxying an email authentication record breaks it, and it breaks silently: the record looks present, Loops reports it unverified or intermittently verified, and nothing tells you why. This is the single most common way this setup fails.

Return to Loops and wait for the domain to show **verified**. Usually minutes, occasionally an hour.

## 1.3 Add SPF if you do not already have one

Check for an existing TXT record on the root (`@`) starting `v=spf1`. If one exists, **edit it** — do not add a second. Two SPF records on one domain is an error condition and worse than none.

If Loops asks you to include them, the merged record looks like:

```
Type: TXT
Name: @
Content: v=spf1 include:_spf.google.com include:<what Loops gives you> ~all
Proxy: DNS only
```

Keep any existing includes, such as your mail provider's, and add the Loops one before `~all`.

## 1.4 Add DMARC

You almost certainly do not have one. Add it.

```
Type: TXT
Name: _dmarc
Content: v=DMARC1; p=none; rua=mailto:dmarc@climatesprints.com; adkim=r; aspf=r
Proxy: DNS only
```

`p=none` means observe, do not block. You will start receiving aggregate reports at `dmarc@` — machine-readable XML, not meant for human reading. After three or four weeks of clean reports, tighten to `p=quarantine`.

Do not start at `quarantine` or `reject`. If something is misconfigured you will silently block your own mail.

## 1.5 Verify

Wait ten minutes, then check at `mxtoolbox.com/dmarc.aspx` and `mxtoolbox.com/spf.aspx`. Both should resolve. If DKIM shows as missing, the usual cause is an orange cloud on the record.

---

# PART 2 — LOOPS: LISTS, PROPERTIES, KEY

## 2.1 API key

Loops → Settings → **API** → create a key.

Copy it immediately and put it in your password manager. It is shown once.

## 2.2 Create eight mailing lists

Loops → **Audience** → Lists. Create each, then record its ID.

| # | List name — visible to subscribers | Key | Loops list ID |
|---|---|---|---|
| 1 | Climate Sprints — General | `general` | |
| 2 | Technical and Commercial Diligence | `diligence` | |
| 3 | Portfolio Support | `portfolio` | |
| 4 | Climate Catalyst Mastermind | `mastermind` | |
| 5 | Momentum Sprints | `momentum` | |
| 6 | Alignment Sprints | `alignment` | |
| 7 | Fractional and Interim Executives | `fractional` | |
| 8 | Conversations | `conversations` | |

**The key column is not typed into Loops.** It is the label the code uses. Keep it exactly as printed.

**General exists so that someone who submits without ticking anything still lands somewhere reachable.** Without it you would hold their address with no route to it.

**There are no lists for who someone is.** No Capital list, no Founder list. A Loops list is a subscription the contact controls and can unsubscribe from. Nobody subscribes to *being* a family office, and if they unsubscribed from a list called Capital you would lose the most valuable fact you hold about them from a record you still have. Roles are stored as properties instead, in 2.3. You can still send only to family offices — Loops filters by property as easily as by list.

## 2.3 Assemble the JSON

Replace each `PASTE_ID` with the matching ID from the table. Keep it on **one line**. Every quote and comma matters.

```json
{"general":"PASTE_ID","diligence":"PASTE_ID","portfolio":"PASTE_ID","mastermind":"PASTE_ID","momentum":"PASTE_ID","alignment":"PASTE_ID","fractional":"PASTE_ID","conversations":"PASTE_ID"}
```

This is why there is one variable rather than eight. Adding or retiring a list later means editing this string — no new variable, no code change.

If the JSON is malformed the function logs an error and sets no lists. It does not crash, and the contact is still created.

## 2.4 Create sixteen contact properties

Loops → Settings → **Contact properties**. Type matters; the wrong type fails silently.

**Strings — five**

| Property | Holds |
|---|---|
| `company` | Company name, optional on the form |
| `source` | Always `climatesprints.com` |
| `roleType` | Readable list, e.g. "Angel, family office, fund or LP" |
| `interestSummary` | Readable list of everything ticked |
| `lookingAt` | The free-text field |

**Role booleans — four.** These replace the role lists.

| Property | True when they tick |
|---|---|
| `is_capital` | Angel, fund, family office or LP |
| `is_corpvc` | Corporate venture fund |
| `is_developer` | Commercial-scale developer |
| `is_founder` | Founder or CxO |

**Interest booleans — seven.** Deliberately redundant with the lists: the lists control what a person receives, the flags let you filter and count without touching subscriptions.

`want_diligence` · `want_portfolio` · `want_mastermind` · `want_momentum` · `want_alignment` · `want_fractional` · `want_conversations`

`firstName`, `lastName` and `email` already exist as standard fields. Do not recreate them.

---

# PART 3 — TRANSACTIONAL EMAIL 1: YOUR NOTIFICATION

Loops → **Transactional** → create a new transactional email.

**To:** yourself (the address is supplied by the code, so any placeholder is fine here)
**Subject:** `New enquiry — {{name}}, {{company}}`

**Body** — use these variable names exactly:

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

Publish it. Copy the **transactional ID**.

---

# PART 4 — TRANSACTIONAL EMAIL 2: THEIR ACKNOWLEDGEMENT

This is the one you asked for, and you were right to.

The `/thanks` page already confirms receipt on screen, but an email does three things a page cannot. It puts your address in their inbox, so they can reply directly. It survives them closing the tab. And it is a real send to a real engaged address, which is the best deliverability signal there is.

It is **transactional, not marketing** — triggered by their own action, carrying no promotional content — so it raises no consent question.

Loops → **Transactional** → create a second email.

**Subject:** `Received — Climate Sprints`
**Reply-to:** `practice@climatesprints.com` — set this, or replies go nowhere.

**Body:**

```
{{firstName}},

Thank you. Your details arrived and we will only send what you asked for.

This is an automatic confirmation. A reply from me follows within one
business day, from a person rather than from a sequence.

If it is easier to just talk, thirty minutes is here:
https://calendly.com/marcstrauch

Marc Strauch
Founding principal, Climate Sprints
practice@climatesprints.com
climatesprints.com
```

Publish it. Copy the **transactional ID** — this is a different ID from Part 3.

> **On "within one business day."** That is a commitment. It is achievable for a one-person practice and it is worth making, because responsiveness is one of the few things you can demonstrate before anyone has bought anything. If you would rather not commit, replace the sentence with "A reply from me follows shortly." Do not write "24 hours" — it fails every weekend.

Two variables are available: `{{firstName}}`, which falls back to "there" when no name was given, and `{{interests}}`, which falls back to "what we do". The draft above uses only the first. Keep it that way unless you want the email to restate their selections back to them, which reads more like a receipt than a note from a person.

---

# PART 5 — CLOUDFLARE PAGES VARIABLES

Cloudflare dashboard → your Pages project → Settings → **Variables and Secrets**.

Add all five to **Production**. Add them to **Preview** as well if you want the form working on preview deployments.

| Variable | Type | Value |
|---|---|---|
| `LOOPS_API_KEY` | **Secret** | from Part 2.1 |
| `LOOPS_LISTS` | Text | the one-line JSON from Part 2.3 |
| `LOOPS_TRANSACTIONAL_ID` | Text | from Part 3 |
| `LOOPS_ACK_ID` | Text | from Part 4 |
| `NOTIFY_EMAIL` | Text | `practice@climatesprints.com` |

> `LOOPS_API_KEY` must be **Secret**, not Text. A Text value is readable by anyone with dashboard access and appears in build logs. A leaked Loops key lets someone send mail as you.

---

# PART 6 — REDEPLOY

Environment variables are read at deploy time. The running deployment will not see them.

Push any commit, or use **Retry deployment** on the latest build in the Pages dashboard.

Skipping this step is the most common reason a correct setup appears not to work.

---

# PART 7 — TEST

1. Open `climatesprints.com/contact` in a **private window**. Fill in the form with a real address you can check. Tick two or three interests. Write something in the free-text field.
2. Submit. You should land on `climatesprints.com/thanks`.
3. **Your notification** should arrive at `practice@` within a minute, with every field populated.
4. **Their acknowledgement** should arrive at the address you entered. Check it is not in spam — if it is, Part 1 is incomplete.
5. **Loops → Audience.** The contact should exist with the properties filled, the right booleans true, and membership of General plus one list per interest ticked.
6. Submit again with the same address and a different set of tick-boxes. It should **update** the existing contact, not create a second one.

---

# PART 8 — WHEN SOMETHING IS WRONG

**Notification arrives, contact does not.** The transactional template is fine and a property name is wrong. Check the spelling in Part 2.4 character by character.

**Contact arrives, on no lists.** The JSON in `LOOPS_LISTS` is malformed or an ID is wrong. Paste it into any JSON validator.

**Neither arrives.** Cloudflare → your Pages project → **Functions → Real-time logs**, then submit the form while watching. The handler logs the Loops response body on any failure, which names the problem.

**Acknowledgement goes to spam.** DKIM or SPF incomplete, or an orange cloud on a DNS record. Recheck Part 1.2.

**Everything looks right and nothing happens.** You did not redeploy. Part 6.

**Form submits but nothing at all is logged.** The function is not deployed. Confirm `functions/api/signup.ts` is in the repo at that exact path — Pages discovers functions by directory structure, and a function in the wrong folder simply does not exist.

---

# PART 9 — WHAT THIS DELIBERATELY DOES NOT DO

**No double opt-in.** The form sets `subscribed: true` directly. That is defensible under legitimate interest for someone who filled in a form asking for information, and it matches what the privacy notice says. If you begin sending into Germany or Austria in volume, revisit — the practical standard there is stricter than the law.

**No CAPTCHA.** The honeypot handles the volume you will see. If real spam starts arriving, Cloudflare Turnstile is the right addition and it is free.

**No sequences.** The acknowledgement is a single transactional send. Nurture sequences are a separate piece of work and should not be built until the outbound strategy is settled.

---

# CHECKLIST

- [ ] Loops sending domain added, DNS records entered in Cloudflare
- [ ] Every Loops DNS record set to **DNS only / grey cloud**
- [ ] SPF present and merged, not duplicated
- [ ] DMARC added at `_dmarc`, `p=none`
- [ ] Domain shows verified in Loops
- [ ] API key created and stored
- [ ] Eight lists created, IDs recorded
- [ ] JSON assembled and validated
- [ ] Sixteen properties created with correct types
- [ ] Notification template published, ID recorded
- [ ] Acknowledgement template published, reply-to set, ID recorded
- [ ] Five variables added in Cloudflare, API key as **Secret**
- [ ] Redeployed
- [ ] Test submission passes all six checks in Part 7
- [ ] Repeat submission updates rather than duplicates
