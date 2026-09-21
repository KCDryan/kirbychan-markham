import { defineConfig, type TinaField } from 'tinacms';

/**
 * TinaCMS, test setup. Edits blog posts, the English pillar guides and the
 * neighbourhood pages. Every frontmatter field the site uses is listed here,
 * because Tina drops any field it does not know about when it saves a file.
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

const seo: TinaField[] = [
  { type: 'string', name: 'title', label: 'SEO title (30 to 60 characters)', isTitle: true, required: true },
  { type: 'string', name: 'description', label: 'Meta description (140 to 168 characters)', required: true, ui: { component: 'textarea' } },
  { type: 'string', name: 'ogImage', label: 'Share image path (optional)' },
  { type: 'boolean', name: 'noindex', label: 'Hide from search engines' },
];

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

const slugList = (name: string, label: string): TinaField => ({ type: 'string', name, label, list: true });

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
        name: 'blog',
        label: 'Blog posts',
        path: 'src/content/blog',
        format: 'mdx',
        match: { exclude: '_*' },
        ui: { router: ({ document }) => `/blog/${document._sys.filename}/` },
        fields: [
          ...seo,
          { type: 'string', name: 'h1', label: 'H1 (20 to 90 characters)', required: true },
          { type: 'string', name: 'subtitle', label: 'Subtitle (40 to 200 characters)', required: true, ui: { component: 'textarea' } },
          {
            type: 'string',
            name: 'category',
            label: 'Category',
            required: true,
            options: ['buying', 'selling', 'neighbourhoods', 'market', 'condos', 'new-construction', 'moving-to-markham', 'downsizing', 'investing', 'costs-and-taxes'],
          },
          date('published', 'Published', true),
          date('updated', 'Updated'),
          { type: 'string', name: 'takeaway', label: 'Quick answer box (at least 120 characters)', required: true, ui: { component: 'textarea' } },
          { type: 'string', name: 'neighbourhood', label: 'Main neighbourhood slug (optional)' },
          slugList('related', 'Related neighbourhood slugs'),
          slugList('relatedServices', 'Related service slugs'),
          { type: 'string', name: 'guide', label: 'Pillar guide this post supports (optional)' },
          faq,
          sources,
          { type: 'boolean', name: 'draft', label: 'Draft (not published)' },
          body(),
        ],
      },
      {
        name: 'guides',
        label: 'Guides (English)',
        path: 'src/content/guides',
        format: 'mdx',
        // Top level files only. The fa, fr and zh translations stay out of the editor.
        match: { include: '*' },
        ui: { router: ({ document }) => `/${document._sys.filename}/` },
        fields: [
          ...seo,
          { type: 'string', name: 'h1', label: 'H1', required: true },
          { type: 'string', name: 'eyebrow', label: 'Eyebrow', required: true },
          { type: 'string', name: 'lede', label: 'Lede (60 to 320 characters)', required: true, ui: { component: 'textarea' } },
          { type: 'string', name: 'takeaway', label: 'Quick answer box', required: true, ui: { component: 'textarea' } },
          date('updated', 'Updated', true),
          slugList('related', 'Related neighbourhood slugs'),
          slugList('relatedServices', 'Related service slugs'),
          faq,
          sources,
          { type: 'boolean', name: 'draft', label: 'Draft (not published)' },
          body([
            {
              name: 'GuideCta',
              label: 'Guide call to action',
              fields: [{ type: 'string', name: 'variant', label: 'Variant', options: ['plan', 'valuation', 'call'] }],
            },
          ]),
        ],
      },
      {
        name: 'neighbourhoods',
        label: 'Neighbourhoods',
        path: 'src/content/neighbourhoods',
        format: 'mdx',
        ui: {
          router: ({ document }) =>
            document._sys.filename === 'downtown' ? '/downtown-markham/' : `/${document._sys.filename}-markham/`,
        },
        fields: [
          { type: 'string', name: 'name', label: 'Name', required: true },
          { type: 'string', name: 'h1', label: 'H1', required: true },
          { type: 'string', name: 'accent', label: 'Accent word inside the H1', required: true },
          ...seo,
          { type: 'number', name: 'order', label: 'Order', required: true },
          { type: 'string', name: 'heroEyebrow', label: 'Hero eyebrow' },
          { type: 'string', name: 'intro', label: 'Intro', required: true, ui: { component: 'textarea' } },
          { type: 'string', name: 'personality', label: 'Homepage card line', required: true },
          {
            type: 'object',
            name: 'quickStats',
            label: 'Quick stats',
            fields: [
              { type: 'string', name: 'priceRange', label: 'Price range' },
              { type: 'string', name: 'propertyTypes', label: 'Property types' },
              { type: 'string', name: 'schools', label: 'Schools' },
              { type: 'string', name: 'transit', label: 'Transit' },
              { type: 'string', name: 'commute', label: 'Commute' },
            ],
          },
          {
            type: 'object',
            name: 'priceBands',
            label: 'Price bands',
            list: true,
            ui: { itemProps: (item) => ({ label: item?.band }) },
            fields: [
              { type: 'string', name: 'band', label: 'Band' },
              { type: 'string', name: 'range', label: 'Range' },
              { type: 'string', name: 'what', label: 'What' },
            ],
          },
          slugList('nearby', 'Two nearby neighbourhood slugs'),
          slugList('relatedServices', 'Related service slugs'),
          faq,
          date('lastReviewed', 'Last reviewed'),
          sources,
          { type: 'boolean', name: 'draft', label: 'Draft (not published)' },
          body(),
        ],
      },
    ],
  },
});
