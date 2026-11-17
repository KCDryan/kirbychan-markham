// After a build: every blog post (and the upload shell) shows a real photo of a person from
// `blogPeople` in src/data/site.json, and the posts use more than one of those photos.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const site = JSON.parse(readFileSync('src/data/site.json', 'utf8'));
const names = new Set(site.blogPeople.map((p) => p.name));
const pages = [];
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) walk(join(dir, e.name));
    else if (e.name === 'index.html') pages.push(join(dir, e.name));
  }
};
walk('dist/blog');
const problems = [];
const seen = new Set();
let posts = 0;
for (const f of pages) {
  const html = readFileSync(f, 'utf8');
  if (!html.includes('<article')) continue; // lists, categories and pages
  posts++;
  const fig = html.match(/<figure class="post-person[^"]*"[^>]*>([\s\S]*?)<\/figure>/)?.[1];
  const name = fig?.match(/<strong[^>]*>([^<]*)/)?.[1];
  if (!fig || !fig.includes('<img') || !names.has(name)) problems.push(f);
  else seen.add(fig.match(/alt="([^"]*)"/)?.[1]);
}
if (!posts || !existsSync('dist/blog/upload-shell')) problems.push('no built posts or upload shell found');
if (site.blogPeople.length > 1 && seen.size < 2) problems.push('every post shows the same photo');
if (problems.length) {
  console.error(`Post photo check failed:\n  ${problems.slice(0, 20).join('\n  ')}`);
  process.exit(1);
}
console.log(`Post photo check passed: ${posts} posts, ${seen.size} different photos.`);
