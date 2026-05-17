const RETIREMENT_HOMES = [
  'SUNRISE SENIOR LIVING', 'BROOKDALE SENIOR LIVING PMT', 'EMERALD ISLE RETIREMENT CTR',
  'GOLDEN YEARS CARE CENTER', 'MEADOWBROOK RETIREMENT COMM', 'SUNRISE ASSISTED LIVING',
  'PINEVIEW NURSING & REHAB', 'HEARTHSTONE MEMORY CARE', 'WILLOWBROOK SENIOR LIVING',
  'MAGNOLIA GARDENS CARE CTR', 'OAKWOOD RETIREMENT VILLAGE', 'HARBOR LIGHTS SENIOR CARE',
];

const PEOPLE_DEBIT = [
  'CHECK - DOROTHY M HENDERSON', 'CHECK - EUGENE R PAULSON', 'MYPAYINDIA TO LINDA MAE FOSTER',
  'TRANSFER TO MICHAEL T HENDERSON', 'TRANSFER TO KAREN L HENDERSON',
  'TRANSFER TO GRANDCHILD EMILY', 'WIRE TO ROBERT J PAULSON JR',
  'CHECK PMT - PASTOR WILLIAM CROSS', 'DONATION - REV HAROLD SIMMS',
  'CHECK - ELEANOR FAYE TUCKER', 'MYPAYINDIA TO PATRICIA ANN REEVES',
];

const DEBITS = [
  ...RETIREMENT_HOMES,
  ...RETIREMENT_HOMES,
  'CVS PHARMACY #6630', 'WALGREENS #5521', 'RITE AID PHARMACY',
  'DR HAROLD SIMMONS MD', 'MERCY GENERAL HOSPITAL', 'MIDWEST CARDIOLOGY ASSOC',
  'UNITED HEALTHCARE PMT', 'MEDICARE SUPPLEMENT PMT', 'BLUE CROSS BLUE SHIELD',
  'AARP MEMBERSHIP DUES', 'MEDLINE SUPPLIES', 'NATIONAL HOME HEALTH CARE',
  'PHYSICAL THERAPY ASSOC', 'VISION CENTER OF AMERICA', 'BELTONE HEARING AIDS',
  'KROGER #7712', 'PUBLIX #3388', 'PIGGLY WIGGLY #0044', 'ALDI FOODS #2201',
  'DENNY\'S RESTAURANT', 'CRACKER BARREL #0882', 'IHOP #3341', 'BOB EVANS #0771',
  'VILLAGE INN #0992', 'PERKINS RESTAURANT', 'LUBY\'S CAFETERIA',
  'ELECTRIC COMPANY PMT', 'CITY WATER SERVICES', 'NATURAL GAS CO',
  'AT&T LANDLINE SVC', 'COMCAST CABLE SVC', 'DIRECTV SUBSCRIPTION',
  'US POSTAL SERVICE', 'HALLMARK GOLD CROWN', 'READERS DIGEST SUBSCR',
  'FIRST BAPTIST CHURCH', 'ST MARY\'S CATHOLIC CHURCH', 'GRACE LUTHERAN CHURCH',
  'AMERICAN LEGION POST 44', 'VFW POST #1892',
  ...PEOPLE_DEBIT,
];

const CREDITS = [
  'SOCIAL SECURITY ADMIN', 'SOCIAL SECURITY ADMIN', 'SOCIAL SECURITY ADMIN',
  'PENSION PMT - FORD MOTOR CO', 'PENSION PMT - US STEEL CORP', 'PENSION PMT - AT&T INC',
  'MEDICARE REFUND', 'VA BENEFITS PAYMENT',
  'TRANSFER FROM MICHAEL T HENDERSON', 'TRANSFER FROM KAREN L HENDERSON',
  'IRS TAX REFUND', 'INTEREST PAYMENT',
];

function createRng(seed) {
  let s = (Number(seed) || 1) >>> 0;
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = (s ^ (s >>> 16)) >>> 0;
    return s / 0x100000000;
  };
}

export function generateStatements(count = 30, seed = null) {
  const rng = seed != null ? createRng(seed) : Math.random.bind(Math);

  const randInt = (min, max) => Math.floor(rng() * (max - min + 1)) + min;
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];

  const now = Date.now();
  const start2017 = new Date('2017-01-01').getTime();
  const range = now - start2017;
  const entries = [];

  for (let i = 0; i < count; i++) {
    const isCredit = rng() < 0.18;
    const date = new Date(now - rng() * range);
    const description = isCredit ? pick(CREDITS) : pick(DEBITS);

    let amount;
    if (isCredit) {
      if (description.includes('SOCIAL SECURITY')) amount = randInt(85000, 210000);
      else if (description.includes('PENSION')) amount = randInt(60000, 280000);
      else if (description.includes('VA BENEFITS')) amount = randInt(45000, 190000);
      else if (description.includes('REFUND') || description.includes('INTEREST')) amount = randInt(800, 18000);
      else amount = randInt(20000, 90000);
    } else if (RETIREMENT_HOMES.some((h) => description.includes(h.slice(0, 12)))) {
      amount = randInt(280000, 650000);
    } else if (description.includes('HOSPITAL') || description.includes('CARDIOLOGY') || description.includes('SURGERY')) {
      amount = randInt(15000, 320000);
    } else if (description.includes('PHARMACY') || description.includes('RITE AID') || description.includes('CVS') || description.includes('WALGREEN')) {
      amount = randInt(800, 28000);
    } else if (description.includes('MEDICARE') || description.includes('BLUE CROSS') || description.includes('UNITED HEALTH') || description.includes('SUPPLEMENT')) {
      amount = randInt(18000, 62000);
    } else if (description.includes('DR ') || description.includes('THERAPY') || description.includes('VISION') || description.includes('HEARING')) {
      amount = randInt(2500, 48000);
    } else if (description.includes('MEDLINE') || description.includes('HOME HEALTH') || description.includes('AARP')) {
      amount = randInt(1200, 22000);
    } else if (description.includes('KROGER') || description.includes('PUBLIX') || description.includes('PIGGLY') || description.includes('ALDI')) {
      amount = randInt(1800, 14000);
    } else if (description.includes('DENNY') || description.includes('CRACKER') || description.includes('IHOP') || description.includes('BOB EVANS') || description.includes('VILLAGE INN') || description.includes('PERKINS') || description.includes('LUBY')) {
      amount = randInt(600, 3800);
    } else if (description.includes('ELECTRIC') || description.includes('WATER') || description.includes('GAS CO') || description.includes('AT&T') || description.includes('COMCAST') || description.includes('DIRECTV')) {
      amount = randInt(4500, 22000);
    } else if (description.includes('CHURCH') || description.includes('PASTOR') || description.includes('REV ') || description.includes('LEGION') || description.includes('VFW')) {
      amount = randInt(1000, 15000);
    } else if (description.includes('CHECK') || description.includes('MYPAYINDIA TO') || description.includes('TRANSFER TO') || description.includes('WIRE TO')) {
      amount = randInt(5000, 75000);
    } else {
      amount = randInt(500, 12000);
    }

    entries.push({ id: i, description, amount: isCredit ? amount : -amount, date });
  }

  entries.sort((a, b) => b.date - a.date);
  return entries;
}