/**
 * Markham compared with a neighbouring city. Every figure is TRREB Market Watch, August 2026 or a
 * published rate. Each city has its own written analysis so no page is the same page with a name
 * swapped, which is what search engines treat as a doorway page.
 */
export type Stats = { sales: number; average: number; median: number; detSales: number; detAvg: number; condoSales: number; condoAvg: number };

export const MARKHAM: Stats = { sales: 282, average: 1208692, median: 1095000, detSales: 137, detAvg: 1611773, condoSales: 57, condoAvg: 638332 };

const TRREB = { name: 'TRREB Market Watch, August 2026', url: 'https://trreb.ca/wp-content/files/market-stats/market-watch/mw2608.pdf' };
const GO_MAP = { name: 'GO Transit, Richmond Hill line timetable and system map (Table 61)', url: 'https://assets.metrolinx.com/image/upload/v1760405204/Documents/GO/full-schedules/FS27102025/TABLE61.pdf' };
const LTT = { name: 'Ontario Ministry of Finance, Calculating land transfer tax', url: 'https://www.ontario.ca/document/land-transfer-tax/calculating-land-transfer-tax' };
const MLTT = { name: 'City of Toronto, Municipal land transfer tax rates and fees', url: 'https://www.toronto.ca/services-payments/property-taxes-utilities/municipal-land-transfer-tax-mltt/municipal-land-transfer-tax-mltt-rates-and-fees/' };

