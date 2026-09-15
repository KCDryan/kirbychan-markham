# CHANGES v3

Removes the last thing in the repo that could interfere with a Cloudflare Pages build. The site
code itself is unchanged from v2 and still builds clean.

**The real fix for your failed deploy is one field in the Cloudflare dashboard.** See below. You do
not strictly need this zip to get the site live, but you should take it, because the file it
removes is what put Cloudflare into the mode that skipped your build.

---

## Summary

| | |
| --- | --- |
| Files added | 2 |
| Files changed | 2 |
| Files deleted | 1 |

**`wrangler.toml` must be deleted in GitHub by hand.** Uploading adds and overwrites but never
deletes and leaving it there reproduces the failure.

---

## What went wrong, in order

Three separate problems, none of them the same as the last.

**Attempt 1, the build failed.** Unquoted YAML containing a colon. Fixed in v2.

**Attempt 2, the deploy failed.** `Executing user deploy command: npx wrangler deploy` followed by
`Missing entry-point to Worker script or to assets directory`. That project was a **Worker**, not a
Pages project. Pages projects never run a deploy command. Workers Builds does and its default is
`npx wrangler deploy`, which expects a Worker script and finds a static site.

**Attempt 3, the build was skipped.** On the Pages project the log reads:

```
Found wrangler.toml file. Reading build configuration...
No build command specified. Skipping build step.
Error: Output directory "dist" not found.
```

Two causes stacked. The Pages project has no build command set, so `npm run build` never ran and
`dist` never existed. And because a `wrangler.toml` sat in the repo root, Cloudflare switched into
its beta mode of reading build configuration from that file, where a Pages build command cannot be
expressed at all.

---

## Files deleted

| File | Why |
| --- | --- |
| `wrangler.toml` | Its presence makes Cloudflare Pages read build config from the file rather than the dashboard. A dashboard configured Pages project does not need it. **Delete this in GitHub too** |

## Files added

| File | Why |
| --- | --- |
| `wrangler.example.toml` | The same config, renamed so Cloudflare ignores it. Copy it to `wrangler.toml` when you want to run `npx wrangler pages dev dist` locally, then delete it again before committing. The header of the file explains this |
| `CHANGES-v3.md` | This file |

## Files changed

| File | Change |
| --- | --- |
| `README.md` | The Cloudflare section now warns that the create screen defaults to Workers, calls out the build command as the setting people miss, lists the four log lines a healthy build contains and explains the wrangler file trap. `NODE_VERSION` corrected from 20 to 22 |
| `functions/api/lead.ts` | Restored to its self contained v2 form. No behaviour change |

---

## Fix your Cloudflare project

Keep the **Pages** project. Delete the Workers one if you still have it, so you are not watching
two projects fail for different reasons.

In the Pages project, go to **Settings > Build**:

| Setting | Value |
| --- | --- |
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | blank |

Then **Settings > Variables and secrets**, add `NODE_VERSION` = `22`.

Push this version or just hit **Retry deployment**. Your build log should then contain:

```
Installing project dependencies: npm clean-install
Executing user build command: npm run build
[build] 42 page(s) built
Found Functions directory at /functions. Uploading.
```

If `Executing user build command` is missing, the build command field is still empty.

---

## One more thing

Your repository is named `kirbychanmarkham-site-v2`, after the zip file rather than the project. It
works and the repository name has nothing to do with the domain, but it will read oddly in six
months. Renaming it in GitHub under **Settings > Repository name** is safe. Cloudflare follows the
rename automatically.
