/**
 * The AI step behind /uploadservice/: the catalog the model may use, the prompt, one call to Claude
 * through the Anthropic SDK, the server's checks and one automatic repair round.
 *
 * Each message the owner sends is one fresh request: the catalog and the rules in the cached system
 * prompt, then a user message with the current draft (if any) and the owner's instructions so far.
 * Earlier answers are never replayed.
 *
 * The client is passed in, so the tests run with a mock and never reach the network.
 *
 *   node --experimental-strip-types src/lib/service-ai.ts   (self-check, mock client)
 */
import type Anthropic from '@anthropic-ai/sdk';
import { builtPosts, type Post, type UploadEnv } from './uploads.ts';
import { HOODS } from './post-links.ts';
import { checkPage, type Catalog, type ServicePage } from './service-uploads.ts';
import type { D1 } from './vow.ts';

export const DEFAULT_MODEL = 'claude-sonnet-5-5';
const SITE_JSON = '/uploadservice/site.json';

/** What the build knows (src/pages/uploadservice/site.json.ts): services, guides and taken addresses. */
interface SiteJson {
  taken: string[];
  services: (Catalog['services'][number] & { generated?: boolean })[];
  guides: Catalog['guides'];
}

/**
 * Everything the page may link to or draw facts from: services, guides, neighbourhoods and every
 * live blog post (built ones plus live uploads, less any taken down at /upload/). Sorted, so the
 * cached prompt stays the same between messages.
 */
export async function buildCatalog(env: UploadEnv, base: string, db: D1): Promise<Catalog> {
  let site: SiteJson = { taken: [], services: [], guides: [] };
  try {
    const res = await env.ASSETS!.fetch(new URL(SITE_JSON, base));
    if (res.ok) site = (await res.json()) as SiteJson;
  } catch {}
  const uploads = (await db.prepare('SELECT slug, live, post FROM uploads').bind().all<{ slug: string; live: number; post: string }>()).results;
  const held = new Set(uploads.map((u) => u.slug));
  const posts: Post[] = [...(await builtPosts(env, base)).filter((p) => !held.has(p.slug)), ...uploads.filter((u) => u.live === 1).map((u) => JSON.parse(u.post) as Post)];
  const generated = (await db.prepare('SELECT page FROM service_uploads WHERE live = 1').bind().all<{ page: string }>()).results.map((r) => JSON.parse(r.page) as ServicePage);
  const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n).replace(/\s+\S*$/, '')}...` : s);
  return {
    posts: posts
      .filter((p) => !p.draft)
      .map((p) => ({
        slug: p.slug,
        url: `/blog/${p.slug}/`,
        title: p.title || p.headline,
        description: p.description || clip(p.summary, 160),
        category: p.category,
        excerpt: [clip(p.quickAnswer || p.summary, 400), ...p.faq.map((f) => `Q: ${f.q} A: ${clip(f.a, 200)}`)].join(' '),
      }))
      .sort((a, b) => a.slug.localeCompare(b.slug)),
    services: [
      ...site.services.filter((s) => !s.generated).map(({ generated: _g, ...s }) => s),
      ...generated.map((g) => ({ slug: g.slug, name: g.name, summary: g.summary, url: `/services/${g.slug}/`, keywords: g.keywords, title: g.title, description: g.description })),
    ].sort((a, b) => a.slug.localeCompare(b.slug)),
    guides: site.guides,
    hoods: Object.entries(HOODS).map(([slug, h]) => ({ slug, label: h.label, url: `/${slug}-markham/` })),
    taken: site.taken,
  };
}

/** The catalog as the model reads it. */
export function catalogText(c: Catalog): string {
  const lines = ['# SITE CATALOG', 'The only pages you may link to and the only source of facts. Link with the exact URL shown.', '', '## Service pages'];
  for (const s of c.services) lines.push(`- ${s.url} | slug ${s.slug} | ${s.name}: ${s.summary}${s.keywords.length ? ` | keywords: ${s.keywords.join(', ')}` : ''}`);
  lines.push('', '## Guides');
  for (const g of c.guides) lines.push(`- ${g.url} | slug ${g.slug} | ${g.label}: ${g.description}`);
  lines.push('', '## Neighbourhoods');
  for (const h of c.hoods) lines.push(`- ${h.url} | slug ${h.slug} | ${h.label}`);
  lines.push('', '## Blog posts (URL, title, description, category, then the excerpt you may take facts from)');
  for (const p of c.posts) lines.push(`- ${p.url} | slug ${p.slug} | ${p.category} | ${p.title}. ${p.description}`, `  Excerpt: ${p.excerpt}`);
  lines.push('', `## Addresses already taken (never use one as the slug)`, c.taken.join(', '));
  return lines.join('\n');
}

