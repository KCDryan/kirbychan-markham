import { defineConfig, type TinaField } from 'tinacms';
import { ImportHtmlField } from './import-html';

/**
 * TinaCMS for agents: Quick posts only. Full blog posts, guides and
 * neighbourhood pages are edited in the repository, not here, so an agent
 * cannot change them. Every frontmatter field a quick post uses is listed
 * here, because Tina drops any field it does not know about when it saves.
 *
 * Edits are committed to the branch the admin was built from. On a Cloudflare
 * preview of the tina-cms-test branch that is tina-cms-test, never main.
 */
const branch = process.env.TINA_BRANCH || process.env.CF_PAGES_BRANCH || process.env.HEAD || 'tina-cms-test';

// Dates are stored as YYYY-MM-DD, which is what scripts/check-blog.mjs expects.
const date = (name: string, label: string, required = false): TinaField => ({
  type: 'datetime',
  name,
  label,
  required,
  ui: {
    dateFormat: 'YYYY-MM-DD',
    parse: (value) => (value ? new Date(value as string).toISOString().slice(0, 10) : value),
  },
});

const faq: TinaField = {
  type: 'object',
  name: 'faq',
  label: 'FAQ',
  list: true,
  ui: { itemProps: (item) => ({ label: item?.q }) },
  fields: [
    { type: 'string', name: 'q', label: 'Question (end with ?)', required: true },
    { type: 'string', name: 'a', label: 'Answer', required: true, ui: { component: 'textarea' } },
  ],
};

const sources: TinaField = {
  type: 'object',
  name: 'sources',
  label: 'Sources (full https URLs)',
  list: true,
  ui: { itemProps: (item) => ({ label: item?.name }) },
  fields: [
    { type: 'string', name: 'name', label: 'Name', required: true },
    { type: 'string', name: 'url', label: 'URL', required: true },
  ],
};

const body = (templates: any[] = []): TinaField => ({
  type: 'rich-text',
  name: 'body',
  label: 'Body',
  isBody: true,
  templates,
});

export default defineConfig({
  branch,
  clientId: process.env.TINA_CLIENT_ID,
  token: process.env.TINA_TOKEN,
  build: { outputFolder: 'admin', publicFolder: 'public' },
  media: { tina: { mediaRoot: 'uploads', publicFolder: 'public' } },
  schema: {
    collections: [
      {
        name: 'quickPosts',
        label: 'Quick posts (agents)',
        path: 'src/content/blog/quick',
        format: 'mdx',
        match: { exclude: '_*' },
        defaultItem: () => ({ published: new Date().toISOString(), category: 'buying' }),
        ui: {
          // No router: a new post is not on the site until the build finishes a few
          // minutes after Save, so a live preview would only ever show a 404.
          // The web address comes from the headline, so agents never type a file name.
          filename: {
            readonly: true,
            slugify: (values) =>
              String(values?.headline ?? '')
                .toLowerCase()
                .normalize('NFKD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/['\u2019]/g, '')
                .replace(/&/g, ' and ')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .split('-')
                .slice(0, 8)
                .join('-') || 'new-post',
          },
        },
        fields: [
          {
            // Never saved: the box converts pasted HTML into the fields below.
            type: 'string',
            name: 'importHtml',
            label: 'Import from HTML (optional)',
            description:
              'Have the post as an HTML page? Paste the whole HTML code and click Convert. It fills in the post with its headings, bold, lists, tables and links, plus any headline, summary, quick answer, FAQ and sources it finds.',
            ui: { component: ImportHtmlField as any },
          },
          {
            type: 'string',
            name: 'headline',
            label: 'Headline',
            description: 'The title of your post, 10 to 90 characters. It also becomes the web address.',
            isTitle: true,
            required: true,
          },
          {
            type: 'string',
            name: 'summary',
            label: 'Summary',
            description: 'One or two sentences, 50 to 300 characters. Shown under the headline, on the blog page and in Google.',
            required: true,
            ui: { component: 'textarea' },
          },
          {
            type: 'string',
            name: 'category',
            label: 'Category',
            required: true,
            options: [
              { value: 'buying', label: 'Buying' },
              { value: 'selling', label: 'Selling' },
              { value: 'neighbourhoods', label: 'Neighbourhoods' },
              { value: 'market', label: 'Market' },
              { value: 'condos', label: 'Condos' },
              { value: 'new-construction', label: 'New construction' },
              { value: 'moving-to-markham', label: 'Moving to Markham' },
              { value: 'downsizing', label: 'Downsizing' },
              { value: 'investing', label: 'Investing' },
              { value: 'costs-and-taxes', label: 'Costs and taxes' },
            ],
          },
          { type: 'string', name: 'author', label: 'Your name', description: 'Shown as the author of the post.', required: true },
          { type: 'string', name: 'authorTitle', label: 'Your title (optional)', description: 'For example Sales Representative or Broker.' },
          date('published', 'Date'),
          {
            type: 'string',
            name: 'quickAnswer',
            label: 'Quick answer box (optional)',
            description: 'Two to four sentences that answer the question in the headline. Shown in a box at the top of the post.',
            ui: { component: 'textarea' },
          },
          { ...faq, label: 'FAQ (optional)', description: 'Three to six questions readers ask, each ending with a question mark.' } as TinaField,
          { ...sources, label: 'Sources (optional)', description: 'Where your figures and rules come from. Full https links.' } as TinaField,
          {
            type: 'string',
            name: 'related',
            label: 'Neighbourhoods this post is about (optional)',
            list: true,
            options: [
              { value: 'angus-glen', label: 'Angus Glen' },
              { value: 'berczy-village', label: 'Berczy Village' },
              { value: 'box-grove', label: 'Box Grove' },
              { value: 'cathedraltown', label: 'Cathedraltown' },
              { value: 'cornell', label: 'Cornell' },
              { value: 'downtown', label: 'Downtown Markham' },
              { value: 'greensborough', label: 'Greensborough' },
              { value: 'markham-village', label: 'Markham Village' },
              { value: 'milliken-mills', label: 'Milliken Mills' },
              { value: 'thornhill', label: 'Thornhill' },
              { value: 'unionville', label: 'Unionville' },
              { value: 'wismer', label: 'Wismer' },
            ],
          },
          {
            type: 'string',
            name: 'relatedServices',
            label: 'Services this post relates to (optional)',
            list: true,
            options: [
              { value: 'first-time-buyers', label: 'First time buyers' },
              { value: 'downsizing', label: 'Downsizing' },
              { value: 'upsizing', label: 'Upsizing' },
              { value: 'relocation', label: 'Relocation' },
              { value: 'luxury', label: 'Luxury homes' },
              { value: 'new-construction', label: 'New construction' },
              { value: 'investors', label: 'Investors' },
              { value: 'estate-sales', label: 'Estate sales' },
              { value: 'separation-and-divorce', label: 'Separation and divorce' },
            ],
          },
          {
            type: 'boolean',
            name: 'draft',
            label: 'Save as draft (not published yet)',
            description:
              'Leave off to publish. The post is live about five minutes after Save. Long dashes, commas before "and" or "or" and American spellings are fixed automatically. If it does not appear, kirbychanmarkham.com/admin/status.html says why.',
          },
          {
            ...body(),
            label: 'Your post',
            description: 'At least 300 words. Paste from Word, Google Docs or anywhere else. Use Heading 2 for section titles.',
          } as TinaField,
        ],
      },
    ],
  },
});
