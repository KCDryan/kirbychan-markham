/**
 * Makes agents' quick posts publishable without letting one of them stop a deploy.
 *
 * 1. Fixes the house style problems that have one mechanical fix: long dashes,
 *    a comma directly before "and" or "or", and American spellings.
 * 2. Runs the house style and blog checks. A quick post that still fails is
 *    held back from this build (moved out of src/ in the build checkout).
 *    Every other page still builds and deploys.
 * 3. Writes a report of what was fixed and what was held back, and why. The
 *    build publishes it at /admin/status.html so agents can see it.
 *
 * With --apply it changes files, which only makes sense in a throwaway
 * checkout such as a Cloudflare or GitHub Actions build. Without --apply it
 * only reports, so running it locally never rewrites anyone's post.
 *
 * Full blog posts are not touched. Their problems still fail the build.
 */
import { execFileSync } from 'node:child_process';
import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';

const QUICK = 'src/content/blog/quick';
const apply = process.argv.includes('--apply');

const SPELLING = [
  [/\bneighborhood(s?)\b/g, 'neighbourhood$1'],
  [/\bNeighborhood(s?)\b/g, 'Neighbourhood$1'],
  [/\bfavorite(s?)\b/g, 'favourite$1'],
  [/\bFavorite(s?)\b/g, 'Favourite$1'],
  [/\bbehavior(s?)\b/g, 'behaviour$1'],
  [/\bhonor(s?)\b/g, 'honour$1'],
  [/\blabor(s?)\b/g, 'labour$1'],
  [/\borganization(s?)\b/g, 'organisation$1'],
  [/\bOrganization(s?)\b/g, 'Organisation$1'],
  [/\brealized\b/g, 'realised'],
  [/\brealize\b/g, 'realise'],
  [/\banalyzed\b/g, 'analysed'],
  [/\bcenter(s?)\b/g, 'centre$1'],
  [/\bCenter(s?)\b/g, 'Centre$1'],
  [/\bcolor(s?)\b/g, 'colour$1'],
];

/** Fix prose, but leave URLs alone: link targets, bare links and source urls. */
function tidy(text, count) {
  // Park URLs so a dash or comma inside a link is never changed.
  const kept = [];
  const guarded = text.replace(/\]\([^)]*\)|https?:\/\/\S+|^\s*url:.*$/gm, (m) => {
    kept.push(m);
    return `@@URL${kept.length - 1}@@`;
  });
  const tally = (re) => (guarded.match(re) ?? []).length;
  count.dashes += tally(/[–—]/g);
  count.commas += tally(/,\s+(and|or)\b/g);
  for (const [re] of SPELLING) count.spelling += tally(re);
  let out = guarded
    .replace(/(\d)\s*[–—]\s*(\d)/g, '$1 to $2')
    .replace(/\s*[–—]\s*/g, ', ')
    .replace(/,(\s+)(and|or)\b/g, '$1$2');
  for (const [re, to] of SPELLING) out = out.replace(re, to);
  return out.replace(/@@URL(\d+)@@/g, (_m, i) => kept[Number(i)]);
}

/** Problems reported by a check script, grouped by quick post file name. */
function problemsFor(script) {
  try {
    execFileSync('node', [script], { stdio: 'pipe' });
    return { byFile: new Map(), other: [] };
  } catch (e) {
    const out = `${e.stdout ?? ''}${e.stderr ?? ''}`;
    const byFile = new Map();
    const other = [];
    for (const line of out.split('\n')) {
      const m = line.match(/^\s+(src\/content\/blog\/quick\/[^:\s]+\.mdx)(?::\d+)?:?\s+(.*)$/);
      if (m) {
        const name = m[1].split('/').pop();
        byFile.set(name, [...(byFile.get(name) ?? []), m[2].replace(/\s+->\s+/, ': ').trim()]);
      } else if (/^\s+src\//.test(line)) other.push(line.trim());
    }
    return { byFile, other };
  }
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const names = (await readdir(QUICK).catch(() => [])).filter((n) => n.endsWith('.mdx') && !n.startsWith('_'));
const fixed = [];

for (const name of names) {
  const file = `${QUICK}/${name}`;
  const before = await readFile(file, 'utf8');
  const count = { dashes: 0, commas: 0, spelling: 0 };
  const after = tidy(before, count);
  if (after !== before) {
    const what = [
      count.dashes && `${count.dashes} long dash${count.dashes > 1 ? 'es' : ''}`,
      count.commas && `${count.commas} comma${count.commas > 1 ? 's' : ''} before "and" or "or"`,
      count.spelling && `${count.spelling} American spelling${count.spelling > 1 ? 's' : ''}`,
    ].filter(Boolean);
    fixed.push({ name, what: what.join(', ') || 'house style' });
    if (apply) await writeFile(file, after);
  }
}

const held = new Map();
if (apply) {
  // Check again after fixing. Anything still wrong in a quick post holds that post back.
  for (const script of ['scripts/check-style.mjs', 'scripts/check-blog.mjs']) {
    for (const [name, reasons] of problemsFor(script).byFile) held.set(name, [...(held.get(name) ?? []), ...reasons]);
  }
  // Out of src/ entirely, so neither the site nor the checks see a held post.
  if (held.size) await mkdir('.held-quick-posts', { recursive: true });
  for (const name of held.keys()) await rename(`${QUICK}/${name}`, `.held-quick-posts/${name}`);
}

for (const f of fixed) console.log(`Quick post ${f.name}: ${apply ? 'fixed' : 'would fix'} ${f.what}`);
for (const [name, reasons] of held) {
  console.warn(`Quick post ${name} held back from this deploy:`);
  for (const r of reasons) console.warn(`  - ${r}`);
}
if (!fixed.length && !held.size) console.log(`Quick posts ready: ${names.length}`);

if (apply) {
  const when = new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto', dateStyle: 'long', timeStyle: 'short' });
  const heldHtml = held.size
    ? [...held]
        .map(
          ([name, reasons]) =>
            `<li><strong>${esc(name.replace(/\.mdx$/, ''))}</strong><ul>${reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></li>`
        )
        .join('')
    : '<li>None. Every quick post is published.</li>';
  const fixedHtml = fixed.length
    ? fixed.map((f) => `<li><strong>${esc(f.name.replace(/\.mdx$/, ''))}</strong>: ${esc(f.what)}</li>`).join('')
    : '<li>Nothing needed fixing.</li>';
  const html = `<!doctype html><html lang="en-CA"><head><meta charset="utf-8"><meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Quick post status</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:760px;margin:2rem auto;padding:0 16px;color:#1b2320}h1{font-size:1.5rem}h2{font-size:1.1rem;margin-top:2rem}li{margin:.4rem 0}.held li strong{color:#b45309}code{background:#eef2f1;padding:1px 4px;border-radius:3px}</style></head>
<body><h1>Quick post status</h1><p>From the site build on ${esc(when.replace(/\.$/, ''))}.</p>
<h2>Held back, not on the site</h2><ul class="held">${heldHtml}</ul>
<p>To publish a held-back post, open it in the editor, fix what is listed and save.</p>
<h2>Fixed automatically</h2><ul>${fixedHtml}</ul>
<p><a href="/admin/">Back to the editor</a></p></body></html>`;
  // The editor build empties public/admin/, so scripts/build.mjs copies this in afterwards.
  await writeFile('.quick-post-status.html', html);
}