export const CITIES = [
  {
    slug: 'richmond-hill',
    name: 'Richmond Hill',
    title: 'Markham vs Richmond Hill: Prices and Commute (2026)',
    description: 'Markham or Richmond Hill? August 2026 TRREB prices by property type, land transfer tax, GO train lines and how the two York Region cities differ for buyers.',
    stats: { sales: 161, average: 1205777, median: 1068888, detSales: 74, detAvg: 1667913, condoSales: 33, condoAvg: 538509 } as Stats,
    toronto: false,
    intro:
      'Markham and Richmond Hill sit side by side in York Region and in August 2026 their overall prices were almost level. The difference is in the mix: Richmond Hill detached houses averaged more, its condo apartments averaged less and Markham simply had more of everything for sale.',
    sections: [
      {
        h: 'Prices: almost level overall, different by type',
        p: [
          'TRREB recorded a median of $1,068,888 in Richmond Hill in August 2026 against $1,095,000 in Markham. Averages were within a few thousand dollars of each other.',
          'Split by property type the picture changes. The average detached sale was $1,667,913 in Richmond Hill and $1,611,773 in Markham, while the average condo apartment was $538,509 in Richmond Hill and $638,332 in Markham. For a detached buyer, Markham was the less expensive of the two that month. For a condo buyer, Richmond Hill was.',
        ],
      },
      {
        h: 'Choice: Markham had more homes for sale',
        p: [
          'Markham recorded 282 sales in the month to Richmond Hill’s 161, including 137 detached sales to 74. A bigger market means more to compare in a given month, which matters most when you need a specific size of home or a specific neighbourhood.',
        ],
      },
      {
        h: 'Getting downtown: two different GO lines',
        p: [
          'The two cities sit on different rail lines. Markham has four stations on the Stouffville line: Mount Joy, Markham, Centennial and Unionville. Richmond Hill is served by the Richmond Hill line, with Gormley and Richmond Hill GO stations on the way to Union Station.',
          'Which works better depends on where you live and where you work. Our guide to the Markham GO train commute has the scheduled travel times from each Markham station.',
        ],
      },
      {
        h: 'Land transfer tax is the same',
        p: [
          'Neither city charges a municipal land transfer tax, so a buyer in either pays the Ontario tax only. At each city’s August 2026 median that is the figure in the table above.',
        ],
      },
    ],
    faq: [
      { q: 'Is Richmond Hill more expensive than Markham?', a: 'Overall, not in August 2026: the median was $1,068,888 in Richmond Hill and $1,095,000 in Markham (TRREB). Detached homes averaged more in Richmond Hill and condo apartments averaged less.' },
      { q: 'Do Markham and Richmond Hill have a municipal land transfer tax?', a: 'No. Buyers in both cities pay Ontario land transfer tax only. The City of Toronto charges a municipal land transfer tax on top of the provincial one.' },
      { q: 'Which GO line serves Richmond Hill?', a: 'The Richmond Hill line, including Gormley and Richmond Hill GO stations. Markham is on the Stouffville line.' },
    ],
    sources: [TRREB, GO_MAP, LTT, { name: 'GO Transit, Richmond Hill GO station', url: 'https://www.gotransit.com/en/find-a-station-or-stop/ri' }],
  },
  {
    slug: 'vaughan',
    name: 'Vaughan',
    title: 'Markham vs Vaughan: Home Prices and Transit (2026)',
    description: 'Markham or Vaughan? August 2026 TRREB prices by property type, land transfer tax, GO and subway access and how the two York Region cities compare for buyers.',
    stats: { sales: 242, average: 1234758, median: 1148750, detSales: 122, detAvg: 1671824, condoSales: 63, condoAvg: 607650 } as Stats,
    toronto: false,
    intro:
      'In August 2026 Markham and Vaughan were York Region’s two busiest markets by sales. That month Vaughan was the more expensive of the two on every measure except condo apartments and it has something Markham does not yet have: the subway.',
    sections: [
      {
        h: 'Prices: Vaughan ran higher in August 2026',
        p: [
          'TRREB recorded a median of $1,148,750 in Vaughan against $1,095,000 in Markham, a gap of $53,750. The average detached sale was $1,671,824 in Vaughan and $1,611,773 in Markham.',
          'Condo apartments went the other way: they averaged $607,650 in Vaughan and $638,332 in Markham.',
        ],
      },
      {
        h: 'Market size: similar',
        p: [
          'Markham recorded 282 sales in the month and Vaughan 242, with 137 and 122 detached sales respectively. Both give a buyer a real choice in most property types in a typical month.',
        ],
      },
      {
        h: 'Transit: the subway versus the Stouffville line',
        p: [
          'Vaughan Metropolitan Centre station, on Highway 7 in Vaughan, is on TTC Line 1, so part of Vaughan has a direct subway ride into Toronto. Vaughan also has Maple and Rutherford GO stations.',
          'Markham relies on its four Stouffville line GO stations and on YRT and Viva buses. For a buyer who works along the Yonge subway, that can decide it. For one who works downtown near Union, a Markham GO station can be just as practical.',
        ],
      },
      {
        h: 'Land transfer tax is the same',
        p: [
          'Neither city charges a municipal land transfer tax. A buyer in either pays the Ontario tax only, so on the same price the tax is identical.',
        ],
      },
    ],
    faq: [
      { q: 'Is Vaughan more expensive than Markham?', a: 'In August 2026, yes on the overall median: $1,148,750 in Vaughan and $1,095,000 in Markham (TRREB). Condo apartments averaged less in Vaughan than in Markham.' },
      { q: 'Does Vaughan have a subway?', a: 'Yes. Vaughan Metropolitan Centre station on Highway 7 is on TTC Line 1. Markham does not have a subway station.' },
      { q: 'Do Markham and Vaughan charge a municipal land transfer tax?', a: 'No. Buyers in both pay Ontario land transfer tax only.' },
    ],
    sources: [TRREB, GO_MAP, LTT, { name: 'TTC, Vaughan Metropolitan Centre station', url: 'https://www.ttc.ca/subway-stations/vaughan-metropolitan-centre-station' }],
  },
  {
    slug: 'toronto',
    name: 'Toronto',
    title: 'Markham vs Toronto: Buying a Home in 2026',
    description: 'Should you buy in Markham or Toronto? August 2026 TRREB prices, what the median really measures, land transfer tax on both and the GO commute from Markham.',
    stats: { sales: 1767, average: 979684, median: 770000, detSales: 550, detAvg: 1525749, condoSales: 885, condoAvg: 651648 } as Stats,
    toronto: true,
    intro:
      'Toronto’s median price looks far lower than Markham’s, but that number mostly reflects what sells there. Half of Toronto’s sales in August 2026 were condo apartments. Compare like with like and the gap closes, then Toronto’s second land transfer tax opens a new one.',
    sections: [
      {
        h: 'Why Toronto’s median is lower',
        p: [
          'TRREB recorded a median of $770,000 in the City of Toronto in August 2026 against $1,095,000 in Markham. But 885 of Toronto’s 1,767 sales were condo apartments, compared with 57 of Markham’s 282. A median drawn mostly from condos will sit well below one drawn mostly from houses.',
          'Like for like, the difference is much smaller. The average detached sale was $1,525,749 in Toronto and $1,611,773 in Markham and the average condo apartment was $651,648 in Toronto and $638,332 in Markham.',
        ],
      },
      {
        h: 'Toronto charges a second land transfer tax',
        p: [
          'A Toronto buyer pays Ontario land transfer tax and the City of Toronto’s municipal land transfer tax on top. A Markham buyer pays the Ontario tax only. On most prices that means the tax on a Toronto purchase is roughly double.',
          'Toronto’s municipal rates also rise steeply on homes over $3 million, from April 1, 2026. Try any price in our land transfer tax calculator.',
        ],
      },
      {
        h: 'Commuting from Markham to downtown',
        p: [
          'Markham has four GO stations on the Stouffville line, Mount Joy, Markham, Centennial and Unionville, with trains to Union Station. Our Markham GO train guide lists the scheduled times from each.',
        ],
      },
    ],
    faq: [
      { q: 'Is Markham cheaper than Toronto?', a: 'Not on the headline median, which was $770,000 in Toronto and $1,095,000 in Markham in August 2026, because half of Toronto’s sales were condo apartments. Detached homes averaged $1,525,749 in Toronto and $1,611,773 in Markham (TRREB).' },
      { q: 'Does Markham have a municipal land transfer tax like Toronto?', a: 'No. Markham buyers pay Ontario land transfer tax only. Toronto buyers pay the Ontario tax plus Toronto’s municipal land transfer tax.' },
      { q: 'How much more land transfer tax would I pay in Toronto?', a: 'On most prices, about the same amount again. On $1,100,000 a Markham buyer pays $18,475 and a Toronto buyer pays $36,950, before any first-time buyer refunds.' },
    ],
    sources: [TRREB, LTT, MLTT, GO_MAP],
  },
];
