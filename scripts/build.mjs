/**
 * Production build. Builds the TinaCMS editor at /admin/ only when Tina Cloud
 * credentials are present (TINA_CLIENT_ID and TINA_TOKEN), so a build without
 * them, including CI, is exactly the plain Astro build.
 */
import { execSync } from 'node:child_process';

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });

// Content edited in TinaCMS is committed straight to main and deploys without
// review, so the house style and blog SEO rules run here too. A failing check
// stops the deploy and the live site keeps its last good version.
run('node scripts/check-style.mjs');
run('node scripts/check-blog.mjs');

if (process.env.TINA_CLIENT_ID && process.env.TINA_TOKEN) {
  console.log('Tina Cloud credentials found, building the editor at /admin/');
  run('npx tinacms build');
} else {
  console.log('No Tina Cloud credentials, skipping the editor build');
}
run('npx astro build');
