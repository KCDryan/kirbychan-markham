/**
 * The mechanical house style fixes for agents' quick posts: long dashes, a comma
 * directly before "and" or "or", and American spellings. Used by
 * scripts/prepare-quick-posts.mjs to fix posts at deploy, and by
 * scripts/check-style.mjs so it checks quick posts as they will be deployed.
 */
export const SPELLING = [
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
export function tidy(text, count) {
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
