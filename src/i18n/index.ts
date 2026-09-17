import en from './en.json';

/**
 * Languages the site is published in. English is the default and lives at the
 * root. Every other language lives under its own folder, for example /zh/.
 *
 * Only the pages in TRANSLATED_PATHS exist in every language. Neighbourhood
 * guides, articles, news and legal pages are English only, so the language
 * switcher sends readers of those pages to the home page of the language.
 */
export const LOCALES = {
  en: { native: 'English', english: 'English', htmlLang: 'en-CA', hreflang: 'en-CA', ogLocale: 'en_CA', dir: 'ltr', short: 'EN' },
  zh: { native: '简体中文', english: 'Chinese (Simplified)', htmlLang: 'zh-Hans', hreflang: 'zh-Hans', ogLocale: 'zh_CN', dir: 'ltr', short: '中文' },
  fr: { native: 'Français', english: 'French', htmlLang: 'fr-CA', hreflang: 'fr-CA', ogLocale: 'fr_CA', dir: 'ltr', short: 'FR' },
  fa: { native: 'فارسی', english: 'Farsi', htmlLang: 'fa', hreflang: 'fa', ogLocale: 'fa_IR', dir: 'rtl', short: 'فا' },
  ru: { native: 'Русский', english: 'Russian', htmlLang: 'ru', hreflang: 'ru', ogLocale: 'ru_RU', dir: 'ltr', short: 'RU' },
  es: { native: 'Español', english: 'Spanish', htmlLang: 'es', hreflang: 'es', ogLocale: 'es_ES', dir: 'ltr', short: 'ES' },
  el: { native: 'Ελληνικά', english: 'Greek', htmlLang: 'el', hreflang: 'el', ogLocale: 'el_GR', dir: 'ltr', short: 'EL' },
  ja: { native: '日本語', english: 'Japanese', htmlLang: 'ja', hreflang: 'ja', ogLocale: 'ja_JP', dir: 'ltr', short: 'JA' },
} as const;

export type Lang = keyof typeof LOCALES;
export type Dict = typeof en;

export const LANGS = Object.keys(LOCALES) as Lang[];
export const OTHER_LANGS = LANGS.filter((l) => l !== 'en') as Exclude<Lang, 'en'>[];

/** English paths that have a version in every language. */
export const TRANSLATED_PATHS = ['/', '/about/', '/services/', '/neighbourhoods/', '/contact/'] as const;

const dictionaries = import.meta.glob<{ default: Dict }>('./*.json', { eager: true });

export function t(lang: Lang): Dict {
  const mod = dictionaries[`./${lang}.json`];
  return mod ? mod.default : en;
}

/** The language of a URL path, taken from its first folder. */
export function langFromPath(pathname: string): Lang {
  const first = pathname.split('/')[1] ?? '';
  return (OTHER_LANGS as string[]).includes(first) ? (first as Lang) : 'en';
}

/** The English equivalent of any path: /zh/about/ becomes /about/. */
export function basePath(pathname: string): string {
  const lang = langFromPath(pathname);
  const clean = pathname.endsWith('/') ? pathname : `${pathname}/`;
  return lang === 'en' ? clean : clean.slice(lang.length + 1) || '/';
}

/** The path of an English page in another language. */
export function localePath(lang: Lang, englishPath: string): string {
  return lang === 'en' ? englishPath : `/${lang}${englishPath}`;
}

export function isTranslated(pathname: string): boolean {
  return (TRANSLATED_PATHS as readonly string[]).includes(basePath(pathname));
}

/**
 * Where the switcher should send a reader of `pathname` who picks `lang`:
 * the same page when it is translated, otherwise that language's home page.
 */
export function switchHref(pathname: string, lang: Lang): string {
  const base = basePath(pathname);
  if (isTranslated(pathname)) return localePath(lang, base);
  if (base === '/404/') return localePath(lang, '/');
  return lang === 'en' ? base : localePath(lang, '/');
}
