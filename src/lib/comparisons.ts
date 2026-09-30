/**
 * Markham compared with a neighbouring city. Figures come from src/data/trreb-monthly.json (TRREB
 * Market Watch, refreshed monthly by the update routine) or a published rate. Every sentence that
 * states or compares a price is written from those numbers, so a new month can never leave a page
 * saying "higher" when it is now lower. Each city keeps its own analysis so no page is the same page
 * with a name swapped, which is what search engines treat as a doorway page.
 */
import monthly from '../data/trreb-monthly.json';

export type Stats = { sales: number; average: number; median: number; detSales: number; detAvg: number; condoSales: number; condoAvg: number };

export const PERIOD = monthly.period;
export const MARKHAM: Stats = monthly.markham;
const M = MARKHAM;
const P = PERIOD;

const $ = (n: number) => '$' + n.toLocaleString('en-CA');
const n = (v: number) => v.toLocaleString('en-CA');
/** The name of whichever place had the lower figure. */
const lower = (a: number, aName: string, b: number, bName: string) => (a < b ? aName : bName);
const moreLess = (a: number, b: number) => (a > b ? 'more' : 'less');
/** Within 3% counts as level: one month of sales is too noisy to call a winner. */
const level = (a: number, b: number) => Math.abs(a - b) / b < 0.03;

const TRREB = { name: `TRREB Market Watch, ${P}`, url: monthly.sourceUrl };
const GO_MAP = { name: 'GO Transit, Richmond Hill line timetable and system map (Table 61)', url: 'https://assets.metrolinx.com/image/upload/v1760405204/Documents/GO/full-schedules/FS27102025/TABLE61.pdf' };
const LTT = { name: 'Ontario Ministry of Finance, Calculating land transfer tax', url: 'https://www.ontario.ca/document/land-transfer-tax/calculating-land-transfer-tax' };
const MLTT = { name: 'City of Toronto, Municipal land transfer tax rates and fees', url: 'https://www.toronto.ca/services-payments/property-taxes-utilities/municipal-land-transfer-tax-mltt/municipal-land-transfer-tax-mltt-rates-and-fees/' };

const RH: Stats = monthly.cities['richmond-hill'];
const VA: Stats = monthly.cities.vaughan;
const TO: Stats = monthly.cities.toronto;

