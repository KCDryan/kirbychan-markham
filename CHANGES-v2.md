# CHANGES v2

Fixes the Cloudflare build failure, plus a rendering bug that affected the heading on every page.

**This version is verified.** Clean `npm ci` on Node 22.11, then `astro check` at 0 errors, 0
warnings and 0 hints, then a build producing 42 pages, then a link check finding 0 broken links out
of 1,723. All 121 JSON-LD blocks parse as valid JSON.

---

## Summary

| | |
| --- | --- |
| Files added | 4 |
| Files changed | 16 |
| Files deleted | 0 |

Nothing is deleted, so you can upload straight over the top of v1 without removing anything in
GitHub by hand.

---

## Why the Cloudflare build failed

```
bad indentation of a mapping entry
  Location: src/content/services/investors.mdx:21:125
```

Two MDX files had a frontmatter value containing a colon followed by a space, with the value left
unquoted. YAML reads `... candidates: Milliken Mills` as the start of a nested map rather than as
prose, so the parser gave up before Astro ever ran.

Both values are now wrapped in double quotes. I also scanned every frontmatter line in all 26
content files for the same shape. These two were the only occurrences.

---

## Files added

| File | Why |
| --- | --- |
| `package-lock.json` | **The most important file in this release.** Its absence is why Cloudflare's log shows `bun install` and `nodejs@24.18.0` instead of npm and Node 22. With the lockfile committed, Cloudflare uses npm and installs exactly the versions that were tested |
| `.nvmrc` | Pins Node 22 so the Cloudflare build matches the local one without needing a dashboard setting |
| `src/components/Accent.astro` | One shared component for the italic accent word in headings. Replaces ten copies of the same hand rolled block |
| `CHANGES-v2.md` | This file |

## Files changed

### The build failure

| File | Change |
| --- | --- |
| `src/content/services/investors.mdx` | Quoted the FAQ answer containing `candidates: Milliken Mills` |
| `src/content/services/new-construction.mdx` | Quoted the FAQ answer containing `does not: delays` |

### The heading bug

Every H1 built from a title plus an accent word rendered with a stray space, because the accent
was split across multiple lines and Astro follows JSX whitespace rules. The Unionville page read:

```
Living in Unionville , Markham
```

Note the space before the comma. It also caused the comma to wrap onto its own line. All ten files
that used that pattern now call the shared `Accent` component, which keeps the three pieces on one
line and cannot reintroduce the space.

| File | Change |
| --- | --- |
| `src/layouts/NeighbourhoodLayout.astro` | Uses `Accent` |
| `src/layouts/ArticleLayout.astro` | Uses `Accent` |
| `src/layouts/Page.astro` | Uses `Accent` |
| `src/components/SectionHead.astro` | Uses `Accent` |
| `src/components/Cta.astro` | Uses `Accent` |
| `src/components/FaqAccordion.astro` | Uses `Accent` |
| `src/pages/services/[slug].astro` | Uses `Accent` |
| `src/pages/videos/[slug].astro` | Uses `Accent` |
| `src/pages/case-studies/[slug].astro` | Uses `Accent` |
| `src/pages/market-reports/[slug].astro` | Uses `Accent` |

Verified afterwards: every H1 and H2 across all 42 built pages is now free of space before
punctuation.

### Other

| File | Change |
| --- | --- |
| `src/layouts/Base.astro` | Added `is:inline` to the JSON-LD script tags. Clears the last `astro check` hint, so the result is now completely clean |
| `src/content.config.ts` | Meta description bounds tightened from 120 to 170 down to 140 to 168, closer to the 150 to 160 target |
| `README.md` | Node 22 rather than Node 20, plus a note on keeping the lockfile committed |
| `TODO-CHECKLIST.md` | The "build has not been run" and "no lockfile" gaps are resolved and now record the verification results. Added a note explaining why `VideoObject` schema is absent until YouTube IDs are added |

Nine meta descriptions were also shortened to fit the tightened schema. Those edits landed in v1
before packaging, so they are not listed as changes here.

---

## What to do

1. Unzip `kirbychanmarkham-site-v2.zip` over your local repository folder, overwriting when asked.
2. Commit and push. Nothing needs deleting in GitHub.
3. Watch the Cloudflare build. The install step should now read `npm ci` rather than `bun install`.

If you would rather not re-upload everything, the minimum set to fix the failed build is
`package-lock.json`, `.nvmrc`, `src/content/services/investors.mdx` and
`src/content/services/new-construction.mdx`. The heading fix needs the other twelve files and it
is worth having, since the bug shows on every page of the site.
