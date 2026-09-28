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

// ponytail: guard against a broken table, using the worked example ontario.ca publishes ($400,000 -> $4,475).
if (ontarioLtt(400000) !== 4475) throw new Error('Ontario land transfer tax brackets are wrong');
