/**
 * A realistic generated service page and a small catalog for the tests only
 * (scripts/test-uploadservice.mjs and the self-checks). It is never written into src/content by
 * itself: the end-to-end test places it in a temporary copy and removes it afterwards.
 * Every link points at a real page on the site.
 */
const para = (...s) => s.join(' ');

export function sampleCatalog() {
  const post = (slug, title, description, category, excerpt) => ({ slug, url: `/blog/${slug}/`, title, description, category, excerpt });
  return {
    posts: [
      post('power-of-attorney-sell-house-ontario', 'Can a Power of Attorney Sell a House in Ontario?', 'When an attorney for property can sell a parent\'s house in Ontario and what the lawyer and the buyer will ask for.', 'selling', 'An attorney for property can usually sign for the owner while the owner is alive. A will takes over only after death.'),
      post('selling-a-parents-house-markham', 'Selling a Parent\'s House in Markham: Who Signs', 'Who signs when a parent\'s Markham house is sold: the owner, an attorney for property or an estate trustee.', 'selling', 'The person who signs depends on whether the parent is alive and able to decide.'),
      post('parent-moving-to-retirement-home-house', 'Parent Moving to a Retirement Home: What About the House', 'What happens to the family house when a parent moves to a retirement home in Markham.', 'downsizing', 'Families often sell after the move rather than before it.'),
      post('selling-house-in-probate-ontario', 'Selling a House in Probate in Ontario: Steps', 'The steps to sell a house in probate in Ontario, from the certificate to closing.', 'selling', 'Estate administration tax is 1.5% of the value above $50,000.'),
      post('closing-costs-buying-home-markham', 'Closing Costs for Ontario Home Buyers in Markham', 'What buyers pay at closing in Markham.', 'costs-and-taxes', 'Legal fees and land transfer tax come first.'),
      post('condo-fees-markham', 'Condo Fees in Markham: What You Pay For', 'What condo fees cover in Markham.', 'condos', 'Fees cover common areas and the reserve fund.'),
    ],
    services: [{ slug: 'estate-sales', name: 'Estate sales', summary: 'Selling a home after a death.', url: '/selling-an-estate-home-markham/', keywords: [] }],
    guides: [{ slug: 'selling-an-estate-home-markham', label: 'Markham Estate Home Guide', url: '/selling-an-estate-home-markham/', description: 'Selling an estate home in Markham.' }],
    hoods: [{ slug: 'unionville', label: 'Unionville', url: '/unionville-markham/' }],
    taken: ['downsizing-markham', 'estate-sales', 'unionville-markham', 'contact', 'services'],
  };
}

