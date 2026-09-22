# TinaCMS (test)

A visual editor for agents' quick posts, at
`https://kirbychanmarkham.com/admin/index.html`. **A save commits straight to `main` and goes live
within minutes.** The Cloudflare build runs the house style and blog checks first, so an edit that
breaks them fails to deploy and the site keeps its last good version.

## What it edits

Only **Quick posts (agents)**, the files in `src/content/blog/quick/`. Full blog posts, guides,
neighbourhood pages and everything else are edited in the repository, so an agent cannot change
them from the editor.

## Quick posts for agents

A short form: headline, summary, category, author, date and the post, plus optional quick answer box, FAQ, sources and related neighbourhoods and services so a quick post can carry every section a full post has. `AGENT-BLOG-PROMPT.md` is a prompt that has Claude or ChatGPT produce each part in the right format. Everything else is derived in
`src/content.config.ts`, so a quick post renders with the same layout as a full post and shows the
agent's name in the byline and in the `BlogPosting` author. `scripts/check-blog.mjs` applies lighter
rules to quick posts (300 words minimum, a real summary, an author, a unique address) and the house
style check applies as usual. The steps for agents are in `AGENT-BLOG-GUIDE.md`.

## Try it on this computer (no account needed)

```bash
npm run dev:cms
```

Then open `http://localhost:4321/admin/index.html`. Saves write straight to the files on disk. Run
`git diff` to see what changed and `git checkout -- src/content` to throw the edits away.

## Turn it on for the live site

1. Create a free project at [app.tina.io](https://app.tina.io), connect the GitHub repository and
   index the `main` branch. Add `https://kirbychanmarkham.com` under Site URLs.
2. Copy the project's **Client ID** and a **read only token**.
3. In the Cloudflare Pages project, under **Settings > Variables and secrets**, add to
   **Production**: `TINA_CLIENT_ID` (plain) and `TINA_TOKEN` (secret).
4. Retry the latest production deployment. The editor appears at `/admin/index.html`.

The editor commits to the branch it was built from, which for the live site is `main`. If a save
publishes something wrong, revert that commit on GitHub or use **Rollback** in Cloudflare.

## What we learned testing it

- **Body text survives a save.** Every blog post, guide and neighbourhood page was loaded and saved
  back through Tina. The words, links, tables and the `<GuideCta>` blocks were all preserved and
  `npm run verify` still passed.
- **Tina reformats the file.** It switches YAML quotes, pads tables to line up, writes bullets as `*`
  and saves dates as full timestamps. The rendered pages are the same, but the first save of each
  file produces a large diff. `scripts/check-blog.mjs` now compares only the date part.
- **Tina does not enforce the house style in the editor.** Em dashes, commas before "and" or
  "or", title lengths and sources are checked when Cloudflare builds, so a bad edit is saved to
  GitHub but fails to deploy. Fix it in Tina and save again.
- **Every field must be listed in `tina/config.ts`.** Tina drops any frontmatter field it does not
  know about when it saves. If a field is added to `src/content.config.ts`, add it here too.
