/**
 * "Best neighbourhoods for..." hub pages. Each groups the twelve neighbourhood guides by the housing
 * and transit people in one situation ask about. Every fact on these pages comes from the
 * neighbourhood files (TRREB community figures, GO timetables, housing stock), so a hub can never
 * disagree with the guide it links to. The reasons below only restate those facts.
 *
 * Framed around homes and commutes, never around who "should" live somewhere.
 */
export type Hub = {
  slug: string;
  title: string;
  description: string;
  h1: string;
  lede: string;
  /** Which price bands to show, matched against the band names in the neighbourhood files. */
  bands: RegExp;
  bandLabel: string;
  intro: string[];
  /** Optional lead photo, a slug from src/data/photo-credits.json. */
  photo?: string;
  picks: { slug: string; why: string }[];
  harder?: { heading: string; text: string; slugs: string[] };
  outro: { heading: string; paragraphs: string[] };
  faq: { q: string; a: string }[];
};

export const HUBS: Hub[] = [
  {
    slug: 'downsizing',
    title: 'Best Neighbourhoods to Downsize in Markham (2026)',
    description: 'Where to downsize in Markham: the neighbourhoods with condo, townhome and bungalow stock, their TRREB prices for smaller homes and how close each is to GO.',
    h1: 'Where to downsize in Markham',
    lede: 'The Markham neighbourhoods with the smaller homes downsizers ask us about: condo apartments, condo and freehold townhomes and bungalows, with TRREB prices for each and how close they are to a GO train.',
    bands: /condo|townhouse|semi/i,
    bandLabel: 'Smaller-home prices, TRREB',
    intro: [
      'Downsizing is our specialty and the first question is almost never price. It is where the smaller home actually exists. Some Markham neighbourhoods are almost entirely detached houses and have very little to downsize into. Others have condo apartments, townhomes or bungalows within a few streets of the house you are leaving.',
      'The neighbourhoods below have that smaller stock. Prices are TRREB figures from the neighbourhood guides, by property type, so you can see what a condo or townhome costs in each rather than an average dragged up by detached sales.',
    ],
    picks: [
      { slug: 'downtown', why: 'Condo apartments, stacked and executive townhomes and one of the largest concentrations of newer condo buildings in the city, with Unionville GO a short distance south.' },
      { slug: 'unionville', why: 'Mid-rise condos toward Downtown Markham and executive townhomes, so you can stay near Main Street and Unionville GO in something smaller.' },
      { slug: 'markham-village', why: 'Bungalows from the 1960s to the 1990s and condo townhomes, with Markham GO on the Stouffville line.' },
      { slug: 'thornhill', why: 'Bungalows and side splits on the Markham side and condo apartments along the main corridors, with YRT and Viva on Yonge Street.' },
      { slug: 'cornell', why: 'Freehold townhomes, condo townhomes and newer condo stock in the same planned community, so you can often downsize without leaving it.' },
      { slug: 'greensborough', why: 'Freehold and stacked townhomes, condo townhomes and some condo apartments, with Mount Joy GO on the Stouffville line.' },
    ],
    harder: {
      heading: 'Where there is less to downsize into',
      text: 'These neighbourhoods are mostly detached houses with little or no condo stock. Selling here is rarely the hard part. Finding the smaller home usually means a move to one of the neighbourhoods above.',
      slugs: ['angus-glen', 'berczy-village', 'box-grove'],
    },
    outro: {
      heading: 'Plan the move before the listing',
      paragraphs: [
        'Decide the destination first, then work backwards: what the new home costs, how much time you need between two closings and when the contents have to be sorted. Our Markham downsizing guide covers the whole process and the downsizing costs post puts numbers on it.',
      ],
    },
    faq: [
      { q: 'Where can I downsize to a condo in Markham?', a: 'Downtown Markham and parts of Unionville have the largest concentration of newer condo buildings in the city. Thornhill, Greensborough and Wismer also have condo apartments and Cornell has newer condo stock alongside its townhomes.' },
      { q: 'Are there bungalows in Markham?', a: 'Yes, mainly in older neighbourhoods. Markham Village has 1960s to 1990s detached homes and bungalows and the Markham side of Thornhill has bungalows and side splits.' },
      { q: 'Can I downsize without leaving my neighbourhood?', a: 'In Cornell, Unionville and Greensborough, often yes, because the same community has townhomes or condos as well as houses. Angus Glen, Berczy Village and Box Grove have little or no condo stock, so a move to a condo usually means another part of Markham.' },
      { q: 'Do you specialise in downsizing?', a: 'Yes. Downsizing and later life moves are the core of what our team does, from pricing a long-time family home to coordinating the purchase of the smaller one.' },
    ],
  },
  {
    slug: 'families',
    title: 'Best Markham Neighbourhoods for Families (2026)',
    description: 'Markham neighbourhoods with the most detached, semi and townhome stock, their TRREB house prices and what to check about schools before you buy.',
    h1: 'Markham neighbourhoods with the most room',
    lede: 'Where Markham has the detached homes, semis and freehold townhomes growing households usually ask us about, with TRREB prices for each and what to check before you commit.',
    bands: /detached|freehold townhouse|semi/i,
    bandLabel: 'House prices, TRREB',
    intro: [
      'When a household needs more room, the search usually comes down to three things: the type of house, the price of that type and the school boundary. The neighbourhoods below are the ones in Markham with the most detached, semi-detached and freehold townhome stock.',
      'School boundaries are set by the York Region District School Board and the York Catholic District School Board and they can change. Confirm the boundary for the exact address with the board before you make an offer, rather than relying on a neighbourhood name.',
    ],
    picks: [
      { slug: 'berczy-village', why: 'Detached homes from the late 1990s onward, freehold townhomes and semis on quiet crescents, with very little condo stock.' },
      { slug: 'wismer', why: 'Detached from the early 2000s onward, freehold townhomes and semis, with Mount Joy GO nearby.' },
      { slug: 'cathedraltown', why: 'Detached and semis from the mid 2000s onward and freehold townhomes, a short drive from Highway 404.' },
      { slug: 'greensborough', why: 'Freehold and stacked townhomes, semis and detached from the mid 2000s, with Mount Joy GO on the Stouffville line.' },
      { slug: 'box-grove', why: 'Detached and freehold townhomes from the mid 2000s onward, with Highway 407 immediately south.' },
      { slug: 'cornell', why: 'Freehold townhomes, semis and detached homes on a street grid with rear lane garages and Markham Stouffville Hospital at its edge.' },
      { slug: 'angus-glen', why: 'Large detached and executive homes, some on estate lots, at the top of Markham’s price range.' },
    ],
    outro: {
      heading: 'Moving up from a condo or townhome',
      paragraphs: [
        'If you are selling one home and buying a bigger one at the same time, our upsizing guide covers bridge financing and how to time two closings.',
      ],
    },
    faq: [
      { q: 'Which Markham neighbourhoods have the most detached homes?', a: 'Berczy Village, Wismer, Cathedraltown, Box Grove and Angus Glen are mostly detached, with freehold townhomes and semis in all but Angus Glen. Each neighbourhood guide has the TRREB detached price.' },
      { q: 'How do I find out which school serves a Markham address?', a: 'Ask the York Region District School Board or the York Catholic District School Board for the exact address. Boundaries can change, so confirm before you make an offer.' },
      { q: 'Where is the most affordable house in Markham?', a: 'It depends on the type. Freehold townhouses in Greensborough and Cornell had some of the lower TRREB medians of the neighbourhoods on this site in early 2026. Each guide has the figures by property type.' },
    ],
  },
  {
    slug: 'commuters',
    photo: 'go-train',
    title: 'Best Markham Neighbourhoods for Commuters (2026)',
    description: 'Markham neighbourhoods by GO train commute: scheduled times to Union Station from each station, bus rapid transit and highway access, with TRREB prices.',
    h1: 'Markham neighbourhoods by commute',
    lede: 'Where in Markham the GO train, Viva bus rapid transit and the highways are closest, with the scheduled weekday morning time to Union Station from each neighbourhood’s station.',
    bands: /all property types/i,
    bandLabel: 'Median, all property types, TRREB',
    intro: [
      'Markham has four GO stations on the Stouffville line and Milliken GO sits just across Steeles Avenue. For a downtown commute, the station you live near decides more than the neighbourhood name. Scheduled weekday morning trains range from 35 minutes at Milliken to 57 minutes at Mount Joy.',
      'If you work along Highway 7, the 404 or the 407 rather than downtown, Viva bus rapid transit and highway access matter more than the train.',
    ],
    picks: [
      { slug: 'milliken-mills', why: 'Milliken GO, just south of Steeles in Scarborough, is 35 minutes to Union on scheduled weekday morning trains, with TTC connections at Steeles.' },
      { slug: 'unionville', why: 'Unionville GO is 41 minutes to Union on scheduled weekday morning trains, with YRT and Viva on Highway 7.' },
      { slug: 'downtown', why: 'Unionville GO is a short distance south, with Viva bus rapid transit on Highway 7 through the middle of it.' },
      { slug: 'markham-village', why: 'Markham GO is 52 minutes to Union on scheduled weekday morning trains, with YRT on Highway 7 and Markham Road.' },
      { slug: 'cornell', why: 'Cornell Bus Terminal and Viva on Highway 7, with Markham GO a short drive west.' },
      { slug: 'greensborough', why: 'Mount Joy GO on the Stouffville line, 57 minutes to Union on scheduled weekday morning trains.' },
      { slug: 'thornhill', why: 'No GO station on the Markham side, but YRT and Viva on Yonge Street and Highway 7 connect to the TTC at Steeles, with the 404 and 407 nearby.' },
    ],
    outro: {
      heading: 'Check the commute you will actually make',
      paragraphs: [
        'Timetables change and trains run less often outside peak hours. Before you buy, check the current GO schedule for your station and time of day, then drive or ride it once at rush hour. Our Markham GO train guide has the station details, parking and weekend service.',
      ],
    },
    faq: [
      { q: 'Which Markham neighbourhood has the fastest GO train to Union?', a: 'Of the stations serving the neighbourhoods on this site, Milliken GO had the shortest scheduled weekday morning time at 35 minutes. Unionville GO was 41 minutes, Markham GO 52 and Mount Joy GO 57.' },
      { q: 'How many GO stations are in Markham?', a: 'Four on the Stouffville line: Unionville, Centennial, Markham and Mount Joy. Milliken GO is just across Steeles Avenue in Toronto.' },
      { q: 'Can I commute from Markham without a car?', a: 'In parts of it. Downtown Markham and the areas around the GO stations are the realistic options, with YRT and Viva buses feeding the stations.' },
    ],
  },
];
