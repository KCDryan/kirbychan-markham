/**
 * Fails when tina/config.ts has changed but tina/tina-lock.json was not
 * regenerated. Tina Cloud compares the two on every deploy and refuses to build
 * the editor at /admin/ when they differ, so the site would go live without it.
 *
 * Fix a failure with: npx tinacms dev -c "node -e 0"   then commit tina/tina-lock.json
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const LOCK = 'tina/tina-lock.json';
const before = readFileSync(LOCK, 'utf8');
try {
  execSync('npx tinacms dev -c "node -e 0"', { stdio: 'pipe' });
} catch (e) {
  console.error(String(e.stdout ?? '') + String(e.stderr ?? ''));
  console.error('Tina schema check could not run.');
  process.exit(1);
}
const after = readFileSync(LOCK, 'utf8');
if (after !== before) {
  writeFileSync(LOCK, before);
  console.error(`${LOCK} is out of date with tina/config.ts. Run: npx tinacms dev -c "node -e 0" and commit ${LOCK}`);
  process.exit(1);
}
console.log('Tina schema lock is up to date.');
