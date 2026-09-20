/**
 * Translation guard for the pillar guides.
 *
 * A translated guide is a regulated document in a language the owner may not
 * read, so two classes of mistake have to be caught mechanically rather than by
 * eye:
 *
 *   1. Stray script. A word left behind from another language, or the wrong
 *      alphabet pasted in, is invisible to anyone who does not read the target
 *      language. Anything outside the expected script for the file fails.
 *   2. Invented or drifted figures. Every number in a translation must also
 *      appear in the English source it was translated from.
 *
 * Numbers are compared by value rather than by spelling, because each language
 * writes them differently: English "$1.5 million", French "1 500 000 $" with
 * spaces, Chinese "150 万" in units of ten thousand and Farsi "۱٬۵۰۰٬۰۰۰" in
 * Persian digits are all the same figure.
 *
 * Usage: node scripts/check-translations.mjs
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const GUIDES = 'src/content/guides';
const LANGS = ['zh', 'fr', 'fa'];
/** Below this, numbers are list markers and dates rather than claims. */
const MIN_VALUE = 10;
const problems = [];
const fail = (file, message) => problems.push(`  ${file}: ${message}`);

/** Characters each language is expected to be written in. */
const SCRIPTS = {
  zh: /[一-鿿]/,
  fr: /[A-Za-zÀ-ÿ]/,
  fa: /[؀-ۿ]/,
};

/** Scripts that must never appear in any of these files. */
const FOREIGN = [
  { name: 'Cyrillic', re: /[Ѐ-ӿ]/g },
  { name: 'Greek', re: /[Ͱ-Ͽ]/g },
  { name: 'Hebrew', re: /[֐-׿]/g },
  { name: 'Hangul', re: /[가-힯]/g },
  { name: 'Devanagari', re: /[ऀ-ॿ]/g },
  { name: 'Thai', re: /[฀-๿]/g },
];

/** Persian and Arabic-Indic digits and separators to their ASCII equivalents. */
function toAsciiDigits(text) {
  return text
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[٫٬٪]/g, (s) => (s === '٫' ? '.' : ''));
}

/**
 * Every figure in the text as a numeric value. Handles digit groups separated
 * by commas or spaces, and the scale words each language uses.
 */
function values(text) {
  let t = toAsciiDigits(text);
  // Join digit groups written with separators: 1 095 000 and 1,095,000.
  t = t.replace(/(\d)[\s   ,](?=\d{3}(?!\d))/g, '$1');
  while (/(\d)[\s   ,](?=\d{3}(?!\d))/.test(t)) {
    t = t.replace(/(\d)[\s   ,](?=\d{3}(?!\d))/g, '$1');
  }

  // French writes decimals with a comma: 1,5 million is 1.5 million.
  t = t.replace(/(\d),(\d)(?!\d\d)/g, '$1.$2');

  const out = new Set();
  const add = (n) => {
    if (Number.isFinite(n) && Math.abs(n) >= MIN_VALUE) out.add(Math.round(n * 100) / 100);
  };

  // Scale words, so "1.5 million", "150 万" and "۱٫۵ میلیون" all resolve to the
  // same value. Each match is then removed, so the bare digits before the scale
  // word are not counted a second time as a figure of their own.
  const scales = [
    { re: /(\d+(?:\.\d+)?)\s*(?:millions?|میلیون)/gi, factor: 1e6 },
    { re: /(\d+(?:\.\d+)?)\s*亿/g, factor: 1e8 },
    { re: /(\d+(?:\.\d+)?)\s*万/g, factor: 1e4 },
    { re: /(\d+(?:\.\d+)?)\s*(?:thousand|هزار)/gi, factor: 1e3 },
  ];
  for (const { re, factor } of scales) {
    for (const m of t.matchAll(re)) add(parseFloat(m[1]) * factor);
    t = t.replace(re, ' ');
  }

  for (const m of t.matchAll(/\d+(?:\.\d+)?/g)) add(parseFloat(m[0]));
  return out;
}

const english = new Map();
for (const name of await readdir(GUIDES)) {
  if (name.endsWith('.mdx')) english.set(name.replace(/\.mdx$/, ''), await readFile(join(GUIDES, name), 'utf8'));
}

let checked = 0;
for (const lang of LANGS) {
  let names = [];
  try {
    names = await readdir(join(GUIDES, lang));
  } catch {
    continue;
  }

  for (const name of names.filter((n) => n.endsWith('.mdx'))) {
    const slug = name.replace(/\.mdx$/, '');
    const file = `${GUIDES}/${lang}/${name}`;
    const text = await readFile(file, 'utf8');
    checked++;

    const source = english.get(slug);
    if (!source) {
      fail(file, `no English guide at ${GUIDES}/${slug}.mdx to check against`);
      continue;
    }

    for (const { name: script, re } of FOREIGN) {
      const hits = text.match(re);
      if (hits) fail(file, `contains ${script} characters: ${[...new Set(hits)].join('')}`);
    }
    if (lang !== 'zh') {
      const cjk = text.match(/[一-鿿]/g);
      if (cjk) fail(file, `contains Chinese characters: ${[...new Set(cjk)].join('')}`);
    }
    if (lang !== 'fa') {
      const arabic = text.match(/[؀-ۿ]/g);
      if (arabic) fail(file, `contains Arabic script: ${[...new Set(arabic)].join('')}`);
    }
    if (!SCRIPTS[lang].test(text)) fail(file, `does not appear to be written in ${lang}`);

    const known = values(source);
    const invented = [...values(text)].filter((n) => !known.has(n));
    if (invented.length > 0) {
      fail(file, `figure(s) not in the English guide: ${invented.join(', ')}`);
    }
  }
}

if (problems.length > 0) {
  console.error(`Translation check failed with ${problems.length} problem(s):`);
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`Translation check passed for ${checked} translated guide(s).`);