export function samplePage() {
  const body = [
    '## How a power of attorney home sale works',
    para(
      'A power of attorney home sale starts with one question: who has the legal right to sign. When a parent is alive but can no longer manage their affairs, the person named as attorney for property usually signs the listing agreement and the agreement of purchase and sale on their behalf.',
      'Our post on [whether a power of attorney can sell a house in Ontario](/blog/power-of-attorney-sell-house-ontario/) explains the document itself and [selling a parent\'s house in Markham](/blog/selling-a-parents-house-markham/) sets out who signs in each situation.',
      'This is general information about how we work. A lawyer should confirm what your document allows before anything is signed.'
    ),
    para(
      'Families usually come to us after a hard conversation. A parent has moved into care or needs to, the house is empty for the first time in decades and somebody has to decide what happens next.',
      'We start by listening. Then we explain the order things usually happen in so the family can plan with a clear head.'
    ),
    '## Before the house is listed',
    para(
      'The first step is a call with the family and their lawyer. The lawyer reviews the power of attorney, confirms it is valid and tells everyone whether anything else is needed.',
      'We do not list a house until that is settled, because a buyer\'s lawyer will ask the same questions later and a delay at that stage can put the sale at risk.'
    ),
    para(
      'Next we look at the house as a buyer will. A home that has been lived in for many years often needs a careful clean, some small repairs and a plan for the contents.',
      'We tell you plainly which jobs are worth doing before a sale and which ones a buyer will simply look past.'
    ),
    para(
      'If the parent has moved to a retirement home, our post on [what happens to the house when a parent moves to a retirement home](/blog/parent-moving-to-retirement-home-house/) covers the timing questions families ask most.',
      'Selling after the move, once the house is empty, is often calmer for everyone.'
    ),
    '### Keeping the whole family informed',
    para(
      'One person signs, but several people usually care about the outcome. Brothers and sisters may live in other cities and some may feel strongly about the house.',
      'We send the same written updates to everyone the attorney names, so nobody hears about an offer second hand.'
    ),
    para(
      'Where the family disagrees, we stay with the facts: what the market shows for similar homes nearby and what the attorney is allowed to do.',
      'We will say so plainly if we think a decision should go back to the lawyer first.'
    ),
    '## Pricing and selling the home',
    para(
      'An attorney for property has a duty to act in the owner\'s interest. In practice that means a fair price, reached through proper exposure to the market, with a clear record of how the decision was made.',
      'We prepare that record for you: the comparable sales we relied on, the marketing we did and every offer that came in.'
    ),
    para(
      'We market the home the same way we would market any other house in Markham. Good photographs, an honest description and enough time on the market for serious buyers to see it.',
      'Older homes in established areas such as [Unionville](/unionville-markham/) draw buyers who are looking for a lot and a location, so we price and present the house with that buyer in mind.'
    ),
    para(
      'When offers arrive we go through each one with the attorney line by line. Price matters. So do the conditions, the deposit and the closing date.',
      'A longer closing can make a real difference for a family that still has to clear a house.'
    ),
    '## When the owner passes away during the sale',
    para(
      'A power of attorney ends when the owner dies. From that moment the estate trustee named in the will has authority over the house and the sale may need to pause while the estate is sorted out.',
      'Our guide to [selling an estate home in Markham](/selling-an-estate-home-markham/) and our post on [selling a house in probate in Ontario](/blog/selling-house-in-probate-ontario/) explain what changes and what the lawyer will need.'
    ),
    para(
      'We raise this possibility early and gently. Families are rarely ready to think about it, but knowing the plan in advance avoids a scramble at the worst possible time.'
    ),
    '## What we take off your plate',
    para(
      'Most families doing this are also working, caring for a parent and often living somewhere else. We can coordinate cleaners, movers and the people who handle the contents of a house.',
      'We arrange showings around the family\'s schedule and keep the house secure while it is empty.'
    ),
    para(
      'We also keep the paperwork tidy. Every document the lawyer needs at closing is gathered in one place, so the attorney is not chasing signatures in the final week.'
    ),
    para(
      'If you are looking after a parent\'s home and are unsure where to start, [contact us](/contact/) for a quiet conversation about your situation and the steps that come next.'
    ),
  ].join('\n\n');
  return {
    slug: 'power-of-attorney-home-sale',
    name: 'Power of attorney sales',
    h1: 'Selling a home under power of attorney in Markham',
    accent: 'power of attorney',
    title: 'Power of Attorney Home Sale in Markham: How It Works',
    description: 'How a power of attorney home sale works in Markham: who signs, what the lawyer checks, how we price and sell the house and how we keep the family informed.',
    summary: 'Selling a parent\'s home when you hold their power of attorney.',
    problem: 'A parent can no longer manage their own affairs and the house has to be sold. The person holding the power of attorney has to sign, keep the family informed and show the price was fair. Most people do this once, under pressure and while caring for someone they love.',
    steps: [
      { title: 'Confirm the authority', body: 'Your lawyer checks the power of attorney before anything is listed, so a buyer\'s lawyer finds nothing to question later.' },
      { title: 'Prepare the house', body: 'We agree which small jobs are worth doing, plan the contents and set a timeline that suits the family.' },
      { title: 'Price it on the evidence', body: 'We price from comparable sales and keep a written record of how the price was reached, for the attorney\'s file.' },
      { title: 'Sell and close', body: 'We review every offer with the attorney line by line and gather what the lawyer needs for closing.' },
    ],
    faq: [
      { q: 'Can a power of attorney sell a house in Ontario?', a: 'Usually yes, when the document covers property and the owner is alive. A lawyer should confirm what your document allows.' },
      { q: 'Who signs the listing agreement?', a: 'The attorney for property signs on the owner\'s behalf. We explain each document before it is signed.' },
      { q: 'What happens if the owner dies before closing?', a: 'The power of attorney ends at death and the estate trustee takes over. The lawyer will explain what that means for the sale.' },
      { q: 'Do other family members have a say?', a: 'Legally the attorney decides, but we keep everyone the attorney names informed with the same written updates.' },
    ],
    body,
    keywords: ['power of attorney home sale', 'power of attorney sell house', 'selling a parent\'s house', 'selling an estate home'],
    relatedPosts: [],
    relatedHoods: ['unionville'],
    relatedServices: ['estate-sales'],
  };
}
