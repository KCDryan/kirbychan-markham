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

/**
 * The picture for a post about no one neighbourhood: one of the neighbourhood photos, chosen from the
 * post's address so the same post always gets the same picture and a page of posts gets a mix.
 */
export function anyHood(slug: string): string {
  const ids = Object.keys(HOODS);
  let n = 0;
  for (const c of slug) n = (n * 31 + c.charCodeAt(0)) >>> 0;
  return ids[n % ids.length];
}

/** The neighbourhood whose photo leads a post's card: the one it names, or anyHood. Every post gets one. */
export const cardHood = (slug: string, named: (string | undefined)[], text: string) => named.find((h) => h && h in HOODS) ?? hoodsIn(text, 1)[0] ?? anyHood(slug);

/** Service guides named in the text, at most `max`. */
export const servicesIn = (text: string, max = 9) => Object.keys(SERVICES).filter((id) => SERVICES[id].words.test(text)).slice(0, max);

/** What the blog layout links when a post chooses nothing itself: two of each, from the headline and description. */
export function autoLinks(topic: string, category: string) {
  return {
    hoods: hoodsIn(topic, 2),
    services: [...new Set([...servicesIn(topic), CATEGORY_SERVICE[category]].filter((x): x is string => Boolean(x)))].slice(0, 2),
  };
}
