/**
 * Browser side of the one-click home search, shared by /homes-for-sale/ and /sold/.
 * Choices are links, so the address bar always holds the search and Back works. A click updates
 * the list in place instead of reloading, so the page never jumps back to the top.
 */
import { AREAS, HOMES, PRICES } from '../lib/proptx';

export const $ = (id: string) => document.getElementById(id)!;
export const money = (n: unknown) => (typeof n === 'number' ? '$' + n.toLocaleString('en-CA') : '');

export function el(tag: string, cls?: string | null, text?: string | null) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

/** The search in the address bar, keeping only the keys this page understands. */
export function current(keys: string[]): URLSearchParams {
  const p = new URLSearchParams(location.search);
  for (const k of [...p.keys()]) if (!keys.includes(k) || !p.get(k)) p.delete(k);
  return p;
}

/** The link for one choice: the current search with that key changed, back to page one. */
export function withValue(p: URLSearchParams, key: string, value: string): string {
  const n = new URLSearchParams(p);
  if (value) n.set(key, value);
  else n.delete(key);
  if (key !== 'page') n.delete('page');
  if (key === 'city') n.delete('area');
  const s = n.toString();
  return s ? '?' + s : location.pathname;
}

/** Marks the chosen buttons and points every button at the search it leads to. */
export function syncChoices(p: URLSearchParams) {
  for (const c of document.querySelectorAll<HTMLAnchorElement>('.hs__choice')) {
    c.href = withValue(p, c.dataset.key!, c.dataset.value!);
    if ((p.get(c.dataset.key!) || '') === c.dataset.value) c.setAttribute('aria-current', 'true');
    else c.removeAttribute('aria-current');
  }
  // Neighbourhoods are Markham's, so the row only shows while searching Markham.
  const area = document.getElementById('area-step');
  if (area) area.hidden = !!p.get('city');
}

export function bindChoices(load: () => void) {
  document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('.hs__choice, .hs__choice-remove, #prev, #next');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    history.pushState(null, '', a.getAttribute('href'));
    load();
    if (a.id === 'prev' || a.id === 'next') $('results-top').scrollIntoView();
  });
  addEventListener('popstate', load);
  load();
}

/** A plain sentence for the search, e.g. "bungalows for sale in Unionville, Markham under $800,000". */
export function describe(p: URLSearchParams, verb: string): string {
  const home = HOMES[p.get('home') ?? ''];
  const price = PRICES[p.get('price') ?? ''];
  const area = AREAS[p.get('area') ?? ''];
  return [
    home ? home.label.toLowerCase() : 'homes',
    verb,
    'in ' + (p.get('city') || (area ? `${area.label}, Markham` : 'Markham')),
    price && (price.min && price.max ? `from ${money(price.min)} to ${money(price.max)}` : price.max ? `under ${money(price.max)}` : `over ${money(price.min)}`),
    p.get('beds') && `with ${p.get('beds')} or more bedrooms`,
  ].filter(Boolean).join(' ');
}

type Facts = { style?: string | null; type?: string | null; beds?: number | null; baths?: number | null };

/** The home type in plain words: "Bungalow" when the style says so, else the property type. */
export const homeType = (l: Facts) => (l.style && !/storey|apartment|other/i.test(l.style) ? l.style : l.type) || '';

/** "Bungalow · 3 bedrooms · 2 bathrooms", in words rather than abbreviations. */
export const factsLine = (l: Facts) =>
  [homeType(l), l.beds != null && `${l.beds} bedroom${l.beds === 1 ? '' : 's'}`, l.baths != null && `${l.baths} bathroom${l.baths === 1 ? '' : 's'}`]
    .filter(Boolean)
    .join(' · ');

const svg = (inner: string) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
const BED = svg('<path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7M3 14h18M3 18v2M21 18v2M7 9V7a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2"/>');
const BATH = svg('<path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3ZM6 12V6a2 2 0 0 1 4 0M7 19l-1 2M17 19l1 2"/>');

