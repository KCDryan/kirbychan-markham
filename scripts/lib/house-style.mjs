/**
 * The house style rules scripts/check-style.mjs enforces, shared with scripts/pull-uploads.mjs and
 * src/lib/service-uploads.ts so a generated service page is checked by exactly the same rules
 * before it is written into the build.
 */
export const RULES = [
  { name: 'em dash', re: /—/g },
  { name: 'en dash', re: /–/g },
  { name: 'comma before and/or', re: /,\s+(and|or)\b/g },
  {
    name: 'machine-sounding contrast phrase',
    re: /\b(not just|isn't just|is not just|not only|not simply|more than just|isn't about|is not about|it's not about)\b/gi,
    // A preference for the team's researched posts. Agents' quick posts are
    // their own writing and are not held back for it.
    skip: (file) => file.includes('content/blog/quick/'),
  },
  {
    name: 'American spelling',
    // Whole words only, so CSS keywords such as "color:" or "center" in style
    // blocks are not affected: those are stripped before checking.
    re: /\b(neighborhoods?|favorites?|behaviors?|honors?|labors?|organizations?|realized?|analyzed?|centers?|colors?)\b/gi,
  },
];

/** Remove code and style so only human-facing text is checked. */
export function prose(file, text) {
  let t = text;
  // Style blocks: CSS uses "color" and "center" legitimately.
  t = t.replace(/<style[\s\S]*?<\/style>/g, (m) => '\n'.repeat(m.split('\n').length - 1));
  // Frontmatter code fences in .astro files are TypeScript, not prose.
  if (file.endsWith('.astro')) {
    t = t.replace(/^---[\s\S]*?\n---/, (m) => '\n'.repeat(m.split('\n').length - 1));
  }
  // YAML comments in MDX templates.
  t = t.replace(/^\s*#.*$/gm, '');
  // Markup attributes such as class:list={[...]} or name="theme-color" are code.
  // Prose inside attributes (alt text, labels) is short and reviewed by hand.
  if (file.endsWith('.astro')) {
    t = t.replace(/\b[\w:-]+=("[^"]*"|\{[^}]*\})/g, '');
  } else {
    t = t.replace(/\b(class|className|style)=("[^"]*"|\{[^}]*\})/g, '');
  }
  // A web address is not prose: its spelling belongs to the site it points at.
  t = t.replace(/https?:\/\/[^\s"'<>)\]]+/g, '');
  return t;
}

/** Every rule a text breaks, as "line: rule". `file` decides what counts as prose (see prose()). */
export function styleProblems(file, text) {
  const out = [];
  prose(file, text).split('\n').forEach((line, i) => {
    for (const rule of RULES) {
      if (rule.skip?.(file)) continue;
      rule.re.lastIndex = 0;
      if (rule.re.test(line)) out.push(`${i + 1}: ${rule.name}`);
    }
  });
  return out;
}
