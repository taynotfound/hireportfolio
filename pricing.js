/* Package builder pricing — pure functions, no DOM. Placeholder € prices (edit freely).
   Shared by the page (browser) and the self-check (node). */
(function (root) {
  'use strict';

  // Base project types set the starting scope. Prices are placeholders.
  const BASES = {
    landing:   { label: 'Landing / One-Pager',        price: 900,   days: 4  },
    business:  { label: 'Business / Multi-Page Site',  price: 2200,  days: 10 },
    webapp:    { label: 'Custom Web App / Dashboard',  price: 6500,  days: 28 },
    mobile:    { label: 'Mobile App (Android/Kotlin)', price: 8500,  days: 35 },
    ecommerce: { label: 'Shop / Booking Platform',     price: 5200,  days: 24 },
  };

  // Add-ons. Some are flat, some scale with base complexity (tier weight).
  const ADDONS = {
    auth:       { label: 'Auth + 2FA / hardened login',      price: 800  },
    payments:   { label: 'Payments / banking integration',   price: 1400 },
    pwa:        { label: 'Installable PWA + offline',         price: 600  },
    i18n:       { label: 'Multi-language (i18n)',             price: 500  },
    cms:        { label: 'Self-service CMS / admin panel',    price: 1200 },
    seo:        { label: 'SEO + performance pass',            price: 450  },
    design:     { label: 'Bespoke UI/UX design system',       price: 1500 },
    security:   { label: 'Security audit + pentest',          price: 1800 },
    a11y:       { label: 'WCAG AA accessibility',             price: 700  },
    analytics:  { label: 'Privacy-first analytics',           price: 400  },
  };

  // Support plans are recurring (monthly), shown separately from one-off build.
  const SUPPORT = {
    none:  { label: 'No plan (hand-off)',          monthly: 0   },
    basic: { label: 'Basic — updates & backups',   monthly: 120 },
    pro:   { label: 'Pro — priority + monitoring',  monthly: 320 },
  };

  const RUSH_MULT = 1.25;          // +25% for rush delivery
  const RETAINER_DISCOUNT = 0.10;  // 10% off one-off when a support plan is taken

  function eur(n) { return '€' + Math.round(n).toLocaleString('de-DE'); }

  // opts: { base, addons:[keys], rush:bool, support:key }
  function quote(opts) {
    const base = BASES[opts.base];
    if (!base) throw new Error('unknown base: ' + opts.base);
    const addons = (opts.addons || []).map(k => {
      if (!ADDONS[k]) throw new Error('unknown addon: ' + k);
      return { key: k, ...ADDONS[k] };
    });
    const support = SUPPORT[opts.support || 'none'];
    if (!support) throw new Error('unknown support: ' + opts.support);

    let oneOff = base.price + addons.reduce((s, a) => s + a.price, 0);
    let days = base.days + addons.length * 2;
    if (opts.rush) { oneOff *= RUSH_MULT; days = Math.ceil(days * 0.6); }
    // retainer discount only if a paid support plan is selected
    const discount = support.monthly > 0 ? oneOff * RETAINER_DISCOUNT : 0;
    oneOff -= discount;

    return {
      base, addons, support,
      oneOff: Math.round(oneOff),
      discount: Math.round(discount),
      monthly: support.monthly,
      days,
      rush: !!opts.rush,
    };
  }

  const api = { BASES, ADDONS, SUPPORT, RUSH_MULT, RETAINER_DISCOUNT, eur, quote };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Pricing = api;
})(typeof window !== 'undefined' ? window : globalThis);
