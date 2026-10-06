/**
 * Land transfer tax on a home with one or two single family residences.
 * Ontario rates from January 1, 2017 (ontario.ca). Toronto municipal rates from April 1, 2026 (toronto.ca).
 */
type Brackets = readonly (readonly [number, number])[];

const ONTARIO: Brackets = [
  [55000, 0.005],
  [250000, 0.01],
  [400000, 0.015],
  [2000000, 0.02],
  [Infinity, 0.025],
];

const TORONTO: Brackets = [
  [55000, 0.005],
  [250000, 0.01],
  [400000, 0.015],
  [2000000, 0.02],
  [3000000, 0.025],
  [4000000, 0.044],
  [5000000, 0.0545],
  [10000000, 0.065],
  [20000000, 0.0755],
  [Infinity, 0.086],
];

function graduated(value: number, brackets: Brackets): number {
  let tax = 0;
  let floor = 0;
  for (const [top, rate] of brackets) {
    if (value <= floor) break;
    tax += (Math.min(value, top) - floor) * rate;
    floor = top;
  }
  return Math.round(tax);
}

export const ontarioLtt = (value: number) => graduated(value, ONTARIO);
export const torontoMltt = (value: number) => graduated(value, TORONTO);

/** Maximum first-time buyer relief: the Ontario refund (ontario.ca) and the City of Toronto rebate (toronto.ca). */
export const ON_REFUND = 4000;
export const TO_REFUND = 4475;
/** Pass 0 for the Toronto tax on a home outside the City of Toronto, such as Markham, where only the Ontario refund exists. */
export const firstTimeRelief = (on: number, to: number) => Math.min(on, ON_REFUND) + Math.min(to, TO_REFUND);

// ponytail: guard against a broken table, using the worked example ontario.ca publishes ($400,000 -> $4,475).
if (ontarioLtt(400000) !== 4475) throw new Error('Ontario land transfer tax brackets are wrong');

// ponytail: self-check, run with `node --experimental-strip-types src/lib/ltt.ts`. Worked by hand from the brackets.
if (typeof process !== 'undefined' && !!import.meta.filename && import.meta.filename === process.argv[1]) {
  const eq = (got: number, want: number, what: string) => {
    if (got !== want) throw new Error(`${what}: got ${got}, expected ${want}`);
  };
  // $600,000: 275 + 1,950 + 2,250 + 200,000 x 2% (4,000) = 8,475 for each tax.
  eq(ontarioLtt(600000), 8475, 'Ontario at $600,000');
  eq(torontoMltt(600000), 8475, 'Toronto at $600,000');
  eq(firstTimeRelief(8475, 0), 4000, 'first-time buyer in Markham at $600,000');
  eq(firstTimeRelief(8475, 8475), 8475, 'first-time buyer in Toronto at $600,000');
  // $3,500,000. Ontario: 36,475 at $2,000,000 + 1,500,000 x 2.5% (37,500) = 73,975.
  // Toronto: 36,475 + 1,000,000 x 2.5% (25,000) + 500,000 x 4.4% (22,000) = 83,475.
  eq(ontarioLtt(3500000), 73975, 'Ontario at $3,500,000');
  eq(torontoMltt(3500000), 83475, 'Toronto at $3,500,000');
  // A refund never exceeds the tax itself: $200,000 is 275 + 1,450 = 1,725.
  eq(firstTimeRelief(ontarioLtt(200000), 0), 1725, 'relief capped at the tax');
  console.log('ltt ok');
}
