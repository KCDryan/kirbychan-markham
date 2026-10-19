/**
 * Source domains for blog and quick post `sources` lists (BLOG-PLAYBOOK.md section 4).
 *
 *   PRIMARY  the primary sources in the section 4 table. Subdomains count too.
 *   BLOCKED  another brokerage's, agent's, portal's, lender's or content farm's site.
 *            Citing one is an error.
 *
 * Anything else is a warning: not a primary source, so a person checks it.
 * Used by scripts/check-tina-post.mjs and by the editor (tina/config.ts).
 */

export const PRIMARY = [
  'canada.ca',
  'osfi-bsif.gc.ca',
  'cmhc-schl.gc.ca',
  'ontario.ca',
  'reco.on.ca',
  'fsrao.ca',
  'hcraontario.ca',
  'tarion.com',
  'mpac.ca',
  'markham.ca',
  'york.ca',
  'yrt.ca',
  'yrdsb.ca',
  'ycdsb.ca',
  'gotransit.com',
  'metrolinx.com',
  'trreb.ca',
  'statcan.gc.ca',
  'bankofcanada.ca',
];

export const BLOCKED = [
  'zolo.ca',
  'kaizenrealestate.ca',
  // The Polsinello Team's site.
  'greatertorontohomepros.com',
  'wahi.com',
  'wowa.ca',
  'searchlistingsonline.ca',
  'pegasuslending.com',
  'ownright.com',
  'wealthnorth.ca',
  'justinhavre.com',
  'fsresidential.com',
];

// HoodQ's own pages start with one of these. Anything else is an agent's branded copy
// (for example hoodq.com/francesco-jr-lardi/explore/...) and is blocked like an agent's site.
const HOODQ_SECTIONS = ['', 'schools', 'explore', 'neighbourhoods', 'address-search', 'about', 'blog', 'privacy', 'terms'];

const onDomain = (host, list) => list.some((d) => host === d || host.endsWith('.' + d));

/**
 * Classify a source URL: 'primary', 'blocked' or 'other'. A value that is not a full
 * http(s) URL is 'other'.
 */
export function sourceKind(url) {
  let u;
  try {
    u = new URL(String(url).trim());
  } catch {
    return 'other';
  }
  if (!/^https?:$/.test(u.protocol)) return 'other';
  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  if (onDomain(host, PRIMARY)) return 'primary';
  if (onDomain(host, BLOCKED)) return 'blocked';
  if (onDomain(host, ['hoodq.com'])) {
    const first = u.pathname.split('/')[1]?.toLowerCase() ?? '';
    if (!HOODQ_SECTIONS.includes(first)) return 'blocked';
  }
  return 'other';
}
