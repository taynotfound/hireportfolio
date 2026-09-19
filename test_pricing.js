// Runnable check for the pricing money-path. `node test_pricing.js`
const P = require('./pricing.js');
const assert = require('assert');
const L = o => o.label.en; // labels are {en,de} now

// 1. base only
let q = P.quote({ base: 'landing' });
assert.strictEqual(q.oneOff, 200, 'landing base');
assert.strictEqual(q.monthly, 0, 'no support by default');
assert.strictEqual(q.days, 2, 'landing days');

// 2. base + addons sums
q = P.quote({ base: 'webapp', addons: ['auth', 'design'] });
assert.strictEqual(q.oneOff, 900 + 120 + 220, 'webapp + auth + design');
assert.strictEqual(q.days, 10 + 2, '+1 day per addon');

// 3. rush: +20% and ~0.6 days
q = P.quote({ base: 'business', rush: true });
assert.strictEqual(q.oneOff, Math.round(550 * 1.20), 'rush +20%');
assert.strictEqual(q.days, Math.ceil(5 * 0.6), 'rush compresses days');

// 4. support plan applies 10% retainer discount to one-off
q = P.quote({ base: 'webapp', support: 'pro' });
const expDisc = Math.round(900 * 0.10);
assert.strictEqual(q.discount, expDisc, 'retainer discount');
assert.strictEqual(q.oneOff, 900 - expDisc, 'one-off after discount');
assert.strictEqual(q.monthly, 70, 'pro monthly');

// 5. no discount without a plan
q = P.quote({ base: 'webapp', support: 'none' });
assert.strictEqual(q.discount, 0, 'no discount without plan');

// 6. rush + addons + support stack in the right order (rush before discount)
q = P.quote({ base: 'mobile', addons: ['auth'], rush: true, support: 'basic' });
let base = (1200 + 120) * 1.20;
assert.strictEqual(q.oneOff, Math.round(base - base * 0.10), 'rush then discount');

// 7. bad keys throw
assert.throws(() => P.quote({ base: 'nope' }), /unknown base/);
assert.throws(() => P.quote({ base: 'landing', addons: ['nope'] }), /unknown addon/);
assert.throws(() => P.quote({ base: 'landing', support: 'nope' }), /unknown support/);

// 8. labels are bilingual
assert.ok(P.BASES.webapp.label.en && P.BASES.webapp.label.de, 'base labels bilingual');
assert.strictEqual(L(P.quote({ base: 'landing' }).base), 'Landing / One-Pager', 'label.en accessor');

console.log('pricing self-check OK — 8 groups passed');