export const CITIES = [
  {
    slug: 'richmond-hill',
    name: 'Richmond Hill',
    title: 'Markham vs Richmond Hill: Prices and Commute (2026)',
    description: `Markham or Richmond Hill? ${P} TRREB prices by property type, land transfer tax, GO train lines and how the two York Region cities differ for buyers.`,
    stats: RH,
    toronto: false,
    intro: `Markham and Richmond Hill sit side by side in York Region. In ${P} ${level(RH.median, M.median) ? 'their overall prices were almost level' : `${RH.median > M.median ? 'Richmond Hill' : 'Markham'} had the higher overall median`}. The bigger difference is in the mix of homes and Markham had ${M.sales > RH.sales ? 'more' : 'fewer'} sales that month.`,
    sections: [
      {
        h: 'Prices: overall and by type',
        p: [
          `TRREB recorded a median of ${$(RH.median)} in Richmond Hill in ${P} against ${$(M.median)} in Markham. The averages were ${$(RH.average)} and ${$(M.average)}.`,
          `Split by property type the picture can change. The average detached sale was ${$(RH.detAvg)} in Richmond Hill and ${$(M.detAvg)} in Markham, while the average condo apartment was ${$(RH.condoAvg)} in Richmond Hill and ${$(M.condoAvg)} in Markham. For a detached buyer, ${lower(RH.detAvg, 'Richmond Hill', M.detAvg, 'Markham')} was the less expensive of the two that month. For a condo buyer, ${lower(RH.condoAvg, 'Richmond Hill', M.condoAvg, 'Markham')} was.`,
        ],
      },
      {
        h: 'Choice: how many homes sold',
        p: [
          `Markham recorded ${n(M.sales)} sales in the month to Richmond Hill’s ${n(RH.sales)}, including ${n(M.detSales)} detached sales to ${n(RH.detSales)}. A bigger market means more to compare in a given month, which matters most when you need a specific size of home or a specific neighbourhood.`,
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
          `Neither city charges a municipal land transfer tax, so a buyer in either pays the Ontario tax only. At each city’s ${P} median that is the figure in the table above.`,
        ],
      },
    ],
    faq: [
      { q: 'Is Richmond Hill more expensive than Markham?', a: `On the overall median in ${P}, ${RH.median > M.median ? 'yes' : 'no'}: ${$(RH.median)} in Richmond Hill and ${$(M.median)} in Markham (TRREB). Detached homes averaged ${moreLess(RH.detAvg, M.detAvg)} in Richmond Hill and condo apartments averaged ${moreLess(RH.condoAvg, M.condoAvg)}.` },
      { q: 'Do Markham and Richmond Hill have a municipal land transfer tax?', a: 'No. Buyers in both cities pay Ontario land transfer tax only. The City of Toronto charges a municipal land transfer tax on top of the provincial one.' },
      { q: 'Which GO line serves Richmond Hill?', a: 'The Richmond Hill line, including Gormley and Richmond Hill GO stations. Markham is on the Stouffville line.' },
    ],
    sources: [TRREB, GO_MAP, LTT, { name: 'GO Transit, Richmond Hill GO station', url: 'https://www.gotransit.com/en/find-a-station-or-stop/ri' }],
  },
  {
    slug: 'vaughan',
    name: 'Vaughan',
    title: 'Markham vs Vaughan: Home Prices and Transit (2026)',
    description: `Markham or Vaughan? ${P} TRREB prices by property type, land transfer tax, GO and subway access and how the two York Region cities compare for buyers.`,
    stats: VA,
    toronto: false,
    intro: `Markham and Vaughan are two of York Region’s busiest markets, with ${n(M.sales)} and ${n(VA.sales)} sales in ${P}. That month ${VA.median > M.median ? 'Vaughan' : 'Markham'} had the higher median and Vaughan has something Markham does not yet have: the subway.`,
    sections: [
      {
        h: `Prices: ${VA.median > M.median ? 'Vaughan' : 'Markham'} ran higher in ${P}`,
        p: [
          `TRREB recorded a median of ${$(VA.median)} in Vaughan against ${$(M.median)} in Markham, a gap of ${$(Math.abs(VA.median - M.median))}. The average detached sale was ${$(VA.detAvg)} in Vaughan and ${$(M.detAvg)} in Markham.`,
          `Condo apartments averaged ${$(VA.condoAvg)} in Vaughan and ${$(M.condoAvg)} in Markham.`,
        ],
      },
      {
        h: 'Market size',
        p: [
          `Markham recorded ${n(M.sales)} sales in the month and Vaughan ${n(VA.sales)}, with ${n(M.detSales)} and ${n(VA.detSales)} detached sales respectively. Both give a buyer a real choice in most property types in a typical month.`,
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
      { q: 'Is Vaughan more expensive than Markham?', a: `On the overall median in ${P}, ${VA.median > M.median ? 'yes' : 'no'}: ${$(VA.median)} in Vaughan and ${$(M.median)} in Markham (TRREB). Condo apartments averaged ${moreLess(VA.condoAvg, M.condoAvg)} in Vaughan than in Markham.` },
      { q: 'Does Vaughan have a subway?', a: 'Yes. Vaughan Metropolitan Centre station on Highway 7 is on TTC Line 1. Markham does not have a subway station.' },
      { q: 'Do Markham and Vaughan charge a municipal land transfer tax?', a: 'No. Buyers in both pay Ontario land transfer tax only.' },
    ],
    sources: [TRREB, GO_MAP, LTT, { name: 'TTC, Vaughan Metropolitan Centre station', url: 'https://www.ttc.ca/subway-stations/vaughan-metropolitan-centre-station' }],
  },
  {
    slug: 'toronto',
    name: 'Toronto',
    title: 'Markham vs Toronto: Buying a Home in 2026',
    description: `Should you buy in Markham or Toronto? ${P} TRREB prices, what the median really measures, land transfer tax on both and the GO commute from Markham.`,
    stats: TO,
    toronto: true,
    intro: `Toronto’s median price ${TO.median < M.median ? 'looks lower than' : 'is close to'} Markham’s, but that number mostly reflects what sells there. About ${Math.round((TO.condoSales / TO.sales) * 100)}% of Toronto’s sales in ${P} were condo apartments. Compare like with like, then add Toronto’s second land transfer tax.`,
    sections: [
      {
        h: 'What Toronto’s median measures',
        p: [
          `TRREB recorded a median of ${$(TO.median)} in the City of Toronto in ${P} against ${$(M.median)} in Markham. But ${n(TO.condoSales)} of Toronto’s ${n(TO.sales)} sales were condo apartments, compared with ${n(M.condoSales)} of Markham’s ${n(M.sales)}. A median drawn mostly from condos will sit well below one drawn mostly from houses.`,
          `Like for like, the picture is different. The average detached sale was ${$(TO.detAvg)} in Toronto and ${$(M.detAvg)} in Markham and the average condo apartment was ${$(TO.condoAvg)} in Toronto and ${$(M.condoAvg)} in Markham.`,
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
      { q: 'Is Markham cheaper than Toronto?', a: `${TO.median < M.median ? 'Not on the headline median' : 'Yes on the headline median'}, which was ${$(TO.median)} in Toronto and ${$(M.median)} in Markham in ${P}, largely because so many of Toronto’s sales are condo apartments. Detached homes averaged ${$(TO.detAvg)} in Toronto and ${$(M.detAvg)} in Markham (TRREB).` },
      { q: 'Does Markham have a municipal land transfer tax like Toronto?', a: 'No. Markham buyers pay Ontario land transfer tax only. Toronto buyers pay the Ontario tax plus Toronto’s municipal land transfer tax.' },
      { q: 'How much more land transfer tax would I pay in Toronto?', a: 'On most prices, about the same amount again. On $1,100,000 a Markham buyer pays $18,475 and a Toronto buyer pays $36,950, before any first-time buyer refunds.' },
    ],
    sources: [TRREB, LTT, MLTT, GO_MAP],
  },
];
