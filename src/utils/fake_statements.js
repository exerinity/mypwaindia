const PENSIONS = [
  'PENSION PMT - FORD MOTOR CO', 'PENSION PMT - US STEEL CORP',
  'PENSION PMT - AT&T INC', 'PENSION PMT - GENERAL ELECTRIC',
];

const PREMIUMS = [
  'MEDICARE SUPPLEMENT PMT', 'BLUE CROSS BLUE SHIELD',
  'UNITED HEALTHCARE PMT', 'AARP MEDICARE RX PLAN',
];

const CABLE = ['COMCAST CABLE SVC', 'DIRECTV SUBSCRIPTION'];

const CHURCHES = ['FIRST BAPTIST CHURCH', 'ST MARY\'S CATHOLIC CHURCH', 'GRACE LUTHERAN CHURCH'];

const GROCERS = ['KROGER #7712', 'PUBLIX #3388', 'PIGGLY WIGGLY #0044', 'ALDI FOODS #2201'];

const RESTAURANTS = [
  'DENNY\'S RESTAURANT', 'CRACKER BARREL #0882', 'IHOP #3341', 'BOB EVANS #0771',
  'VILLAGE INN #0992', 'PERKINS RESTAURANT', 'LUBY\'S CAFETERIA',
];

const PHARMACIES = ['CVS PHARMACY #6630', 'WALGREENS #5521', 'RITE AID PHARMACY'];

const MEDICAL = [
  'DR HAROLD SIMMONS MD', 'PHYSICAL THERAPY ASSOC',
  'VISION CENTER OF AMERICA', 'MIDWEST FAMILY PRACTICE',
];

const HOSPITALS = ['MERCY GENERAL HOSPITAL', 'MIDWEST CARDIOLOGY ASSOC', 'ST FRANCIS MEDICAL CTR'];

const FAMILY = [
  'CHECK - DOROTHY M HENDERSON', 'MYPAYINDIA TO LINDA MAE FOSTER',
  'TRANSFER TO MICHAEL T HENDERSON', 'TRANSFER TO GRANDCHILD EMILY',
  'WIRE TO ROBERT J PAULSON JR', 'CHECK - ELEANOR FAYE TUCKER',
  'MYPAYINDIA TO PATRICIA ANN REEVES',
];

const MAINTENANCE = [
  'HOME DEPOT #4471', 'ACE HARDWARE #221', 'TRUGREEN LAWN CARE',
  'SEARS HOME SERVICES', 'ROTO-ROOTER PLUMBING',
];

const MISC = ['US POSTAL SERVICE', 'HALLMARK GOLD CROWN', 'READERS DIGEST SUBSCR'];

function createRng(seed) {
  let s = (Number(seed) || 1) >>> 0;
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = (s ^ (s >>> 16)) >>> 0;
    return s / 0x100000000;
  };
}

/** @param {number} count @param {number | null} [seed] @returns {{ id: number; description: string; amount: number; date: Date }[]} */
export function generateStatements(count = 30, seed = null) {
  const rng = seed != null ? createRng(seed) : Math.random.bind(Math);

  const randInt = (min, max) => Math.floor(rng() * (max - min + 1)) + min;
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const chance = (p) => rng() < p;

  const now = new Date();
  const nowTs = now.getTime();

  const ss = randInt(128000, 188000);
  const hasPension = chance(0.45);
  const pension = hasPension ? { label: pick(PENSIONS), amount: randInt(70000, 180000) } : null;
  const va = !hasPension && chance(0.3) ? randInt(58000, 150000) : 0;

  const premium = { label: pick(PREMIUMS), amount: randInt(16000, 36000) };
  const electric = randInt(6200, 15000);
  const water = randInt(2600, 6600);
  const gas = randInt(2200, 8800);
  const phone = randInt(4000, 7000);
  const cable = { label: pick(CABLE), amount: randInt(7000, 14000) };
  const insurance = randInt(8500, 16500);
  const church = { label: pick(CHURCHES), amount: randInt(3500, 14000) };
  const propertyTax = randInt(70000, 300000);
  const pharmacy = pick(PHARMACIES);
  const grocers = [pick(GROCERS), pick(GROCERS)];

  const entries = [];
  const at = (y, mo, d) => new Date(y, mo, d, 9, 0, 0).getTime();
  const add = (ts, description, amount) => { if (ts <= nowTs) entries.push({ description, amount, ts }); };

  for (let m = 0; entries.length < count && m < 1200; m++) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const y = d.getFullYear();
    const mo = d.getMonth();
    const daysIn = new Date(y, mo + 1, 0).getDate();
    const day = (n) => Math.min(n, daysIn);
    const rday = (min, max) => randInt(day(min), day(max));

    add(at(y, mo, day(3)), 'SOCIAL SECURITY ADMIN', ss);
    if (pension) add(at(y, mo, day(1)), pension.label, pension.amount);
    if (va) add(at(y, mo, day(1)), 'VA BENEFITS PAYMENT', va);
    add(at(y, mo, day(28)), 'INTEREST PAYMENT', randInt(60, 1700));
    if (mo === 3) add(at(y, mo, day(12)), 'IRS TAX REFUND', randInt(35000, 160000));

    add(at(y, mo, day(5)), premium.label, -premium.amount);
    add(at(y, mo, day(8)), 'ELECTRIC COMPANY PMT', -electric);
    add(at(y, mo, day(9)), 'CITY WATER SERVICES', -water);
    add(at(y, mo, day(10)), 'NATURAL GAS CO', -gas);
    add(at(y, mo, day(12)), 'AT&T LANDLINE SVC', -phone);
    add(at(y, mo, day(14)), cable.label, -cable.amount);
    add(at(y, mo, day(16)), 'STATE FARM HOMEOWNERS', -insurance);
    add(at(y, mo, rday(6, 22)), church.label, -church.amount);
    if (mo === 3 || mo === 9) add(at(y, mo, day(20)), 'COUNTY PROPERTY TAX', -propertyTax);
    if (mo === 0) add(at(y, mo, day(18)), 'AARP MEMBERSHIP DUES', -randInt(1200, 1600));

    const groceryTrips = randInt(3, 7);
    for (let i = 0; i < groceryTrips; i++) add(at(y, mo, rday(1, daysIn)), pick(grocers), -randInt(2000, 15000));
    const meals = randInt(2, 6);
    for (let i = 0; i < meals; i++) add(at(y, mo, rday(1, daysIn)), pick(RESTAURANTS), -randInt(600, 3600));
    const rxTrips = randInt(1, 4);
    for (let i = 0; i < rxTrips; i++) add(at(y, mo, rday(1, daysIn)), pharmacy, -randInt(800, 5500));
    if (chance(0.6)) add(at(y, mo, rday(1, daysIn)), pick(MEDICAL), -randInt(3000, 26000));
    if (chance(0.15)) add(at(y, mo, rday(1, daysIn)), pick(HOSPITALS), -randInt(15000, 130000));
    if (chance(0.55)) add(at(y, mo, rday(1, daysIn)), pick(FAMILY), -randInt(5000, 45000));
    if (chance(0.5)) add(at(y, mo, rday(1, daysIn)), pick(MAINTENANCE), -randInt(2500, 20000));
    if (chance(0.4)) add(at(y, mo, rday(1, daysIn)), pick(MISC), -randInt(400, 2600));
  }

  entries.sort((a, b) => b.ts - a.ts);
  return entries.slice(0, count).map((e, i) => ({ id: i, description: e.description, amount: e.amount, date: new Date(e.ts) }));
}
