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
  label: string;
  title: string;
  description: string;
  h1: string;
  intro: string[];
  links: { href: string; label: string }[];
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
  },
};

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
