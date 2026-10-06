/**
 * Turns a whole HTML article (for example one made on onecutcontent.com or saved from an AI tool)
 * into a quick post: headline, summary, quick answer, FAQ, sources and a Markdown body. The page's
 * own styling, scripts and navigation are dropped, because the site's design replaces them.
 *
 * Runs in the browser (it needs DOMParser). Used by the TinaCMS "Import from HTML" box and by the
 * /upload/ page.
 */
import TurndownService from 'turndown';
import { tables, strikethrough } from 'turndown-plugin-gfm';

const SITE = /^https?:\/\/(www\.)?kirbychanmarkham\.com/i;

const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

/** Sections are an h2 and everything after it until the next h2. */
function sectionAfter(h2: Element): Element[] {
  const out: Element[] = [];
  let n = h2.nextElementSibling;
  while (n && n.tagName !== 'H2') {
    out.push(n);
    n = n.nextElementSibling;
  }
  return out;
}

function removeSection(h2: Element) {
  for (const el of sectionAfter(h2)) el.remove();
  h2.remove();
}

/** h2 elements, even when they sit inside wrappers such as <section>. */
function flatten(root: Element) {
  for (const wrap of Array.from(root.querySelectorAll('section, div'))) {
    if (wrap.querySelector('h2')) wrap.replaceWith(...Array.from(wrap.childNodes));
  }
}

function toSentences(s: string, max: number) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '));
  return end > 40 ? cut.slice(0, end + 1) : cut.slice(0, cut.lastIndexOf(' '));
}

export interface Imported {
  headline?: string;
  summary?: string;
  quickAnswer?: string;
  faq: { q: string; a: string }[];
  sources: { name: string; url: string }[];
  markdown: string;
  warnings: string[];
}

