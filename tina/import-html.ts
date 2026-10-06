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
import { convertHtml } from '../src/lib/html-import';
import { parseMDX } from '@tinacms/mdx';
import { Button, TextArea, wrapFieldsWithMeta } from 'tinacms';

const bodyField = { type: 'rich-text', name: 'body', templates: [] } as any;

/** The editor box. Paste, click Convert, check the boxes below, then Save. */
function ImportHtmlInput(props: any) {
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
  const ready = Boolean(html.trim());
  return h(
    'div',
    null,
    h(TextArea as any, {
      value: html,
      onChange: (e: any) => setHtml(e.target.value),
      placeholder: 'Paste the HTML code here, starting with <html> or <article>',
      style: { minHeight: '120px', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '13px' },
    }),
    h(
      'div',
      { style: { display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' } },
      h(Button as any, { type: 'button', variant: 'primary', size: 'medium', disabled: !ready, onClick: run }, 'Convert'),
      h('span', { style: { fontSize: '13px', color: '#6b7280' } }, ready ? 'Replaces anything already in Your post.' : 'Paste HTML above to enable.')
    ),
    error && h('p', { style: { color: '#b91c1c', fontSize: '13px', marginTop: '10px' } }, error),
    report &&
      h(
        'ul',
        { style: { fontSize: '13px', marginTop: '10px', paddingLeft: '18px', listStyle: 'disc' } },
        ...report.map((line: string, i: number) =>
          h('li', { key: i, style: { margin: '4px 0', color: line.startsWith('Fix before') ? '#b45309' : '#166534' } }, line)
        )
      )
  );
}

/** Wrapped so the label, description and spacing match every other field. */
export const ImportHtmlField = wrapFieldsWithMeta(ImportHtmlInput as any);
