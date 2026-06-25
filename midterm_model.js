// ===========================================================================
// ACOP 1974 Midterm seat model — LBM congress math, driven by a national swing
// ---------------------------------------------------------------------------
// Verbatim LBM elastic-proportional House + two-party Senate, with substitution:
//   stateMargin(house)  = STATE_LEAN_HOUSE[abbr]  + nationalSwing
//   stateMargin(senate) = STATE_LEAN_1974[abbr]   + nationalSwing
//
// Why two lean tables?
//   House  — uses 2012 Obama/Romney margins. These produce the right seat
//             sensitivity (split-ticket in 1974 means the 1972 Nixon landslide
//             map would give absurd seat counts). Seat counts updated to 1970
//             Census apportionment; biases tweaked for Solid-South incumbency.
//   Senate — uses 1972 Nixon/McGovern two-party margins (approximate).
//             dem_off values are calibrated so that at historical D+16.9% swing
//             the model reproduces the actual 1974 Class-3 race results.
//
// Substrate: 1970 Census apportionment (verified sum=435); 34 Class-3 Senate
//            races. Pre-election baselines: House 93rd Congress D 242 / R 192;
//            Senate 93rd Congress D 56 / R 42 / I 2.
//
// Calibration target (historical 1974):
//   "Damaged" scenario (approval≈38, watergate≈0.7) → D+16.9% swing
//     → House R 192→144 (Δ−48) ✓   Senate R 42→38 (Δ−4) ✓
//
// node midterm_model.js   ←  runs sweep + scenario calibration table
// ===========================================================================

