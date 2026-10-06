/**
 * Landing pages for /homes-for-sale/<slug>/: one per home type and one per neighbourhood. Unlike the
 * one-click search, their listings are in the HTML, so search engines can read them. The listings
 * come from this site's own /api/listings at build time and the daily listing-counts commit rebuilds
 * the site every morning, so the snapshot is never more than a day old.
 */
import site from '../data/site.json';

export type Card = {
  key: string;
  price: number;
  address: string | null;
  city: string;
  community: string | null;
  beds: number | null;
  baths: number | null;
  type: string | null;
  style: string | null;
  brokerage: string | null;
  photo: string | null;
};
export type Snapshot = { total: number; listings: Card[]; at: Date };

export type TypePage = {
  home: string;
  /** Set on pages narrower than a home type: the API query, the live search link and a test every listing must pass. */
  query?: string;
  search?: string;
  accepts?: (c: Card) => boolean;
  label: string;
  title: string;
  description: string;
  h1: string;
  intro: string[];
  links: { href: string; label: string }[];
  /** Questions downsizers ask about this kind of home, shown with the page's other FAQs. */
  faq: { q: string; a: string }[];
};

export const TYPE_PAGES: Record<string, TypePage> = {
  bungalows: {
    home: 'bungalow',
    label: 'Bungalows',
    title: 'Bungalows for Sale in Markham | Live MLS® Listings',
    description: 'Bungalows for sale in Markham today from the MLS®, with photos, prices and the neighbourhoods that have them. One-floor living for downsizers, updated daily.',
    h1: 'Bungalows for sale in Markham',
    intro: [
      'A bungalow puts the kitchen, the bedrooms and the laundry on one floor. That is why it is the home most of our downsizing clients ask about first. Markham has far fewer bungalows than two-storey houses, so it helps to know where they are when one comes up.',
      'This page lists bungalows and bungalofts, where the main bedroom is on the ground floor with a loft above. Raised bungalows are left out because they have stairs at the front door.',
    ],
    links: [
      { href: '/best-markham-neighbourhoods-for-downsizing/', label: 'Where to downsize in Markham' },
      { href: '/blog/bungalow-condo-or-townhouse-downsizing/', label: 'Bungalow, condo or townhouse: choosing your next home' },
      { href: '/downsizing-markham/', label: 'Our Markham downsizing guide' },
    ],
    faq: [
      {
        q: 'What counts as a bungalow on this page?',
        a: 'Homes the listing brokerage describes on the MLS® as a bungalow or a bungaloft, where the main bedroom is on the ground floor with a loft above. Raised bungalows are left out because they have stairs at the front door. Always confirm the layout at a showing, since basements and entrances vary.',
      },
      {
        q: 'Is a bungalow or a condo better for downsizing?',
        a: 'It depends on what you want to keep. A bungalow keeps a yard, a garage and no monthly condo fee but still needs outside upkeep. A condo apartment removes the outside work in exchange for a monthly fee. Our guide to choosing a bungalow, condo or townhouse compares them on cost and maintenance.',
      },
    ],
  },
  condos: {
    home: 'condo',
    label: 'Condo apartments',
    title: 'Condos for Sale in Markham | Live MLS® Listings',
    description: 'Condo apartments for sale in Markham today from the MLS®, with photos, prices and maintenance-free living near transit. Listings updated daily from TRREB.',
    h1: 'Condo apartments for sale in Markham',
    intro: [
      'A condo apartment means no stairs inside the unit, an elevator in the building and no exterior upkeep. In exchange there is a monthly maintenance fee, which covers the shared parts of the building and is set by the condo corporation.',
      'Before you buy a resale condo in Ontario, your lawyer reviews the status certificate, which shows the fees, the reserve fund and any special assessments. Ask us for it early so there is time to read it properly.',
    ],
    links: [
      { href: '/blog/condo-status-certificate-markham/', label: 'The status certificate for an Ontario condo' },
      { href: '/downtown-markham/', label: 'Downtown Markham neighbourhood guide' },
      { href: '/best-markham-neighbourhoods-for-downsizing/', label: 'Where to downsize in Markham' },
    ],
    faq: [
      {
        q: 'Do all condo apartments have an elevator?',
        a: 'Not always. Most mid-rise and high-rise buildings do, but some low-rise buildings do not. If stairs are a concern, check the listing and ask before you book a showing.',
      },
      {
        q: 'What does a condo maintenance fee cover?',
        a: 'Each condo corporation sets its own budget, so it varies. The fee pays for the shared parts of the building and the reserve fund, and in some buildings it also covers some utilities. The status certificate and the budget show exactly what a particular unit pays for.',
      },
    ],
  },
  townhouses: {
    home: 'townhouse',
    label: 'Townhouses',
    title: 'Townhouses for Sale in Markham | Live MLS® Listings',
    description: 'Townhouses for sale in Markham today from the MLS®, freehold and condo townhomes with photos and prices. Less upkeep than a detached house, updated daily.',
    h1: 'Townhouses for sale in Markham',
    intro: [
      'Markham townhouses come in two kinds. With a freehold townhouse you own the house and the land under it and look after both. With a condo townhouse a condo corporation looks after the outside and the grounds in exchange for a monthly fee.',
      'Both usually mean less to maintain than a detached house, with more room than most condo apartments. This page lists both kinds.',
    ],
    links: [
      { href: '/best-markham-neighbourhoods-for-families/', label: 'Markham neighbourhoods with the most room' },
      { href: '/upsizing-markham/', label: 'Moving to a bigger home in Markham' },
      { href: '/mortgage-calculator-markham/', label: 'Markham mortgage calculator' },
    ],
    faq: [
      {
        q: 'What is the difference between a freehold and a condo townhouse?',
        a: 'With a freehold townhouse you own the house and the land under it and you look after both. With a condo townhouse you own your unit within a condo corporation, which looks after the outside and the grounds in exchange for a monthly fee.',
      },
    ],
  },
  houses: {
    home: 'house',
    label: 'Houses',
    title: 'Houses for Sale in Markham | Live MLS® Listings',
    description: 'Detached and semi-detached houses for sale in Markham today from the MLS®, with photos, prices and neighbourhoods. Listings updated daily from TRREB.',
    h1: 'Houses for sale in Markham',
    intro: [
      'This page lists detached and semi-detached houses. Detached homes are the largest group of homes for sale in Markham and also the most expensive, so it helps to compare prices by neighbourhood before you look at individual houses.',
      'For what houses have actually sold for, rather than asking prices, create a free account for Markham sold prices.',
    ],
    links: [
      { href: '/markham-house-prices/', label: 'Markham house prices by property type' },
      { href: '/sold/', label: 'Markham sold prices' },
      { href: '/best-markham-neighbourhoods-for-families/', label: 'Markham neighbourhoods with the most room' },
    ],
    faq: [
      {
        q: 'Which houses are on this page?',
        a: 'Detached houses and semi-detached houses, which share one wall with the house next door. Bungalows that are detached or semi-detached appear here as well as on our bungalow page.',
      },
    ],
  },
};

