/**
 * "Import from HTML" for Quick posts.
 *
 * An agent pastes a whole HTML article, for example one saved from an AI tool
 * or another site. This turns it into the post body the editor understands
 * (headings, bold, lists, tables and links) and fills the other boxes it can
 * find: headline, summary, quick answer, FAQ and sources. The page's own
 * styling, scripts and navigation are dropped, because the site's design
 * replaces them.
 *
 * It runs in the browser inside the TinaCMS editor. Nothing is saved until the
 * agent clicks Save.
 */
import React from 'react';
import TurndownService from 'turndown';
import { tables, strikethrough } from 'turndown-plugin-gfm';
import { parseMDX } from '@tinacms/mdx';

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

export function convertHtml(html: string): Imported {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const metaDescription = doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim();
  doc.querySelectorAll('script, style, noscript, iframe, form, button, svg, link, meta, nav, aside, footer').forEach((e) => e.remove());

  const root = doc.querySelector('article') ?? doc.querySelector('main') ?? doc.body;
  flatten(root);

  // Headline: the first h1, or the page title. The site renders its own H1.
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
      removeSection(h2);
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

const bodyField = { type: 'rich-text', name: 'body', templates: [] } as any;

/** The editor box. Paste, click Convert, check the boxes below, then Save. */
export function ImportHtmlField(props: any) {
  const [html, setHtml] = React.useState('');
  const [report, setReport] = React.useState<string[] | null>(null);
  const [error, setError] = React.useState('');

  const run = () => {
    setError('');
    try {
      const r = convertHtml(html);
      const form = props.form ?? props.tinaForm?.finalForm;
      const values = { ...(form.getState().values ?? {}) };
      if (r.headline && !values.headline) values.headline = r.headline.slice(0, 90);
      if (r.summary && !values.summary) values.summary = r.summary.slice(0, 300);
      if (r.quickAnswer && !values.quickAnswer) values.quickAnswer = r.quickAnswer;
      if (r.faq.length) values.faq = r.faq;
      if (r.sources.length) values.sources = r.sources;
      values.body = parseMDX(r.markdown, bodyField, (s) => s);
      // The rich text editor only redraws when the form is reset, so reset it
      // with the imported values, then mark it changed so Save is available.
      form.reset(values);
      form.change('importHtml', '');
      const filled = [
        r.headline && 'headline',
        r.summary && 'summary',
        r.quickAnswer && 'quick answer',
        r.faq.length && `${r.faq.length} FAQ`,
        r.sources.length && `${r.sources.length} sources`,
        'the post',
      ].filter(Boolean);
      setReport([`Filled in: ${filled.join(', ')}. Check each box below, pick a category and add your name.`, ...r.warnings.map((w) => (w.startsWith('Fixed') ? `${w}.` : `Fix before saving: ${w}.`))]);
      setHtml('');
    } catch (e: any) {
      setError(`Could not convert this HTML: ${e?.message ?? e}`);
    }
  };

  const h = React.createElement;
  return h(
    'div',
    { style: { marginBottom: '1.5rem', padding: '1rem', border: '1px dashed #94a3b8', borderRadius: 8, background: '#f8fafc' } },
    h('label', { style: { display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 4 } }, 'Import from HTML (optional)'),
    h(
      'p',
      { style: { fontSize: 12, color: '#64748b', margin: '0 0 8px' } },
      'Have the post as an HTML page? Paste the whole HTML code here and click Convert. It fills in the post with its headings, bold, lists, tables and links, plus any headline, summary, quick answer, FAQ and sources it finds.'
    ),
    h('textarea', {
      value: html,
      onChange: (e: any) => setHtml(e.target.value),
      rows: 5,
      placeholder: '<html> ... paste the HTML code here ... </html>',
      style: { width: '100%', fontFamily: 'monospace', fontSize: 12, padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 },
    }),
    h(
      'button',
      {
        type: 'button',
        onClick: run,
        disabled: !html.trim(),
        style: { marginTop: 8, padding: '6px 14px', borderRadius: 6, border: 0, background: html.trim() ? '#1F5045' : '#94a3b8', color: '#fff', fontWeight: 600, cursor: html.trim() ? 'pointer' : 'default' },
      },
      'Convert'
    ),
    error && h('p', { style: { color: '#b91c1c', fontSize: 12, marginTop: 8 } }, error),
    report &&
      h(
        'ul',
        { style: { fontSize: 12, marginTop: 8, paddingLeft: 18 } },
        ...report.map((line, i) => h('li', { key: i, style: { color: line.startsWith('Fix before') ? '#b45309' : '#166534' } }, line))
      )
  );
}