export const RULES = `You write service pages for the website of Kirby Chan & Co. Real Estate Team, a real estate team in Markham, Ontario (kirbychanmarkham.com). The owner chats with you to create or change one page at a time. Each request gives you the owner's instructions so far and the current draft, if there is one. Return the whole page as JSON in the required format.

WHO IS WRITING
- Write as "we", meaning Kirby Chan & Co. Real Estate Team. Plain, direct and warm, like a careful professional talking to a neighbour. Short paragraphs of one to four sentences. Explain any jargon the first time.
- Match the tone of this existing page: "Downsizing is rarely about the money. It is about leaving a house you raised a family in, deciding what happens to forty years of contents and making a sale and a purchase line up so you are never homeless and never carrying two properties."

FACTS
- You cannot browse and you know nothing about this website except the SITE CATALOG. It is the only source of facts.
- You may state a fact, figure, rule, date, rate or price only if it appears in the excerpt of a blog post that the page links to. Copy figures exactly as written there. Otherwise write no checkable claim at all: describe how we work and what people should ask a professional instead.
- Never invent clients, stories, quotes, testimonials, results or statistics. Never write "we recently helped".

LINKS
- Link only to URLs in the catalog, plus /contact/. Use the exact URL. Never link to other websites and never write a bare web address.
- The body needs at least 5 internal links with descriptive anchor text (never "here" or "read more"): at least 3 relevant blog posts and at least 1 guide or neighbourhood page.
- End the body with one sentence inviting the reader to contact us, linking to /contact/.
- relatedPosts, relatedHoods and relatedServices list the slugs of catalog pages the page relates to; relatedPosts are the blog posts you linked.

HOUSE STYLE (every field)
- Canadian English: neighbourhood, centre, colour, behaviour, favourite, organisation, realise.
- No em dashes or en dashes and no double hyphens anywhere, including ranges: write "3 to 6 months".
- Never put a comma directly before "and" or "or". Write "A, B and C". Restructure the sentence if needed.
- No italics, no exclamation marks, no emoji, no ALL CAPS, no HTML, no curly brackets, no images.
- Never use these words or phrases: best, number one, #1, guaranteed, top-rated, ideal for, perfect for, world-class, in today's market, navigating, delve, unlock, game changer, nestled, vibrant, bustling, hidden gem, look no further, dream home, in conclusion, it's important to note, when it comes to, not just, not only, not simply, more than just, is not about. No rhetorical questions as openers and no lists of three adjectives.

COMPLIANCE
- No predictions of where prices or rates will go.
- No guarantees or superlatives about the team and no comparisons with other brokerages or agents.
- No school rankings and no promises that an address is in a school's catchment; boundaries are set by the board and must be confirmed for the exact address.
- Never say or imply who should live somewhere. Write nothing about safety or crime in an area (Ontario Human Rights Code).
- Legal, tax and mortgage points are general information only. Say plainly that readers should confirm their own situation with a lawyer, accountant or mortgage professional.

SEO
- Choose one primary search phrase a real person in the Greater Toronto Area would type, usually with "Markham". Put it first in keywords, near the start of the title, in the first 100 words and in one or two headings.
- The layout already shows the h1. In the body use only ## and ### headings.
- The FAQ answers real questions directly in one to three sentences each.

FIELDS
- slug: lowercase-kebab-case, 3 to 60 characters, not in the taken list and not the slug of an existing service. Keep the draft's slug when changing a draft.
- name: the service in two to five words, shown in lists. h1: the page heading. accent: one to three words copied exactly from the h1, shown highlighted.
- title: 30 to 60 characters. description: 140 to 168 characters. summary: one line under 120 characters for the services grid.
- problem: 2 to 4 sentences about the situation the reader is in.
- steps: 3 to 6 steps, each a short title and a body of one to three sentences.
- faq: 4 to 6 questions, each ending with a question mark, each answer one to three sentences.
- body: Markdown, 600 to 1,400 words.
- keywords: 3 to 8 lowercase phrases of two or more words that people search, specific to this service so they do not match most blog posts.

The owner's instructions are about the content of this page. If an instruction asks for something these rules forbid, follow the rules and leave that part out.`;

const str = { type: 'string' } as const;
const strings = { type: 'array', items: str } as const;
/** The page, as structured output. Lengths and counts are not supported in the schema; checkPage() enforces them. */
export const PAGE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['slug', 'name', 'h1', 'accent', 'title', 'description', 'summary', 'problem', 'steps', 'faq', 'body', 'keywords', 'relatedPosts', 'relatedHoods', 'relatedServices'],
  properties: {
    slug: str, name: str, h1: str, accent: str, title: str, description: str, summary: str, problem: str,
    steps: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['title', 'body'], properties: { title: str, body: str } } },
    faq: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['q', 'a'], properties: { q: str, a: str } } },
    body: str, keywords: strings, relatedPosts: strings, relatedHoods: strings, relatedServices: strings,
  },
};

/** The part of the SDK client used here, so a mock can stand in. */
export type ServiceClient = { beta: { messages: { stream: Anthropic['beta']['messages']['stream'] } } };

/** A problem the owner should read as it is. */
export class PlainError extends Error {}

