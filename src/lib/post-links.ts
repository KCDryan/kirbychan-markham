/**
 * The neighbourhood guides and service guides a blog post can link to, with the words that suggest
 * them. Used by the blog layout (posts that choose none get them from the headline), the upload
 * page and Tina's HTML import (first guesses the writer can change) and the upload API (checks).
 */
export const HOODS: Record<string, { label: string; words: RegExp }> = {
  unionville: { label: 'Unionville', words: /\bunionville\b/i },
  'markham-village': { label: 'Markham Village', words: /\bmarkham village\b/i },
  cornell: { label: 'Cornell', words: /\bcornell\b/i },
  'berczy-village': { label: 'Berczy Village', words: /\bberczy\b/i },
  cathedraltown: { label: 'Cathedraltown', words: /\bcathedraltown\b/i },
  wismer: { label: 'Wismer', words: /\bwismer\b/i },
  greensborough: { label: 'Greensborough', words: /\bgreensborough\b/i },
  'angus-glen': { label: 'Angus Glen', words: /\bangus glen\b/i },
  'box-grove': { label: 'Box Grove', words: /\bbox grove\b/i },
  thornhill: { label: 'Thornhill', words: /\bthornhill\b/i },
  'milliken-mills': { label: 'Milliken Mills', words: /\bmilliken\b/i },
  downtown: { label: 'Downtown Markham', words: /\bdowntown markham\b/i },
};

/** In order of preference: the first matches win when only two are shown. */
export const SERVICES: Record<string, { label: string; words: RegExp }> = {
  'estate-sales': { label: 'Estate sales', words: /\b(estate|probate|executor)/i },
  'separation-and-divorce': { label: 'Separation and divorce', words: /\b(separation|divorce)/i },
  'new-construction': { label: 'New construction', words: /\b(pre-construction|new construction|builder)/i },
  luxury: { label: 'Luxury homes', words: /\bluxury\b/i },
  upsizing: { label: 'Upsizing', words: /\bupsiz/i },
  relocation: { label: 'Relocation', words: /\b(relocat|moving to markham|newcomer)/i },
  investors: { label: 'Investors', words: /\b(invest|rental|landlord)/i },
  downsizing: { label: 'Downsizing', words: /\b(downsiz|reverse mortgage|senior)/i },
  'first-time-buyers': { label: 'First time buyers', words: /\bfirst[- ]time\b/i },
};

/** The service guide each blog category leads to when a post names none. */
export const CATEGORY_SERVICE: Partial<Record<string, string>> = {
  downsizing: 'downsizing', buying: 'first-time-buyers', 'costs-and-taxes': 'first-time-buyers', condos: 'downsizing',
  'new-construction': 'new-construction', 'moving-to-markham': 'relocation', investing: 'investors', neighbourhoods: 'relocation', selling: 'downsizing',
};

/** Titles a writer can pick on the upload page. Any other title can be typed. */
export const ROLES = ['Broker', 'Broker of Record', 'Sales Representative', 'REALTOR®'];

/** Neighbourhoods named in the text, at most `max`. */
export const hoodsIn = (text: string, max = 12) => Object.keys(HOODS).filter((id) => HOODS[id].words.test(text)).slice(0, max);

/** The one neighbourhood a post is about: the one set on the post, or the only one its headline names. */
export const aboutHood = (named: string | undefined, headline: string): string | undefined => {
  if (named && named in HOODS) return named;
  const found = hoodsIn(headline);
  return found.length === 1 ? found[0] : undefined;
};

/**
 * The photo on each blog card. A post that is about one neighbourhood (`hood`) keeps that photo unless
 * one of the 5 posts before it already shows it. Every other post takes the photo used longest ago, going from the oldest post to the newest, so no photo
 * repeats within 11 posts and each is used about equally. An older post never changes when a newer
 * one is added.
 */
export function photoPlan(posts: { slug: string; published: number; hood?: string }[]): Map<string, string> {
  const ids = Object.keys(HOODS);
  const last = new Map(ids.map((h, i) => [h, i - ids.length]));
  const out = new Map<string, string>();
  const seq: string[] = [];
  [...posts]
    .sort((a, b) => a.published - b.published || a.slug.localeCompare(b.slug))
    .forEach((p, i) => {
      const keep = p.hood && p.hood in HOODS && !seq.slice(-5).includes(p.hood);
      const h = keep ? p.hood! : ids.reduce((best, c) => (last.get(c)! < last.get(best)! ? c : best));
      last.set(h, i);
      seq.push(h);
      out.set(p.slug, h);
    });
  return out;
}