export function convertHtml(html: string, keepPlainSources = false): Imported {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const metaDescription = doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim();
  doc.querySelectorAll('script, style, noscript, iframe, form, button, svg, link, meta, nav, aside, footer').forEach((e) => e.remove());

  const root = doc.querySelector('article') ?? doc.querySelector('main') ?? doc.body;
  flatten(root);

  // Headline: the first h1, else the page title. The site renders its own H1.
  const h1 = root.querySelector('h1');
  const headline = text(h1) || text(doc.querySelector('title')) || undefined;
  if (h1) {
    const next = h1.nextElementSibling;
    if (next && /^by\s/i.test(text(next)) && text(next).length < 80) next.remove();
    h1.remove();
  }
  root.querySelectorAll('[class*="byline"], [class*="toc"]').forEach((e) => e.remove());

  let quickAnswer: string | undefined;
  const faq: Imported['faq'] = [];
  const sources: Imported['sources'] = [];

  for (const h2 of Array.from(root.querySelectorAll('h2'))) {
    const heading = text(h2);
    if (/^(on this page|table of contents|contents)$/i.test(heading)) {
      removeSection(h2);
    } else if (/quick answer|key takeaway|tl;?dr|in short/i.test(heading)) {
      quickAnswer = sectionAfter(h2).map(text).filter(Boolean).join(' ');
      removeSection(h2);
    } else if (/faq|frequently asked|common questions/i.test(heading)) {
      let q = '';
      for (const el of sectionAfter(h2)) {
        if (/^H[3-6]$|^DT$|^SUMMARY$/.test(el.tagName)) q = text(el);
        else if (el.tagName === 'DETAILS') {
          const summary = el.querySelector('summary');
          const question = text(summary);
          summary?.remove();
          if (question) faq.push({ q: question, a: text(el) });
        } else if (q && text(el)) {
          faq.push({ q, a: text(el) });
          q = '';
        } else if (/^q:/i.test(text(el))) {
          const m = text(el).match(/^q:\s*(.+?)\s*a:\s*(.+)$/i);
          if (m) faq.push({ q: m[1], a: m[2] });
        }
      }
      removeSection(h2);
    } else if (/^(sources|references|further reading)$/i.test(heading)) {
      for (const a of Array.from(h2.parentElement?.querySelectorAll('a') ?? [])) {
        if (!sectionAfter(h2).some((el) => el.contains(a))) continue;
        const url = a.getAttribute('href') ?? '';
        if (/^https:\/\//i.test(url)) sources.push({ name: text(a) || url, url });
      }
      // On the upload page a list of sources without links stays in the post as written, so it is not lost.
      if (sources.length || !keepPlainSources) removeSection(h2);
    }
  }

  // Links to this site become relative with a trailing slash, as the site expects.
  for (const a of Array.from(root.querySelectorAll('a[href]'))) {
    let href = a.getAttribute('href') ?? '';
    if (SITE.test(href)) href = href.replace(SITE, '') || '/';
    if (href.startsWith('/') && !/[?#.]/.test(href.split('/').pop() ?? '') && !href.endsWith('/')) href += '/';
    if (href.startsWith('#')) a.replaceWith(...Array.from(a.childNodes));
    else a.setAttribute('href', href);
  }
  // Markdown tables need a header row.
  for (const table of Array.from(root.querySelectorAll('table'))) {
    if (!table.querySelector('th')) {
      const first = table.querySelector('tr');
      first?.querySelectorAll('td').forEach((td) => {
        const th = doc.createElement('th');
        th.innerHTML = td.innerHTML;
        td.replaceWith(th);
      });
    }
  }
  // The page title is the only H1, so body headings start at H2.
  root.querySelectorAll('h4, h5, h6').forEach((h) => {
    const h3 = doc.createElement('h3');
    h3.innerHTML = h.innerHTML;
    h.replaceWith(h3);
  });

  const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '*', emDelimiter: '_', codeBlockStyle: 'fenced' });
  td.use([tables, strikethrough]);
  td.remove(['img', 'figure', 'video', 'audio', 'picture'] as any);
  let markdown = td
    .turndown(root.innerHTML)
    // MDX treats braces and angle brackets as code.
    .replace(/[{}]/g, (c) => `\\${c}`)
    .replace(/<(?![a-z/!])/gi, '&lt;')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const firstParagraph = text(root.querySelector('p'));
  let summary = metaDescription || (firstParagraph ? toSentences(firstParagraph, 280) : undefined);

  // The house style rejects long dashes and a comma before "and" or "or".
  // Both have one mechanical fix, so apply it and report what changed.
  const fixes = { dashes: 0, commas: 0 };
  const tidy = (s: string | undefined) =>
    s === undefined
      ? s
      : s
          .replace(/(\d)\s*[\u2013\u2014]\s*(\d)/g, (_m, a, b) => (fixes.dashes++, `${a} to ${b}`))
          .replace(/\s*[\u2013\u2014]\s*/g, () => (fixes.dashes++, ', '))
          .replace(/,(\s+)(and|or)\b/g, (_m, sp, w) => (fixes.commas++, `${sp}${w}`));
  const cleanHeadline = tidy(headline)?.replace(/,\s*$/, '');
  summary = tidy(summary);
  quickAnswer = tidy(quickAnswer);
  markdown = tidy(markdown)!;
  for (const f of faq) {
    f.q = tidy(f.q)!;
    f.a = tidy(f.a)!;
  }

  const all = [cleanHeadline, summary, quickAnswer, markdown, ...faq.flatMap((f) => [f.q, f.a])].join('\n');
  const warnings: string[] = [];
  if (fixes.dashes) warnings.push(`Fixed for you: ${fixes.dashes} long dash${fixes.dashes > 1 ? 'es' : ''} replaced with a comma or "to". Read those sentences once`);
  if (fixes.commas) warnings.push(`Fixed for you: ${fixes.commas} comma${fixes.commas > 1 ? 's' : ''} before "and" or "or" removed`);
  const words = markdown.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length;
  if (words < 300) warnings.push(`the post is ${words} words. Quick posts need at least 300`);
  if (/\bneighborhood|\bcenter\b|\bcolor\b/i.test(all)) warnings.push('American spelling. The site uses neighbourhood, centre and colour');
  if (/\bTODO\b/.test(all)) warnings.push('a TODO placeholder');

  return { headline: cleanHeadline, summary, quickAnswer, faq, sources, markdown, warnings };
}

const SLUG_FILLER = new Set(['a', 'an', 'and', 'the', 'to', 'of', 'in', 'for', 'or', 'what', 'how', 'why', 'with', 'your', 'you', 'need', 'should', 'is', 'are', 'on', 'at', 'from', 'by']);

/** Web address for a headline: at most eight words, never ending on a filler word ("...-what-the"). */
export const slugFor = (headline: string) =>
  headline
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['\u2019]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .split('-')
    .slice(0, 8)
    .reduceRight((kept: string[], word, i) => (kept.length || !SLUG_FILLER.has(word) || i === 0 ? [word, ...kept] : kept), [])
    .join('-') || 'new-post';

/** A first guess at the blog category from the headline, so most posts need no choice at all. */
const CATEGORY_WORDS: [string, RegExp][] = [
  ['downsizing', /downsiz|bungalow|empty nest|retire/i],
  ['new-construction', /pre-construction|new construction|new build|builder|assignment/i],
  ['condos', /condo/i],
  ['investing', /invest|rental|landlord|tenant/i],
  ['costs-and-taxes', /tax|closing cost|fee|mortgage|budget/i],
  ['moving-to-markham', /moving to|relocat|newcomer/i],
  ['market', /market|prices? (in|for)|sold prices|forecast|report/i],
  ['neighbourhoods', /neighbo(u)?rhood/i],
  ['selling', /sell|listing your|stage|staging/i],
  ['buying', /buy|first-time|first time|offer/i],
];
export const guessCategory = (headline: string) => CATEGORY_WORDS.find(([, re]) => re.test(headline))?.[0] ?? 'neighbourhoods';
