/**
 * Production build. Builds the TinaCMS editor at /admin/ only when Tina Cloud
 * credentials are present (TINA_CLIENT_ID and TINA_TOKEN), so a build without
 * them, including CI, is exactly the plain Astro build.
 */
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });

// Agents' quick posts: fix what has a mechanical fix and hold back any post
// that still fails, so one post can never stop the whole site deploying. Files
// are only changed in a throwaway build checkout (Cloudflare Pages or CI).
const throwaway = Boolean(process.env.CF_PAGES || process.env.CI);
run(`node scripts/prepare-quick-posts.mjs${throwaway ? ' --apply' : ''}`);

// Content edited in TinaCMS is committed straight to main and deploys without
// review, so the house style and blog SEO rules run here too. A failing check
// stops the deploy and the live site keeps its last good version.
run('node scripts/check-style.mjs');
run('node scripts/check-blog.mjs');

if (process.env.TINA_CLIENT_ID && process.env.TINA_TOKEN) {
  console.log('Tina Cloud credentials found, building the editor at /admin/');
  // A Tina Cloud problem (branch not indexed yet, revoked token, outage) must
  // not stop content from deploying, so the site builds without the editor.
  try {
    run('npx tinacms build');
  } catch {
    console.warn('WARNING: tinacms build failed. Deploying the site without the /admin/ editor.');
  }
} else {
  console.log('No Tina Cloud credentials, skipping the editor build');
}
if (existsSync('.quick-post-status.html')) {
  mkdirSync('public/admin', { recursive: true });
  copyFileSync('.quick-post-status.html', 'public/admin/status.html');
}
run('npx astro build');