const ordinal = ['', 'one', 'two', 'three', 'four', 'five'];
/** A page for one home type with exactly this many bedrooms, for example /homes-for-sale/2-bedroom-condos/. */
function bedroomPage(home: 'condo' | 'townhouse' | 'house', n: number): TypePage {
  const { noun, one, guide } = {
    condo: { noun: 'condos', one: 'condo apartment', guide: { href: '/blog/condo-status-certificate-markham/', label: 'The status certificate for an Ontario condo' } },
    townhouse: { noun: 'townhouses', one: 'townhouse', guide: { href: '/blog/home-inspection-ontario-buyers/', label: 'What a home inspection covers and misses' } },
    house: { noun: 'houses', one: 'detached or semi-detached house', guide: { href: '/blog/home-inspection-ontario-buyers/', label: 'What a home inspection covers and misses' } },
  }[home];
  const count = `${ordinal[n]} bedroom${n > 1 ? 's' : ''}`;
  return {
    home,
    query: `home=${home}&bedrooms=${n}`,
    search: `home=${home}&beds=${n}`,
    accepts: (c) => c.beds === n,
    label: `${n} bedroom ${noun}`,
    title: `${n} Bedroom ${noun[0].toUpperCase()}${noun.slice(1)} for Sale in Markham | MLS®`,
    description: `${n} bedroom ${noun} for sale in Markham on the MLS® today, with photos, asking prices and the neighbourhood for each listing from TRREB. Refreshed every morning.`,
    h1: `${n} bedroom ${noun} for sale in Markham`,
    intro: [
      `Each listing on this page is a Markham ${one} that the listing brokerage entered with ${count} in total. Brokerages count rooms differently. Some include a den or a basement bedroom in the total, so check the floor plan before you book a showing.`,
      `Asking prices for the same bedroom count vary with the neighbourhood, the floor area and the age of the home. Our Markham house prices page has TRREB's sale figures by home type. Each neighbourhood guide has the figures for its own area.`,
    ],
    links: [
      { href: '/markham-house-prices/', label: 'Markham house prices by property type' },
      guide,
      { href: '/mortgage-calculator-markham/', label: 'Markham mortgage calculator' },
      { href: '/land-transfer-tax-calculator-markham/', label: 'Markham land transfer tax calculator' },
    ],
    faq: [
      {
        q: `Which listings are on the ${n} bedroom ${noun} page?`,
        a: `Markham listings entered on TRREB's MLS® System as a ${one}, offered for sale, with ${count} in total. A home entered with a den or a basement room counted as a bedroom shows under the larger size, so look at the next page up as well.`,
      },
      {
        q: 'Can I narrow these by neighbourhood or price?',
        a: 'Yes. Open the live search from this page and pick a neighbourhood and a price range. The live search shows this bedroom count and larger.',
      },
    ],
  };
}

/** Kept apart from TYPE_PAGES so the four home type pages stay first in every list. */
for (const [home, n] of [['condo', 1], ['condo', 2], ['condo', 3], ['townhouse', 3], ['house', 3], ['house', 4], ['house', 5]] as const) {
  TYPE_PAGES[`${n}-bedroom-${home === 'condo' ? 'condos' : home + 's'}`] = bedroomPage(home, n);
}

const cache = new Map<string, Promise<Snapshot | null>>();

/** The first page of live listings for a search, from this site's own API. Null if it cannot be reached. */
export function snapshot(query: string): Promise<Snapshot | null> {
  if (!cache.has(query)) {
    cache.set(
      query,
      fetch(`${site.url}/api/listings?${query}`, { signal: AbortSignal.timeout(20000) })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { total?: number; listings?: Card[] } | null) =>
          d && Array.isArray(d.listings) ? { total: d.total ?? d.listings.length, listings: d.listings, at: new Date() } : null,
        )
        .catch(() => null),
    );
  }
  return cache.get(query)!;
}

export const cad = (n: number) => '$' + n.toLocaleString('en-CA');
export const homeTypeOf = (c: Card) => (c.style && !/storey|apartment|other/i.test(c.style) ? c.style : c.type) || '';
