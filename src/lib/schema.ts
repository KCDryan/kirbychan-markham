import site from '../data/site.json';
import { absolute, canonical } from './seo';
import { isoDate, isoDuration, isTodo } from './format';

const AGENT_ID = `${site.url}/#realestateagent`;
const ORG_ID = `${site.url}/#organization`;

/** Sitewide RealEstateAgent. Address is the real registered office, never Markham. */
export function realEstateAgent(areaServed: string[]) {
  const sameAs = Object.values(site.social).filter((u) => typeof u === 'string' && u.length > 0);

  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    '@id': AGENT_ID,
    name: site.name,
    url: site.url,
    telephone: site.contact.phone,
    email: site.contact.email,
    image: absolute('/og-default.png'),
    priceRange: '$$$',
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.office.street,
      addressLocality: site.office.city,
      addressRegion: site.office.region,
      postalCode: site.office.postalCode,
      addressCountry: site.office.country,
    },
    areaServed: areaServed.map((name) => ({
      '@type': 'Place',
      name,
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Markham',
        addressRegion: 'ON',
        addressCountry: 'CA',
      },
    })),
    ...(sameAs.length > 0 ? { sameAs } : {}),
    employee: {
      '@type': 'Person',
      name: site.brokerage.registrant,
      jobTitle: site.brokerage.registrationCategory,
    },
    ...(isTodo(site.brokerage.legalName)
      ? {}
      : {
          parentOrganization: {
            '@type': 'Organization',
            '@id': ORG_ID,
            name: site.brokerage.legalName,
          },
        }),
  };
}

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbList(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: canonical(c.path),
    })),
  };
}

/** Only call this when the same Q and A text is rendered visibly on the page. */
export function faqPage(faq: { q: string; a: string }[]) {
  if (faq.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}

export function blogPosting(input: {
  headline: string;
  description: string;
  path: string;
  published: Date;
  updated?: Date;
  image?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: input.headline,
    description: input.description,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical(input.path) },
    url: canonical(input.path),
    datePublished: isoDate(input.published),
    dateModified: isoDate(input.updated ?? input.published),
    image: absolute(input.image ?? '/og-default.png'),
    author: { '@id': AGENT_ID, '@type': 'RealEstateAgent', name: site.name },
    publisher: { '@id': AGENT_ID, '@type': 'RealEstateAgent', name: site.name },
  };
}

export function videoObject(input: {
  name: string;
  description: string;
  path: string;
  published: Date;
  durationMinutes: number;
  youtubeId: string;
}) {
  if (!input.youtubeId) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: input.name,
    description: input.description,
    uploadDate: isoDate(input.published),
    duration: isoDuration(input.durationMinutes),
    thumbnailUrl: [`https://i.ytimg.com/vi/${input.youtubeId}/maxresdefault.jpg`],
    embedUrl: `https://www.youtube-nocookie.com/embed/${input.youtubeId}`,
    contentUrl: `https://www.youtube.com/watch?v=${input.youtubeId}`,
    url: canonical(input.path),
    publisher: { '@id': AGENT_ID, '@type': 'RealEstateAgent', name: site.name },
  };
}

export function place(input: { name: string; description: string; path: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: `${input.name}, Markham, Ontario`,
    description: input.description,
    url: canonical(input.path),
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Markham',
      addressRegion: 'ON',
      addressCountry: 'CA',
    },
    containedInPlace: {
      '@type': 'City',
      name: 'Markham',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Markham',
        addressRegion: 'ON',
        addressCountry: 'CA',
      },
    },
  };
}