// --- LBM helpers (verbatim) ------------------------------------------------
const num   = (x) => (Number.isFinite(x) ? x : 0);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Box-Muller (verbatim). Set _rng = () => 0.5 for expected-value mode.
let _rng = Math.random;
const rndN = (mu = 0, sigma = 1) => {
  let u = 0, v = 0;
  while (u === 0) u = _rng();
  while (v === 0) v = _rng();
  return mu + sigma * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

// --- HOUSE lean: 2012 Obama−Romney two-party D margins (seat-sensitivity calibration)
const STATE_LEAN_HOUSE = {
  AL:-0.46, AK:-0.28, AZ:-0.10, AR:-0.25, CA:+0.24, CO:+0.055, CT:+0.18, DE:+0.20,
  FL:+0.009,GA:-0.08, HI:+0.43, ID:-0.33, IL:+0.18, IN:-0.11, IA:+0.06, KS:-0.22,
  KY:-0.24, LA:-0.18, ME:+0.16, MD:+0.27, MA:+0.24, MI:+0.095, MN:+0.078, MS:-0.12,
  MO:-0.097,MT:-0.14, NE:-0.22, NV:+0.069,NH:+0.058,NJ:+0.18, NM:+0.10, NY:+0.29,
  NC:-0.02, ND:-0.20, OH:+0.03, OK:-0.34, OR:+0.13, PA:+0.054,RI:+0.28, SC:-0.11,
  SD:-0.18, TN:-0.21, TX:-0.16, UT:-0.49, VT:+0.36, VA:+0.039,WA:+0.15, WV:-0.27,
  WI:+0.069,WY:-0.42
};

// --- SENATE lean: 1972 Nixon−McGovern two-party D margins (approximate) -----
// All negative except MA (only state McGovern won). Used with calibrated dem_off.
const STATE_LEAN_1974 = {
  AL:-0.490, AK:-0.240, AZ:-0.345, AR:-0.370, CA:-0.105, CO:-0.295,
  CT:-0.163, DE:-0.155, FL:-0.315, GA:-0.450, HI:-0.050, ID:-0.345,
  IL:-0.195, IN:-0.305, IA:-0.128, KS:-0.305, KY:-0.278, LA:-0.430,
  ME:-0.100, MD:-0.100, MA:+0.089, MI:-0.140, MN:-0.080, MS:-0.555,
  MO:-0.224, MT:-0.225, NE:-0.368, NV:-0.245, NH:-0.175, NJ:-0.150,
  NM:-0.283, NY:-0.170, NC:-0.378, ND:-0.320, OH:-0.210, OK:-0.371,
  OR:-0.130, PA:-0.197, RI:-0.063, SC:-0.460, SD:-0.220, TN:-0.400,
  TX:-0.331, UT:-0.423, VT:-0.155, VA:-0.313, WA:-0.195, WV:-0.200,
  WI:-0.110, WY:-0.385
};

// --- House per-state data (1970 apportionment + 1974-era structural biases) --
// seats = 1970 Census apportionment (verified sum = 435).
// bias  = structural lean relative to presidential map; +=Dem.
// Key 1974 change: Solid South flipped to mildly +Dem (incumbents ran uncontested
// or against token opposition even as states voted Nixon for president).
const HOUSE_DATA = {
  AL:{seats:7, bias:+0.10}, AK:{seats:1, bias:-0.15}, AZ:{seats:4, bias:-0.05},
  AR:{seats:4, bias:+0.12}, CA:{seats:43,bias:+0.12}, CO:{seats:5, bias:+0.02},
  CT:{seats:6, bias:+0.15}, DE:{seats:1, bias:+0.15}, FL:{seats:15,bias:-0.04},
  GA:{seats:10,bias:+0.10}, HI:{seats:2, bias:+0.25}, ID:{seats:2, bias:-0.25},
  IL:{seats:24,bias:+0.10}, IN:{seats:11,bias:-0.10}, IA:{seats:6, bias:+0.02},
  KS:{seats:5, bias:-0.18}, KY:{seats:7, bias:-0.05}, LA:{seats:8, bias:+0.10},
  ME:{seats:2, bias:+0.08}, MD:{seats:8, bias:+0.18}, MA:{seats:12,bias:+0.20},
  MI:{seats:19,bias:-0.02}, MN:{seats:8, bias:+0.05}, MS:{seats:5, bias:+0.05},
  MO:{seats:10,bias:-0.08}, MT:{seats:2, bias:-0.10}, NE:{seats:3, bias:-0.15},
  NV:{seats:1, bias:+0.04}, NH:{seats:2, bias:+0.05}, NJ:{seats:15,bias:+0.08},
  NM:{seats:2, bias:+0.08}, NY:{seats:39,bias:+0.15}, NC:{seats:11,bias:-0.08},
  ND:{seats:1, bias:-0.15}, OH:{seats:23,bias:-0.08}, OK:{seats:6, bias:-0.20},
  OR:{seats:4, bias:+0.10}, PA:{seats:25,bias:-0.06}, RI:{seats:2, bias:+0.20},
  SC:{seats:6, bias:-0.05}, SD:{seats:2, bias:-0.15}, TN:{seats:8, bias:-0.15},
  TX:{seats:24,bias:-0.05}, UT:{seats:2, bias:-0.20}, VT:{seats:1, bias:+0.25},
  VA:{seats:10,bias:-0.05}, WA:{seats:7, bias:+0.10}, WV:{seats:4, bias:-0.10},
  WI:{seats:9, bias:-0.05}, WY:{seats:1, bias:-0.25}
};

// Pre-election baselines (93rd Congress, going into November 1974):
const HOUSE_BASELINE         = { dem: 242, rep: 192 };
const SENATE_CAUCUS_BASELINE = { dem: 56,  rep: 42  };

// --- 1974 Class 3 Senate races (34 seats) ------------------------------------
// lean      : state abbreviation → index into STATE_LEAN_1974
// dem_off   : D over/underperformance vs presidential baseline (calibrated from
//             actual 1974 margins vs STATE_LEAN_1974 + historical 16.9% swing).
//             Large +ve = Southern Dems ran far ahead of the Nixon map.
//             Negative  = liberal-R incumbents (Mathias MD, Javits NY) attracted
//             cross-party votes and outperformed even in a D wave.
// split_keep: fraction of dem_off applied (incumbency stickiness).
//
// Historical result: D gained CO, FL, KY, OH, VT (×5); R gained NV (×1).
// Net: D+4 seats. Senate: D 56→60, R 42→38.
const SENATE_1974 = {
  // Deep South: huge dem_off (Solid-South House candidates ran with almost no R opposition)
  "Alabama":       {lean:"AL", dem_off:+1.051, split_keep:0.80},
  "Arkansas":      {lean:"AR", dem_off:+1.371, split_keep:0.65}, // Bumpers, open D seat
  "Georgia":       {lean:"GA", dem_off:+0.901, split_keep:0.80},
  "Louisiana":     {lean:"LA", dem_off:+1.264, split_keep:0.80}, // Long, near-walkover
  "NorthCarolina": {lean:"NC", dem_off:+0.691, split_keep:0.65}, // Morgan, open D seat
  "SouthCarolina": {lean:"SC", dem_off:+0.864, split_keep:0.80},
  // D incumbent holds
  "Alaska":        {lean:"AK", dem_off:+0.351, split_keep:0.80},
  "California":    {lean:"CA", dem_off:+0.228, split_keep:0.80},
  "Connecticut":   {lean:"CT", dem_off:+0.343, split_keep:0.80},
  "Hawaii":        {lean:"HI", dem_off:+0.676, split_keep:0.80}, // no R opponent
  "Idaho":         {lean:"ID", dem_off:+0.445, split_keep:0.80},
  "Illinois":      {lean:"IL", dem_off:+0.358, split_keep:0.80}, // Stevenson III
  "Indiana":       {lean:"IN", dem_off:+0.231, split_keep:0.80},
  "Iowa":          {lean:"IA", dem_off:+0.014, split_keep:0.65}, // Culver, open D seat
  "Missouri":      {lean:"MO", dem_off:+0.330, split_keep:0.80},
  "SouthDakota":   {lean:"SD", dem_off:+0.139, split_keep:0.80}, // McGovern
  "Washington":    {lean:"WA", dem_off:+0.355, split_keep:0.80},
  "Wisconsin":     {lean:"WI", dem_off:+0.261, split_keep:0.80},
  // R seats flipped to D in the wave
  "Colorado":      {lean:"CO", dem_off:+0.465, split_keep:0.65}, // Hart beat Dominick
  "Florida":       {lean:"FL", dem_off:+0.343, split_keep:0.60}, // Stone open (Gurney R)
  "Kentucky":      {lean:"KY", dem_off:+0.291, split_keep:0.65}, // Ford beat Cook
  "Ohio":          {lean:"OH", dem_off:+0.568, split_keep:0.60}, // Glenn open (Saxbe R)
  "Vermont":       {lean:"VT", dem_off:+0.110, split_keep:0.60}, // Leahy open (Aiken R)
  // R holds (survived the wave)
  "Arizona":       {lean:"AZ", dem_off:+0.023, split_keep:0.70}, // Goldwater
  "Kansas":        {lean:"KS", dem_off:+0.169, split_keep:0.70}, // Dole, ~51%
  "Maryland":      {lean:"MD", dem_off:-0.299, split_keep:0.70}, // Mathias, liberal R
  "NewHampshire":  {lean:"NH", dem_off:+0.007, split_keep:0.60}, // Wyman (R) 355-vote margin
  "NewYork":       {lean:"NY", dem_off:-0.124, split_keep:0.70}, // Javits, liberal R
  "NorthDakota":   {lean:"ND", dem_off:+0.214, split_keep:0.70}, // Young, barely held
  "Oklahoma":      {lean:"OK", dem_off:+0.274, split_keep:0.70}, // Bellmon, barely held
  "Oregon":        {lean:"OR", dem_off:-0.213, split_keep:0.70}, // Packwood
  "Pennsylvania":  {lean:"PA", dem_off:-0.063, split_keep:0.70}, // Schweiker
  "Utah":          {lean:"UT", dem_off:+0.292, split_keep:0.65}, // Garn, open R seat
  // The one D→R flip (open D seat lost despite the wave)
  "Nevada":        {lean:"NV", dem_off:+0.115, split_keep:0.60}, // Laxalt beat Reid by 611 votes
};

// --- House model (LBM elastic-proportional, verbatim arithmetic) -------------
// Uses STATE_LEAN_HOUSE (2012 leans) for correct seat-swing sensitivity with
// 1970 apportionment.
function computeHouse(nationalSwing) {
  let houseDem = 0;
  for (const abbr in HOUSE_DATA) {
    const meta = HOUSE_DATA[abbr];
    const presMargin = (STATE_LEAN_HOUSE[abbr] || 0) + nationalSwing;
    let houseMargin = presMargin + (meta.bias * 1.1) - 0.03 + rndN(0, 0.015);

    if (meta.seats === 1) {
      if (houseMargin > 0) houseDem += 1;
    } else {
      let share = 0.5 + (houseMargin * 2.0);
      if (meta.seats >= 5) share = clamp(share, 0.15, 0.85);
      else                 share = clamp(share, 0.0,  1.0);
      houseDem += Math.round(meta.seats * share);
    }
  }
  houseDem = clamp(houseDem, 0, 435);
  return { dem: houseDem, rep: 435 - houseDem };
}

// --- Senate model (LBM two-party path, verbatim arithmetic) -----------------
// Seed = 93rd Congress non-Class-3 seats: D 37, R 27, I 2 (Byrd VA, Buckley NY).
// Uses STATE_LEAN_1974 (1972 Nixon map) + calibrated dem_off per race.
function computeSenate(nationalSwing) {
  let D = 37, R = 27, I = 2;
  const races = [];
  for (const name in SENATE_1974) {
    const meta = SENATE_1974[name];
    const pm2p = (STATE_LEAN_1974[meta.lean] || 0) + nationalSwing;
    const off  = num(meta.dem_off ?? 0);
    const keep = clamp(num(meta.split_keep ?? 0.65), 0.40, 0.98);
    const sen2pMargin = clamp(pm2p + keep * off + rndN(0, 0.006), -0.90, 0.90);
    const winner = sen2pMargin > 0 ? 'D' : 'R';
    if (winner === 'D') D++; else R++;
    races.push({ name, lean: meta.lean, margin: sen2pMargin, winner });
  }
  const total = D + R + I;
  if (total !== 100) D += (100 - total);
  return { dem: D, rep: R, ind: I, races };
}

// --- Watergate / approval → nationalSwing (the calibrated lever) -------------
// Coefficients calibrated so "Damaged" scenario (approval≈38, watergate≈0.7)
// → D+16.9% swing → House R 192→~144 (Δ−48), Senate R 42→~38 (Δ−4).
function nationalSwing({ approval = 50, watergate = 0 } = {}) {
  const MIDTERM_PENALTY = 0.040;   // structural loss for party holding White House
  const APPROVAL_COEF   = 0.130;   // weight of approval below 55 (max 40-pt deficit)
  const WATERGATE_COEF  = 0.105;   // weight of cumulative exposure (0..1)
  const approvalTerm  = clamp((55 - approval), 0, 40) / 40 * APPROVAL_COEF;
  const watergateTerm = clamp(watergate, 0, 1) * WATERGATE_COEF;
  return MIDTERM_PENALTY + approvalTerm + watergateTerm;
}

function runMidterm(state, { mean = false } = {}) {
  const swing = nationalSwing(state);
  if (mean) _rng = () => 0.5;
  const house  = computeHouse(swing);
  const senate = computeSenate(swing);
  _rng = Math.random;
  return {
    swing,
    house, senate,
    houseG:  { dem: house.dem  - HOUSE_BASELINE.dem,         rep: house.rep  - HOUSE_BASELINE.rep },
    senateG: { dem: senate.dem - SENATE_CAUCUS_BASELINE.dem, rep: senate.rep - SENATE_CAUCUS_BASELINE.rep }
  };
}

// --- exports / CLI ----------------------------------------------------------
if (typeof module !== 'undefined') {
  module.exports = {
    computeHouse, computeSenate, nationalSwing, runMidterm,
    HOUSE_DATA, STATE_LEAN_HOUSE, STATE_LEAN_1974, SENATE_1974,
    HOUSE_BASELINE, SENATE_CAUCUS_BASELINE
  };
}

if (typeof require !== 'undefined' && require.main === module) {
  console.log('=== swing sweep (mean, no noise) ===');
  for (let s = 0.00; s <= 0.24001; s += 0.02) {
    _rng = () => 0.5;
    const h = computeHouse(s), se = computeSenate(s);
    _rng = Math.random;
    const hg = h.rep - HOUSE_BASELINE.rep, sg = se.rep - SENATE_CAUCUS_BASELINE.rep;
    console.log(
      `swing D+${(s*100).toFixed(0).padStart(2)}%` +
      `  House R ${String(h.rep).padStart(3)} (Δ${hg>=0?'+':''}${hg})` +
      `  Senate R ${se.rep} (Δ${sg>=0?'+':''}${sg})`
    );
  }

  console.log('\n=== scenario calibration (4000-run mean) ===');
  const avg = (state, n = 4000) => {
    let h = 0, sR = 0;
    for (let i = 0; i < n; i++) { const r = runMidterm(state); h += r.house.rep; sR += r.senate.rep; }
    return { houseRep: h / n, senateRep: sR / n };
  };
  const scenarios = {
    'Contained (appr 60, wg 0.0)': { approval: 60, watergate: 0.0 },
    'Baseline  (appr 50, wg 0.0)': { approval: 50, watergate: 0.0 },
    'Slipping  (appr 45, wg 0.4)': { approval: 45, watergate: 0.4 },
    'Damaged   (appr 38, wg 0.7)': { approval: 38, watergate: 0.7 },
    'Collapse  (appr 25, wg 1.0)': { approval: 25, watergate: 1.0 },
  };
  for (const [label, st] of Object.entries(scenarios)) {
    const sw = nationalSwing(st);
    const a  = avg(st);
    const hg = a.houseRep - HOUSE_BASELINE.rep, sg = a.senateRep - SENATE_CAUCUS_BASELINE.rep;
    console.log(
      `${label}  D+${(sw*100).toFixed(1).padStart(4)}%` +
      `  House R ${a.houseRep.toFixed(0)} (Δ${hg>=0?'+':''}${hg.toFixed(0)})` +
      `  Senate R ${a.senateRep.toFixed(0)} (Δ${sg>=0?'+':''}${sg.toFixed(0)})`
    );
  }
  console.log('\nHistorical 1974: Damaged → D+16.9% → House R 144 (Δ−48), Senate R 38 (Δ−4)');
}
