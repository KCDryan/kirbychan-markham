/**
 * Tell IndexNow search engines (Bing, Yandex, Seznam, Naver) about changed URLs.
 * Google does not use IndexNow; it reads the sitemap submitted in Search Console.
 *
 * Usage, after a deploy is live:
 *   node scripts/indexnow.mjs                      every URL in the live sitemap
 *   node scripts/indexnow.mjs /blog/new-post/ ...   only the paths given
 */
const HOST = 'kirbychanmarkham.com';
const KEY = '01933cf27bb7c5ea6fe04e439c3f91cf';

let urls = process.argv.slice(2).map((p) => `https://${HOST}${p.startsWith('/') ? p : `/${p}`}`);
if (urls.length === 0) {
  const index = await (await fetch(`https://${HOST}/sitemap-index.xml`)).text();
  for (const sitemap of index.match(/<loc>[^<]+<\/loc>/g) ?? []) {
    const xml = await (await fetch(sitemap.slice(5, -6))).text();
    urls.push(...(xml.match(/<loc>[^<]+<\/loc>/g) ?? []).map((l) => l.slice(5, -6)));
  }
}

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls.slice(0, 10000) }),
});
console.log(`IndexNow: ${res.status} for ${urls.length} URL(s)`);
if (res.status >= 400) process.exit(1);