/** The photo for a post published since the last build: its own neighbourhood unless one of the `recent` cards (the 11 below it) shows it, else a photo they do not show. It sits at the top of the first page, where a repeat is most visible. */
export function freshHood(slug: string, named: string | undefined, headline: string, recent: string[]): string {
  const about = aboutHood(named, headline);
  if (about && !recent.includes(about)) return about;
  const ids = Object.keys(HOODS);
  const free = ids.filter((h) => !recent.includes(h));
  const from = free.length ? free : ids;
  let n = 0;
  for (const c of slug) n = (n * 31 + c.charCodeAt(0)) >>> 0;
  return from[n % from.length];
}

/** Service guides named in the text, at most `max`. */
export const servicesIn = (text: string, max = 9) => Object.keys(SERVICES).filter((id) => SERVICES[id].words.test(text)).slice(0, max);

/** What the blog layout links when a post chooses nothing itself: two of each, from the headline and description. */
export function autoLinks(topic: string, category: string) {
  return {
    hoods: hoodsIn(topic, 2),
    services: [...new Set([...servicesIn(topic), CATEGORY_SERVICE[category]].filter((x): x is string => Boolean(x)))].slice(0, 2),
  };
}

// Self-check: node --experimental-strip-types src/lib/post-links.ts
if (typeof process !== 'undefined' && !!import.meta.filename && import.meta.filename === process.argv[1]) {
  const assert = (ok: boolean, what: string) => {
    if (!ok) throw new Error(`post-links: ${what}`);
  };
  const ids = Object.keys(HOODS);
  const posts = Array.from({ length: 70 }, (_, i) => ({ slug: `post-${i}`, published: i * 864e5, hood: i % 9 === 4 ? 'unionville' : undefined }));
  const plan = photoPlan(posts);
  const seq = posts.map((p) => plan.get(p.slug)!);
  assert(posts.every((p, i) => !p.hood || seq[i] === p.hood || seq.slice(Math.max(0, i - 5), i).includes(p.hood)), 'a post about a neighbourhood keeps its photo unless a close neighbour shows it');
  const twins = photoPlan([{ slug: 'a', published: 1, hood: 'cornell' }, { slug: 'b', published: 2, hood: 'cornell' }]);
  assert(twins.get('a') === 'cornell' && twins.get('b') !== 'cornell', 'two neighbourhood posts side by side do not show the same photo');
  for (let i = 0; i < seq.length; i++) {
    if (posts[i].hood) continue;
    for (let j = Math.max(0, i - 11); j < i; j++) assert(seq[j] !== seq[i], `photo ${seq[i]} repeats within 11 posts at ${i}`);
  }
  const unpinned = Array.from({ length: 70 }, (_, i) => ({ slug: `u-${i}`, published: i }));
  const uc = new Map<string, number>();
  for (const h of photoPlan(unpinned).values()) uc.set(h, (uc.get(h) ?? 0) + 1);
  assert(Math.max(...uc.values()) - Math.min(...uc.values()) <= 1 && uc.size === ids.length, 'unpinned posts use every photo about equally');
  const later = photoPlan([...unpinned, { slug: 'u-new', published: 999 }]);
  assert(photoPlan(unpinned).get('u-5') === later.get('u-5'), 'adding a newer post leaves older photos alone');
  assert(aboutHood(undefined, 'Downsizing in Unionville: a guide') === 'unionville', 'headline naming one neighbourhood');
  assert(aboutHood(undefined, 'Unionville or Markham Village, compared') === undefined, 'headline naming two is about neither');
  assert(aboutHood('cornell', 'Anything') === 'cornell', 'neighbourhood set on the post');
  assert(!['cornell', 'wismer'].includes(freshHood('x', undefined, 'Selling in Markham', ['cornell', 'wismer'])), 'fresh post avoids recent photos');
  assert(freshHood('y', undefined, 'Downsizing in Cornell', ['unionville', 'cornell']) !== 'cornell', 'fresh post about a neighbourhood yields when a close card shows it');
  assert(freshHood('y', undefined, 'Downsizing in Cornell', ['a', 'b', 'c', 'd', 'e', 'cornell']) !== 'cornell', 'fresh post yields to any of the cards below it');
  assert(freshHood('y', undefined, 'Downsizing in Cornell', ['unionville', 'wismer']) === 'cornell', 'fresh post about a neighbourhood keeps its photo when no card below shows it');
  console.log('post-links ok');
}