/** Bedrooms and bathrooms with small pictures, each also written out in words. */
export function factsRow(l: Facts) {
  const row = el('p', 'hs__facts');
  const add = (icon: string, text: string) => {
    const f = el('span', 'hs__fact');
    f.innerHTML = icon; // fixed SVG markup from this file, never listing data
    f.append(text);
    row.append(f);
  };
  if (l.beds != null) add(BED, `${l.beds} bedroom${l.beds === 1 ? '' : 's'}`);
  if (l.baths != null) add(BATH, `${l.baths} bathroom${l.baths === 1 ? '' : 's'}`);
  return row;
}

/** The photo area of a card: the photo with a home-type badge, or a clear "photo coming soon". */
export function media(src: string | null | undefined, alt: string, badge: string) {
  const box = el('div', 'hs__media');
  if (src) {
    const img = el('img', 'hs__img') as HTMLImageElement;
    img.alt = alt;
    // The size is stated so the page does not jump as photos arrive. The stylesheet still fits the photo to its card.
    img.width = 640;
    img.height = 480;
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.src = src;
    box.append(img);
  } else {
    const none = el('div', 'hs__noimg');
    none.innerHTML = '<svg class="hs-icon" viewBox="0 0 64 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"><path d="M8 22 32 6l24 16"/><path d="M13 19v25h38V19"/><path d="M28 44V34h8v10"/></svg>';
    none.append(el('span', null, 'Photo coming soon'));
    box.append(none);
  }
  if (badge) box.append(el('span', 'hs__badge', badge));
  return box;
}

/** Removable chips for each choice in effect, so it is always clear what the list is showing. */
export function activeChips(p: URLSearchParams, holder: HTMLElement, label: (key: string, value: string) => string) {
  holder.replaceChildren();
  for (const key of ['home', 'area', 'price', 'beds', 'sold', 'city', 'for', 'sort']) {
    const value = p.get(key);
    if (!value) continue;
    const a = el('a') as HTMLAnchorElement;
    a.className = 'hs__choice-remove';
    a.href = withValue(p, key, '');
    a.setAttribute('aria-label', `Remove ${label(key, value)}`);
    a.append(label(key, value), Object.assign(el('span', null, '✕'), { ariaHidden: 'true' }));
    holder.append(a);
  }
  holder.hidden = !holder.children.length;
}

/** Today's for-sale counts on the buttons, following the chosen neighbourhood and home type. */
export function syncCounts(p: URLSearchParams) {
  const box = document.querySelector<HTMLElement>('.hs-filters[data-counts]');
  if (!box) return;
  const data = JSON.parse(box.dataset.counts!) as { markham: Record<string, number>; areas: Record<string, Record<string, number>> };
  const off = !!(p.get('city') || p.get('for'));
  const scope = (p.get('area') && data.areas[p.get('area')!]) || data.markham;
  const fmt = (v?: number) => (!off && v ? v.toLocaleString('en-CA') : '');
  for (const c of box.querySelectorAll<HTMLElement>('[data-count]')) c.textContent = fmt(scope[c.dataset.count!]);
  const home = p.get('home') || 'total';
  for (const c of box.querySelectorAll<HTMLElement>('[data-area-count]')) c.textContent = fmt(data.areas[c.dataset.areaCount!]?.[home]);
}

/** On phones, the bottom bar hides while the results are on screen and comes back when they are not. */
export function watchJump() {
  const bar = document.getElementById('jump');
  const results = document.getElementById('results-top');
  if (!bar || !results || !('IntersectionObserver' in window)) return;
  let resultsInView = false;
  const update = () => bar.classList.toggle('is-away', resultsInView || results.getBoundingClientRect().top < 0);
  new IntersectionObserver((entries) => {
    resultsInView = entries[0].isIntersecting;
    update();
  }).observe(results);
  addEventListener('scroll', update, { passive: true });
}
