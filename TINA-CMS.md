# TinaCMS (test)

A visual editor for blog posts, the English pillar guides and the neighbourhood pages. It lives on
the `tina-cms-test` branch only. Nothing here is on `main` or the live site.

## What it edits

| Collection | Files | Not included |
| --- | --- | --- |
| Blog posts | `src/content/blog/*.mdx` | |
| Guides (English) | `src/content/guides/*.mdx` | the `fa`, `fr` and `zh` translations |
| Neighbourhoods | `src/content/neighbourhoods/*.mdx` | |

Services, videos, market reports, news, `src/data/` and `src/i18n/` are deliberately left out.

## Try it on this computer (no account needed)

```bash
npm run dev:cms
```

Then open `http://localhost:4321/admin/index.html`. Saves write straight to the files on disk. Run
`git diff` to see what changed and `git checkout -- src/content` to throw the edits away.

## Try it on a Cloudflare preview

1. Create a free project at [app.tina.io](https://app.tina.io), connect the GitHub repository and
   allow the `tina-cms-test` branch.
2. Copy the project's **Client ID** and a **read only token**.
3. In the Cloudflare Pages project, under **Settings > Variables and secrets**, add to **Preview**
   only: `TINA_CLIENT_ID` (plain) and `TINA_TOKEN` (secret). Do not add them to Production.
4. Retry the latest `tina-cms-test` deployment. The editor appears at
   `<preview-url>/admin/index.html`.

The editor commits to the branch it was built from, so edits on the preview land on
`tina-cms-test`, never on `main`.

## What we learned testing it

- **Body text survives a save.** Every blog post, guide and neighbourhood page was loaded and saved
  back through Tina. The words, links, tables and the `<GuideCta>` blocks were all preserved and
  `npm run verify` still passed.
- **Tina reformats the file.** It switches YAML quotes, pads tables to line up, writes bullets as `*`
  and saves dates as full timestamps. The rendered pages are the same, but the first save of each
  file produces a large diff. `scripts/check-blog.mjs` now compares only the date part.
- **Tina does not enforce the house style.** Em dashes, commas before "and" or "or", title lengths
  and sources are only checked by `npm run verify`. Before any of this goes near `main`, the
  Cloudflare build command should run the checks so a bad edit fails instead of going live.
- **Every field must be listed in `tina/config.ts`.** Tina drops any frontmatter field it does not
  know about when it saves. If a field is added to `src/content.config.ts`, add it here too.
