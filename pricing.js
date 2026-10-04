/* Package builder pricing, pure functions, no DOM. Placeholder € prices (edit freely).
   Shared by the page (browser) and the self-check (node).
   Pricing tuned junior/competitive: hundreds, not thousands. Fast turnaround. */
(function (root) {
  'use strict';

  // Base project types set the starting scope. Prices are placeholders.
  const BASES = {
    landing:   { label: { en: 'Landing / One-Pager',        de: 'Landingpage / One-Pager' },      price: 200,  days: 2 },
    business:  { label: { en: 'Business / Multi-Page Site',  de: 'Business- / Mehrseiten-Website' }, price: 550,  days: 5 },
    webapp:    { label: { en: 'Custom Web App / Dashboard',  de: 'Web-App / Dashboard' },          price: 900,  days: 10 },
    mobile:    { label: { en: 'Mobile App (Android/Kotlin)', de: 'Mobile App (Android/Kotlin)' },   price: 1200, days: 14 },
    ecommerce: { label: { en: 'Shop / Booking Platform',     de: 'Shop / Buchungssystem' },        price: 800,  days: 9 },
  };

  // Add-ons. Flat prices, in the tens/low-hundreds.
  const ADDONS = {
    auth:      { label: { en: 'Login + 2FA / hardened auth', de: 'Login + 2FA / sichere Anmeldung' }, price: 120 },
    payments:  { label: { en: 'Payments integration',        de: 'Zahlungsanbindung' },              price: 200 },
    pwa:       { label: { en: 'Installable PWA + offline',    de: 'Installierbare PWA + Offline' },   price: 90  },
    i18n:      { label: { en: 'Multi-language (i18n)',        de: 'Mehrsprachigkeit (i18n)' },        price: 80  },
    cms:       { label: { en: 'Self-service admin panel',     de: 'Self-Service-Adminbereich' },      price: 180 },
    seo:       { label: { en: 'SEO + performance pass',       de: 'SEO + Performance' },              price: 70  },
    design:    { label: { en: 'Bespoke UI/UX design',         de: 'Individuelles UI/UX-Design' },     price: 220 },
    security:  { label: { en: 'Security audit',               de: 'Security-Audit' },                 price: 250 },
    a11y:      { label: { en: 'WCAG AA accessibility',        de: 'Barrierefreiheit (WCAG AA)' },     price: 100 },
    analytics: { label: { en: 'Privacy-first analytics',      de: 'Datenschutzfreundl. Analytics' },  price: 60  },
  };

  // Support plans are recurring (monthly), shown separately from one-off build.
  const SUPPORT = {
    none:  { label: { en: 'No plan (hand-off)',        de: 'Kein Plan (\u00dcbergabe)' },       monthly: 0  },
    basic: { label: { en: 'Basic, updates & backups', de: 'Basis, Updates & Backups' },      monthly: 25 },
    pro:   { label: { en: 'Pro, priority + monitoring', de: 'Pro, Priorit\u00e4t + Monitoring' }, monthly: 70 },
  };

  const RATES = { rush: 1.20, retainer: 0.10 }; // mutable so admin overrides apply live

  function eur(n) { return '\u20ac' + Math.round(n).toLocaleString('de-DE'); }
   
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
    let days = base.days + addons.length;   // ~1 day per add-on
    if (opts.rush) { oneOff *= RATES.rush; days = Math.ceil(days * 0.6); }
    const discount = support.monthly > 0 ? oneOff * RATES.retainer : 0;
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

  const api = { BASES, ADDONS, SUPPORT, RATES, get RUSH_MULT() { return RATES.rush; }, get RETAINER_DISCOUNT() { return RATES.retainer; }, eur, quote };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Pricing = api;
})(typeof window !== 'undefined' ? window : globalThis);



document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('pricing-items-container');
    const totalDisplay = document.getElementById('pricing-total');
    const addForm = document.getElementById('add-pricing-form');

    // Fetch initial items saved in overrides.json via backend
    let pricingItems = [];
    try {
        const res = await fetch('/api/pricing');
        pricingItems = await res.json();
    } catch (e) {
        pricingItems = [];
    }

    async function savePricing() {
        await fetch('/api/pricing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: pricingItems })
        });
    }

    function renderPricing() {
        if (!container) return;
        container.innerHTML = '';
        let total = 0;

        pricingItems.forEach(item => {
            const div = document.createElement('div');
            div.className = 'pricing-item';
            div.innerHTML = `
                <label>
                    <input type="checkbox" data-id="${item.id}" ${item.selected ? 'checked' : ''}>
                    ${item.name} - €${item.price}
                </label>
            `;
            container.appendChild(div);

            if (item.selected) total += item.price;
        });

        if (totalDisplay) totalDisplay.textContent = `€${total}`;
    }

    if (container) {
        container.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                const id = Number(e.target.getAttribute('data-id'));
                const item = pricingItems.find(i => i.id === id);
                if (item) {
                    item.selected = e.target.checked;
                    renderPricing();
                    savePricing(); // Persist to overrides.json
                }
            }
        });
    }

    if (addForm) {
        addForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('new-item-name');
            const priceInput = document.getElementById('new-item-price');

            if (nameInput && priceInput && nameInput.value && priceInput.value) {
                const newItem = {
                    id: Date.now(),
                    name: nameInput.value.trim(),
                    price: parseFloat(priceInput.value),
                    selected: true
                };

                pricingItems.push(newItem);
                nameInput.value = '';
                priceInput.value = '';
                renderPricing();
                savePricing(); // Persist new item to overrides.json
            }
        });
    }

    renderPricing();
});
