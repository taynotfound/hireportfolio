// Runnable check for the pricing money-path. `node test_pricing.js`
const P = require('./pricing.js');
const assert = require('assert');

// 1. base only
let q = P.quote({ base: 'landing' });
assert.strictEqual(q.oneOff, 900, 'landing base');
assert.strictEqual(q.monthly, 0);

// 2. addons sum
q = P.quote({ base: 'webapp', addons: ['auth', 'payments'] });
assert.strictEqual(q.oneOff, 6500 + 800 + 1400, 'webapp + auth + payments');
assert.strictEqual(q.days, 28 + 2 * 2, 'days add 2/addon');

// 3. rush = +25% and shorter timeline
q = P.quote({ base: 'business', rush: true });
assert.strictEqual(q.oneOff, Math.round(2200 * 1.25), 'rush multiplier');
assert.ok(q.days < 10, 'rush shortens');

// 4. support plan applies 10% retainer discount to one-off + carries monthly
q = P.quote({ base: 'webapp', support: 'pro' });
assert.strictEqual(q.discount, Math.round(6500 * 0.10), 'retainer discount');
assert.strictEqual(q.oneOff, 6500 - Math.round(6500 * 0.10), 'discounted one-off');
assert.strictEqual(q.monthly, 320, 'pro monthly');

// 5. no discount without a paid plan
q = P.quote({ base: 'webapp', support: 'none' });
assert.strictEqual(q.discount, 0, 'no plan = no discount');

// 6. bad input throws
assert.throws(() => P.quote({ base: 'nope' }), /unknown base/);
assert.throws(() => P.quote({ base: 'landing', addons: ['ghost'] }), /unknown addon/);

// 7. formatter
assert.strictEqual(P.eur(1234.6), '€1.235');

console.log('pricing self-check OK — 7 groups passed');