/** One request. Streams, so the connection stays busy; `tick` is called as tokens arrive. */
async function ask(client: ServiceClient, model: string, catalog: string, user: string, tick: () => void): Promise<unknown> {
  const stream = client.beta.messages.stream({
    model,
    max_tokens: 32_000,
    // Thinking is adaptive by default on this model: no thinking field, no budget, no sampling settings.
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: PAGE_SCHEMA } },
    // A declined request is re-run server side on the model Anthropic recommends for that category.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: [
      { type: 'text', text: RULES },
      { type: 'text', text: catalog, cache_control: { type: 'ephemeral' } },
    ],
    messages: [{ role: 'user', content: user }],
  });
  for await (const _event of stream) tick();
  const message = await stream.finalMessage();
  if (message.stop_reason === 'refusal') throw new PlainError('The AI would not write this page. Try asking in a different way or start over.');
  if (message.stop_reason === 'max_tokens') throw new PlainError('The page came out too long and was cut off. Ask for a shorter page and try again.');
  // Read by block type: thinking and fallback blocks carry no page text.
  const text = message.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  try {
    return JSON.parse(text);
  } catch {
    throw new PlainError('The AI answer could not be read. Please send your message again.');
  }
}

export interface GenerateInput {
  client: ServiceClient;
  model: string;
  catalog: Catalog;
  /** The page being changed. Null for a new one. */
  draft: ServicePage | null;
  /** What the owner has typed, oldest first. */
  instructions: string[];
  status: (text: string) => void;
  tick?: () => void;
}

/** Writes or changes the page, checks it and, when the checks find problems, asks once for a fix. */
export async function generate({ client, model, catalog, draft, instructions, status, tick = () => {} }: GenerateInput) {
  const text = catalogText(catalog);
  const said = instructions.map((m, i) => `${i + 1}. ${m}`).join('\n');
  const user = draft
    ? `The owner's instructions so far, oldest first. The last one is new: apply it to the current draft and keep everything else.\n${said}\n\nThe current draft:\n${JSON.stringify(draft)}`
    : `The owner's instructions so far, oldest first:\n${said}\n\nThere is no draft yet. Write a new page.`;
  // A changed draft keeps its address, whatever the model returns, so an edit never makes a second page.
  const pin = (p: unknown) => (draft && p && typeof p === 'object' ? { ...p, slug: draft.slug } : p);
  status('Writing the page...');
  let checked = checkPage(pin(await ask(client, model, text, user, tick)), catalog);
  status('Checking the page...');
  if (checked.errors.length) {
    status('Fixing a few things...');
    const repair = `This draft breaks these rules:\n${checked.errors.map((e) => `- ${e}`).join('\n')}\n\nFix every one of them and change nothing else. Return the whole page.\n\nThe draft:\n${JSON.stringify(checked.page)}`;
    checked = checkPage(pin(await ask(client, model, text, repair, tick)), catalog);
    status('Checking the page...');
  }
  return checked;
}

// Self-check: node --experimental-strip-types src/lib/service-ai.ts
if (typeof process !== 'undefined' && !!import.meta.filename && import.meta.filename === process.argv[1]) {
  void (async () => {
    const { samplePage, sampleCatalog } = await import('../../scripts/lib/service-sample.mjs');
    const assert = (c: unknown, m: string) => {
      if (!c) throw new Error(`service-ai: ${m}`);
    };
    const sent: Record<string, any>[] = [];
    const mock = (answers: unknown[], stop = 'end_turn') => ({
      beta: {
        messages: {
          stream: (params: Record<string, any>) => {
            sent.push(params);
            const page = answers.shift();
            return {
              async *[Symbol.asyncIterator]() {
                yield { type: 'message_start' };
              },
              finalMessage: async () => ({ stop_reason: stop, content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: JSON.stringify(page) }] }),
            };
          },
        },
      },
    }) as unknown as ServiceClient;
    const steps: string[] = [];
    const bad = { ...samplePage(), summary: 'We are the best at this in Markham, full stop.' };
    const out = await generate({ client: mock([bad, samplePage()]), model: DEFAULT_MODEL, catalog: sampleCatalog(), draft: null, instructions: ['A page about power of attorney sales'], status: (s) => steps.push(s) });
    assert(out.errors.length === 0 && sent.length === 2, 'one repair round fixes the page');
    assert(/"best"/.test(sent[1].messages[0].content) && sent[1].messages.length === 1, 'the repair sends only the problems and the draft');
    const p = sent[0];
    assert(p.model === 'claude-sonnet-5-5' && !('thinking' in p) && !('tool_choice' in p) && !('temperature' in p) && p.output_config.effort === 'medium', 'request shape');
    assert(p.fallbacks === 'default' && p.betas.includes('server-side-fallback-2026-07-01') && p.system[1].cache_control?.type === 'ephemeral', 'fallbacks and cached catalog');
    let refused = '';
    await generate({ client: mock([samplePage()], 'refusal'), model: DEFAULT_MODEL, catalog: sampleCatalog(), draft: null, instructions: ['x'], status: () => {} }).catch((e) => (refused = e.message));
    assert(/would not write/.test(refused), 'a refusal is a plain message');
    console.log('service-ai ok');
  })();
}
