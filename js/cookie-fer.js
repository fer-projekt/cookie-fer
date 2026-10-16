const STORAGE_KEYS = {
  settings: 'consentSettings',
  dialogState: 'dialogState',
  meta: 'consentMeta',
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const MAX_COOKIE_AGE = 400 * 24 * 60 * 60; // browsers cap cookie lifetime at 400 days

// Google Consent Mode types: settings key, gtag key and mirror cookie. Labels come from the `${gtag}_title` translations.
const CONSENT_TYPES = [
  { key: 'adStorage', gtag: 'ad_storage', cookie: 'Consent_Advertising_Cookies' },
  { key: 'adUserData', gtag: 'ad_user_data', cookie: 'Consent_Use_of_Advertising_Data' },
  { key: 'adPersonalization', gtag: 'ad_personalization', cookie: 'Consent_Ad_Personalization' },
  { key: 'analyticsStorage', gtag: 'analytics_storage', cookie: 'Consent_Analytics_Cookies' },
  { key: 'functionalityStorage', gtag: 'functionality_storage', cookie: 'Consent_Functionality_Cookies' },
  { key: 'personalizationStorage', gtag: 'personalization_storage', cookie: 'Consent_Personalization_Cookies' },
  { key: 'securityStorage', gtag: 'security_storage', cookie: 'Consent_Security_Cookies' },
];

// Cookies set by Google and Meta tags, removed when the matching consent is withdrawn.
const TRACKING_COOKIES = {
  analytics: [/^_ga($|_)/, /^_gid$/, /^_gat($|_)/],
  ads: [/^_gcl_/, /^_gac_/],
  pixel: [/^_fbp$/, /^_fbc$/],
};

const DEFAULT_OPTIONS = {
  language: null, // defaults to <html lang>
  theme: 'light', // 'light', 'dark' or 'auto'
  consentMaxAgeDays: 365, // ask again after this many days, 0 = never
  consentVersion: null, // change it to ask every visitor again, e.g. after a policy update
  privacyPolicyUrl: null, // the site's own privacy / cookie policy, linked from the dialog text
  consentMode: 'advanced', // 'basic' loads Google tags only after analytics or advertising consent
  urlPassthrough: false, // carry ad click IDs (gclid, wbraid ...) through internal links while ad cookies are denied
};

const TRIGGER_SELECTOR = '#changeCookieFerPreferences, [data-cookiefer-open]';
const NATIVE_CONTROL_SELECTOR = 'button, a[href], input, select, textarea';

// Used only when the stylesheet fails to load: a plain dialog is better than none.
const FALLBACK_DIALOG_STYLE = 'position:fixed;left:0;right:0;bottom:0;z-index:2147483000;max-height:80vh;overflow:auto;'
  + 'padding:16px;background:#fff;color:#111;font:14px/1.5 system-ui,sans-serif;box-shadow:0 -4px 16px rgba(0,0,0,.15)';

// localStorage can throw (blocked storage, sandboxed iframes) or hold broken JSON; neither may stop the widget.
const storage = {
  get(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Without storage the choice only lasts for this page view.
    }
  },
  getJSON(key) {
    try {
      return JSON.parse(this.get(key));
    } catch {
      return null;
    }
  },
  setJSON(key, value) {
    this.set(key, JSON.stringify(value));
  },
};

const onDomReady = (callback) => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
  } else {
    callback();
  }
};

const loadScript = (src) => {
  const script = document.createElement('script');
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
};

const createElement = (tag, properties = {}, children = []) => {
  const element = Object.assign(document.createElement(tag), properties);
  element.append(...children);
  return element;
};

class CookieFer {
  constructor(googleTagId, cssStyleSheet, facebookPixelId, options = {}) {
    // The script sometimes ends up on a page twice (theme + plugin); a second instance would duplicate tags and dialogs.
    if (window.cookieFer && window.cookieFer.isCookieFer) {
      console.warn('[CookieFer] Already initialised, using the existing instance.');
      return window.cookieFer;
    }
    this.isCookieFer = true;
    window.cookieFer = this;

    this.googleTagId = googleTagId;
    this.googleTagIds = this.parseGoogleTagIds(googleTagId);
    this.cssStyleSheet = cssStyleSheet || null;
    this.facebookPixelId = this.parseFacebookPixelId(facebookPixelId);
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.dialogId = 'consentDialog';
    this.dialog = null;
    this.dialogPromise = null;
    this.returnFocusTo = null;
    this.pixelLoaded = false;
    this.googleTagsLoaded = false;

    this.translations = this.defineTranslations();
    this.language = this.resolveLanguage();
    this.translatedOptions = {
      ...this.translations[this.language],
      ...options
    };

    const storedConsent = this.readStoredConsent();
    this.hasStoredChoice = Boolean(storedConsent);
    this.consent = storedConsent ? storedConsent.settings : this.getDefaultConsentSettings();
    this.consentTimestamp = storedConsent ? storedConsent.timestamp : null;
    if (!this.hasStoredChoice) {
      // Earlier versions always kept consentSettings in localStorage, and site scripts may read it.
      storage.setJSON(STORAGE_KEYS.settings, this.consent);
    }

    // Consent defaults, and a returning visitor's choice, must be in the dataLayer before any Google tag runs.
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') {
      window.gtag = function gtag() {
        window.dataLayer.push(arguments);
      };
    }
    this.gtag('consent', 'default', {
      ...this.toGtagConsent(this.getDefaultConsentSettings()),
      wait_for_update: 500,
    });
    if (this.hasStoredChoice) {
      this.gtag('consent', 'update', this.toGtagConsent(this.consent));
    }
    this.syncGoogleTags();
    this.pushConsentToDataLayer(this.consent);
    this.createConsentCookies(this.consent);
    this.syncFacebookPixel(this.consent);
    this.dispatchConsentEvent();

    onDomReady(() => this.initDialog());
  }

  gtag() {
    window.dataLayer.push(arguments);
  }

  parseGoogleTagIds(googleTagId) {
    return [].concat(googleTagId || [])
      .map((id) => String(id).trim())
      .filter((id) => {
        const isValid = /^[A-Z]{1,4}-[A-Z0-9-]+$/i.test(id);
        if (!isValid) console.warn(`[CookieFer] Ignoring invalid Google tag ID "${id}".`);
        return isValid;
      });
  }

  parseFacebookPixelId(facebookPixelId) {
    if (!facebookPixelId) return null;
    const id = String(facebookPixelId).trim();
    if (/^\d+$/.test(id)) return id;
    console.warn(`[CookieFer] Ignoring invalid Meta Pixel ID "${id}".`);
    return null;
  }

  resolveLanguage() {
    for (const candidate of [this.options.language, document.documentElement.lang]) {
      if (!candidate) continue;
      const language = String(candidate).toLowerCase();
      const baseLanguage = language.split(/[-_]/)[0]; // "hr-HR" -> "hr"
      if (this.translations[language]) return language;
      if (this.translations[baseLanguage]) return baseLanguage;
    }
    return 'en';
  }

  createConsentSettings(getValue) {
    return CONSENT_TYPES.reduce((settings, type) => {
      settings[type.key] = Boolean(getValue(type));
      return settings;
    }, {});
  }

  getDefaultConsentSettings() {
    return this.createConsentSettings(() => false);
  }

  normalizeConsentSettings(settings) {
    return this.createConsentSettings(({ key }) => settings && settings[key]);
  }

  toGtagConsent(settings) {
    return CONSENT_TYPES.reduce((consent, { key, gtag }) => {
      consent[gtag] = settings[key] ? 'granted' : 'denied';
      return consent;
    }, {});
  }

  getConsent() {
    return { ...this.consent };
  }

  readStoredConsent() {
    const settings = storage.getJSON(STORAGE_KEYS.settings);
    if (storage.get(STORAGE_KEYS.dialogState) !== 'closed' || !settings || typeof settings !== 'object') {
      return null;
    }

    let meta = storage.getJSON(STORAGE_KEYS.meta);
    if (!meta || typeof meta.timestamp !== 'number') {
      // Choice saved by an older CookieFer without a timestamp: its lifetime starts now.
      meta = { timestamp: Date.now(), version: null };
      storage.setJSON(STORAGE_KEYS.meta, meta);
    }

    const { consentMaxAgeDays, consentVersion } = this.options;
    const isExpired = consentMaxAgeDays > 0 && Date.now() - meta.timestamp > consentMaxAgeDays * DAY_IN_MS;
    const isOutdated = consentVersion != null && meta.version !== consentVersion;
    if (isExpired || isOutdated) return null;

    return { settings: this.normalizeConsentSettings(settings), timestamp: meta.timestamp };
  }

  updateConsent(settings) {
    this.consent = this.normalizeConsentSettings(settings);
    this.hasStoredChoice = true;
    this.consentTimestamp = Date.now();
    storage.setJSON(STORAGE_KEYS.settings, this.consent);
    storage.setJSON(STORAGE_KEYS.meta, { timestamp: this.consentTimestamp, version: this.options.consentVersion });
    storage.set(STORAGE_KEYS.dialogState, 'closed');

    this.gtag('consent', 'update', this.toGtagConsent(this.consent));
    this.syncGoogleTags();
    this.createConsentCookies(this.consent);
    this.removeTrackingCookies(this.consent);
    this.pushConsentToDataLayer(this.consent);
    this.syncFacebookPixel(this.consent);
    this.dispatchConsentEvent();
    this.closeDialog();
  }

  saveCookieFerPreferences() {
    this.updateConsent(this.createConsentSettings(({ gtag }) => {
      const checkbox = this.getCheckbox(gtag);
      return checkbox && checkbox.checked;
    }));
  }

  acceptAndSaveAll() {
    this.updateConsent(this.createConsentSettings(() => true));
  }

  refuseAndSaveAll() {
    this.updateConsent(this.getDefaultConsentSettings());
  }

  // 'advanced' Consent Mode loads Google tags right away, and they send cookieless pings until consent;
  // 'basic' waits until the visitor allows analytics or advertising.
  syncGoogleTags() {
    if (this.googleTagsLoaded) return;
    if (this.options.consentMode === 'basic' && !this.consent.analyticsStorage && !this.consent.adStorage) return;
    this.googleTagsLoaded = true;
    this.loadGoogleTags();
  }

  loadGoogleTags() {
    const containerIds = this.googleTagIds.filter((id) => /^GTM-/i.test(id));
    const tagIds = this.googleTagIds.filter((id) => !/^GTM-/i.test(id));

    // Commands are queued in the dataLayer, so they are safe to push before gtag.js arrives (or if it is blocked).
    if (this.options.urlPassthrough) this.gtag('set', 'url_passthrough', true); // must come before any config
    if (tagIds.length) {
      this.gtag('js', new Date());
      tagIds.forEach((id) => this.gtag('config', id));
      loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(tagIds[0])}`);
    }
    containerIds.forEach((id) => {
      window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
      loadScript(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`);
    });
  }

  pushConsentToDataLayer(settings) {
    const consentSettings = {};
    CONSENT_TYPES.forEach(({ key }) => {
      consentSettings[key] = settings[key] ? 'granted' : 'denied';
    });
    // Same payload as earlier versions (wait_for_update included): GTM setups on existing sites read this object.
    window.dataLayer.push({
      event: 'consentUpdate',
      consentSettings: { ...consentSettings, wait_for_update: 300 }
    });
  }

  dispatchConsentEvent() {
    window.dispatchEvent(new CustomEvent('cookiefer:update', { detail: this.getConsent() }));
  }

  createConsentCookies(settings) {
    const maxAge = this.getConsentCookieMaxAge();
    this.setCookie('Consent_Necessary_Cookies', 'granted', maxAge);
    CONSENT_TYPES.forEach(({ key, cookie }) => {
      this.setCookie(cookie, settings[key] ? 'granted' : 'denied', maxAge);
    });
  }

  // The mirror cookies live as long as the stored choice; before a choice they are session cookies.
  getConsentCookieMaxAge() {
    if (!this.hasStoredChoice) return null;
    const { consentMaxAgeDays } = this.options;
    if (!(consentMaxAgeDays > 0)) return MAX_COOKIE_AGE;
    const remainingMs = this.consentTimestamp + consentMaxAgeDays * DAY_IN_MS - Date.now();
    return Math.max(0, Math.min(MAX_COOKIE_AGE, Math.round(remainingMs / 1000)));
  }

  setCookie(name, value, maxAge = null) {
    let cookie = `${name}=${value}; path=/; SameSite=Lax`;
    if (maxAge !== null) cookie += `; max-age=${maxAge}`;
    if (window.location.protocol === 'https:') cookie += '; Secure';
    document.cookie = cookie;
  }

  removeTrackingCookies(settings) {
    const patterns = [
      ...(settings.analyticsStorage ? [] : TRACKING_COOKIES.analytics),
      ...(settings.adStorage ? [] : TRACKING_COOKIES.ads),
      ...(this.isPixelAllowed(settings) ? [] : TRACKING_COOKIES.pixel),
    ];
    const names = document.cookie.split(';')
      .map((cookie) => cookie.split('=')[0].trim())
      .filter((name) => patterns.some((pattern) => pattern.test(name)));
    if (!names.length) return;

    // Tracking cookies usually live on the parent domain (.example.com), so try the host and every parent.
    const hostParts = window.location.hostname.split('.');
    const domains = [''];
    for (let i = 0; i < hostParts.length - 1; i += 1) {
      domains.push(`; domain=${hostParts.slice(i).join('.')}`);
    }
    names.forEach((name) => domains.forEach((domain) => {
      document.cookie = `${name}=; path=/; max-age=0${domain}`;
    }));
  }

  // The Pixel needs both advertising storage and advertising data consent.
  isPixelAllowed(settings) {
    return Boolean(settings.adStorage && settings.adUserData);
  }

  syncFacebookPixel(settings) {
    if (!this.facebookPixelId) return;
    const isAllowed = this.isPixelAllowed(settings);
    if (isAllowed && !this.pixelLoaded) {
      this.addFacebookPixel();
    } else if (this.pixelLoaded) {
      window.fbq('consent', isAllowed ? 'grant' : 'revoke');
    }
  }

  addFacebookPixel() {
    if (typeof window.fbq !== 'function') {
      // Meta's bootstrap: queue calls until fbevents.js has loaded.
      const fbq = function () {
        if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments);
        else fbq.queue.push(arguments);
      };
      Object.assign(fbq, { push: fbq, loaded: true, version: '2.0', queue: [] });
      window.fbq = fbq;
      if (!window._fbq) window._fbq = fbq;
      loadScript('https://connect.facebook.net/en_US/fbevents.js');
    }
    window.fbq('init', this.facebookPixelId);
    window.fbq('track', 'PageView');
    this.pixelLoaded = true;
  }

  initDialog() {
    this.bindTriggers();
    if (!this.hasStoredChoice) this.showDialog({ isAutoOpen: true });
  }

  bindTriggers() {
    document.querySelectorAll(TRIGGER_SELECTOR).forEach((trigger) => {
      if (trigger.id === 'changeCookieFerPreferences') {
        trigger.textContent = this.translatedOptions.change_cookieFer_preferences;
      }
      // A <span> or <div> trigger needs a role and a tab stop to work from the keyboard.
      if (!trigger.matches(NATIVE_CONTROL_SELECTOR)) {
        trigger.setAttribute('role', 'button');
        if (!trigger.hasAttribute('tabindex')) trigger.tabIndex = 0;
        trigger.style.cursor = 'pointer';
      }
    });

    // Delegated, so triggers rendered later (footers, SPA views) work as well.
    document.addEventListener('click', (event) => {
      const trigger = event.target.closest && event.target.closest(TRIGGER_SELECTOR);
      if (!trigger) return;
      event.preventDefault();
      this.openDialog();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const trigger = event.target.closest && event.target.closest(TRIGGER_SELECTOR);
      if (!trigger || trigger.matches(NATIVE_CONTROL_SELECTOR)) return; // native controls fire click themselves
      event.preventDefault();
      this.openDialog();
    });
  }

  // Creates the dialog once; every later call reuses it.
  ensureDialog() {
    if (!this.dialogPromise) {
      this.dialogPromise = this.loadCSS()
        .then(() => true, (error) => {
          console.warn(`[CookieFer] ${error.message}`);
          return false;
        })
        .then((isStyled) => this.buildConsentDialog(isStyled));
    }
    return this.dialogPromise;
  }

  // Kept from earlier versions: resolves once the dialog exists.
  createConsentDialog() {
    return this.ensureDialog();
  }

  loadCSS() {
    return new Promise((resolve, reject) => {
      if (!this.cssStyleSheet) {
        resolve(); // the site includes the stylesheet itself
        return;
      }
      const href = new URL(this.cssStyleSheet, document.baseURI).href;
      if (Array.from(document.styleSheets).some((sheet) => sheet.href === href)) {
        resolve();
        return;
      }
      const link = createElement('link', { rel: 'stylesheet', href });
      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Stylesheet failed to load: ${href}`));
      document.head.appendChild(link);
    });
  }

  buildConsentDialog(isStyled = true) {
    const t = this.translatedOptions;

    const items = [
      { name: 'necessary_cookies', label: t.necessary_cookies_title, checked: true, disabled: true },
      ...CONSENT_TYPES.map(({ gtag }) => ({ name: gtag, label: t[`${gtag}_title`] })),
    ].map(({ name, label, checked = false, disabled = false }) => createElement('label', { className: 'consent-item' }, [
      createElement('input', { type: 'checkbox', name, checked, disabled }),
      createElement('span', { textContent: label }),
    ]));

    // Accept and refuse share one style on purpose: refusing has to be as easy to spot as accepting.
    // "Settings" is shown by the stylesheet only on phones, whose first layer hides the categories.
    const buttons = [
      { id: 'saveRefuseAllCookieFerPreferences', action: 'refuse', text: t.refuse_all_button_title, variant: 'primary' },
      { id: 'saveAcceptAllCookieFerPreferences', action: 'accept', text: t.accept_all_button_title, variant: 'primary' },
      { id: 'saveCookieFerPreferences', action: 'save', text: t.button_title, variant: 'secondary' },
      { id: 'showCookieFerSettings', action: 'expand', text: t.settings_button_title, variant: 'secondary' },
    ].map(({ id, action, text, variant }) => {
      const button = createElement('button', {
        type: 'button',
        id,
        className: `consent-button consent-button--${variant}`,
        textContent: text,
      });
      button.dataset.action = action;
      if (action === 'expand') {
        // Hidden inline, not with the hidden attribute: Tailwind and Bootstrap resets force [hidden] { display: none !important },
        // which would beat the stylesheet that shows this button on phones. An older cached stylesheet keeps it hidden.
        button.style.display = 'none';
        button.setAttribute('aria-controls', 'consent_items');
        button.setAttribute('aria-expanded', 'false');
      }
      return button;
    });

    // HTML on purpose: consent_text and consent_link may contain markup.
    const consentText = createElement('div', { id: 'consent_text' });
    const text = t.consent_text.replace('{partners}', this.getPartnersText());
    if (this.options.privacyPolicyUrl && !this.options.consent_link) {
      consentText.innerHTML = `${text} `;
      consentText.append(createElement('a', { href: this.options.privacyPolicyUrl, textContent: t.consent_link_text }));
    } else {
      consentText.innerHTML = `${text} ${t.consent_link}`;
    }

    const dialog = createElement('div', { id: this.dialogId, className: 'cookie-fer', tabIndex: -1 }, [
      createElement('div', { id: 'consent_title', textContent: t.title }),
      consentText,
      createElement('div', { id: 'consent_items', className: 'consent-items' }, items),
      createElement('div', { id: 'consent_buttons' }, buttons),
    ]);
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-labelledby', 'consent_title');
    dialog.setAttribute('aria-describedby', 'consent_text');
    dialog.dataset.theme = this.options.theme;
    if (!isStyled) dialog.style.cssText = FALLBACK_DIALOG_STYLE;
    dialog.style.outline = 'none'; // the container is only focused from code, a ring around the whole dialog is noise

    dialog.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      const { action } = button.dataset;
      if (action === 'accept') this.acceptAndSaveAll();
      else if (action === 'refuse') this.refuseAndSaveAll();
      else if (action === 'expand') this.expandDialog();
      else this.saveCookieFerPreferences();
    });
    dialog.addEventListener('keydown', (event) => {
      // Escape only closes an already answered dialog; the first-visit banner waits for a choice.
      if (event.key === 'Escape' && this.hasStoredChoice) this.closeDialog();
    });

    this.dialog = dialog;
    this.setDialogVisible(false);
    document.body.appendChild(dialog);
    return dialog;
  }

  // Names the third parties this instance actually loads, for the {partners} placeholder in consent_text.
  getPartnersText() {
    const partners = [];
    if (this.googleTagIds.length) partners.push('Google');
    if (this.facebookPixelId) partners.push('Meta');
    return partners.length ? ` (${partners.join(', ')})` : '';
  }

  getCheckbox(name) {
    return this.dialog ? this.dialog.querySelector(`input[name="${name}"]`) : null;
  }

  // Puts the current choice into the dialog's checkboxes.
  loadConsentSettings() {
    CONSENT_TYPES.forEach(({ key, gtag }) => {
      const checkbox = this.getCheckbox(gtag);
      if (checkbox) checkbox.checked = this.consent[key];
    });
  }

  setDialogVisible(isVisible) {
    this.dialog.hidden = !isVisible;
    // Inline display too, so an older cached stylesheet cannot keep a hidden dialog on screen.
    this.dialog.style.display = isVisible ? '' : 'none';
  }

  // Phones get a compact first layer; expanding it reveals the categories and the save button.
  setDialogExpanded(isExpanded) {
    if (isExpanded) this.dialog.setAttribute('data-expanded', '');
    else this.dialog.removeAttribute('data-expanded');
    const settingsButton = this.dialog.querySelector('#showCookieFerSettings');
    if (settingsButton) settingsButton.setAttribute('aria-expanded', String(isExpanded));
  }

  expandDialog() {
    this.setDialogExpanded(true);
    const firstSwitch = this.dialog.querySelector('.consent-item input:not(:disabled)');
    if (firstSwitch) firstSwitch.focus({ preventScroll: true });
  }

  openDialog() {
    this.returnFocusTo = document.activeElement;
    return this.showDialog();
  }

  showDialog({ isAutoOpen = false } = {}) {
    return this.ensureDialog()
      .then((dialog) => {
        this.loadConsentSettings();
        this.setDialogExpanded(!isAutoOpen); // opened on purpose ("Cookie settings" link): show the categories
        this.setDialogVisible(true);
        // On page load, don't steal focus from a field the visitor is already using (e.g. an autofocus search box).
        const active = document.activeElement;
        if (!isAutoOpen || !active || active === document.body) dialog.focus({ preventScroll: true });
        return dialog;
      })
      .catch((error) => console.error('[CookieFer] Error creating dialog:', error));
  }

  closeDialog() {
    if (!this.dialog) return;
    const hadFocus = this.dialog.contains(document.activeElement);
    const returnFocusTo = this.returnFocusTo;
    this.returnFocusTo = null;
    this.setDialogVisible(false);
    if (hadFocus && returnFocusTo && returnFocusTo !== document.body && document.contains(returnFocusTo)) {
      returnFocusTo.focus({ preventScroll: true });
    }
  }

  defineTranslations() {
    return {
      hr: {
        title: "Privola za korištenje osobnih podataka",
        necessary_cookies_title: "Nužni kolačići",
        ad_storage_title: "Oglašavački kolačići",
        ad_user_data_title: "Korištenje podataka o oglašavanju",
        ad_personalization_title: "Personalizacija oglasa",
        analytics_storage_title: "Kolačići analitike",
        functionality_storage_title: "Kolačići funkcionalnosti",
        personalization_storage_title: "Kolačići personalizacije",
        security_storage_title: "Kolačići sigurnosti",
        button_title: "Spremi odabrano",
        accept_all_button_title: "Prihvati sve",
        refuse_all_button_title: "Odbaci sve",
        consent_text: "Poštujemo vašu privatnost. Nužne kolačiće koristimo za rad stranice, a uz vaš pristanak i kolačiće za analitiku i oglašavanje{partners}. Pristanak možete promijeniti ili povući u bilo kojem trenutku.",
        consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>Opširnije</a>",
        change_cookieFer_preferences: "Postavke kolačića",
        settings_button_title: "Postavke",
        consent_link_text: "Opširnije",
      },
      // Add other languages...
      en: {
        title: "Consent for the Use of Personal Data",
        necessary_cookies_title: "Necessary Cookies",
        ad_storage_title: "Advertising Cookies",
        ad_user_data_title: "Use of Advertising Data",
        ad_personalization_title: "Ad Personalization",
        analytics_storage_title: "Analytics Cookies",
        functionality_storage_title: "Functionality Cookies",
        personalization_storage_title: "Personalization Cookies",
        security_storage_title: "Security Cookies",
        button_title: "Save Selected",
        accept_all_button_title: "Accept All",
        refuse_all_button_title: "Refuse All",
        consent_text: "We respect your privacy. We use necessary cookies to run this website and, with your consent, cookies for analytics and advertising{partners}. You can change or withdraw your consent at any time.",
        consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>Learn More</a>",
        change_cookieFer_preferences: "Cookie Settings",
        settings_button_title: "Settings",
        consent_link_text: "Learn More",

      },
      de: {
        title: "Zustimmung zur Verwendung persönlicher Daten",
        necessary_cookies_title: "Notwendige Cookies",
        ad_storage_title: "Werbe-Cookies",
        ad_user_data_title: "Nutzung von Werbedaten",
        ad_personalization_title: "Anzeigenpersonalisierung",
        analytics_storage_title: "Analytische Cookies",
        functionality_storage_title: "Funktionalitäts-Cookies",
        personalization_storage_title: "Personalisierungs-Cookies",
        security_storage_title: "Sicherheits-Cookies",
        button_title: "Ausgewähltes speichern",
        accept_all_button_title: "Alles akzeptieren",
        refuse_all_button_title: "Alles ablehnen",
        consent_text: "Wir respektieren Ihre Privatsphäre. Wir verwenden notwendige Cookies für den Betrieb der Website und, mit Ihrer Einwilligung, Cookies für Analyse und Werbung{partners}. Sie können Ihre Einwilligung jederzeit ändern oder widerrufen.",
        consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>Mehr erfahren</a>",
        change_cookieFer_preferences: "Cookie-Einstellungen",
        settings_button_title: "Einstellungen",
        consent_link_text: "Mehr erfahren",

      },
      it: {
        title: "Consenso per l'uso dei dati personali",
        necessary_cookies_title: "Cookie necessari",
        ad_storage_title: "Cookie pubblicitari",
        ad_user_data_title: "Uso dei dati pubblicitari",
        ad_personalization_title: "Personalizzazione degli annunci",
        analytics_storage_title: "Cookie analitici",
        functionality_storage_title: "Cookie di funzionalità",
        personalization_storage_title: "Cookie di personalizzazione",
        security_storage_title: "Cookie di sicurezza",
        button_title: "Salva selezionati",
        accept_all_button_title: "Accetta tutto",
        refuse_all_button_title: "Rifiuta tutto",
        consent_text: "Rispettiamo la tua privacy. Utilizziamo cookie necessari al funzionamento del sito e, con il tuo consenso, cookie di analisi e pubblicità{partners}. Puoi modificare o revocare il consenso in qualsiasi momento.",
        consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>Scopri di più</a>",
        change_cookieFer_preferences: "Impostazioni cookie",
        settings_button_title: "Impostazioni",
        consent_link_text: "Scopri di più",

      },
      ru: {
        title: "Согласие на использование личных данных",
        necessary_cookies_title: "Необходимые куки",
        ad_storage_title: "Куки для рекламы",
        ad_user_data_title: "Использование данных рекламы",
        ad_personalization_title: "Персонализация рекламы",
        analytics_storage_title: "Аналитические куки",
        functionality_storage_title: "Функциональные куки",
        personalization_storage_title: "Куки персонализации",
        security_storage_title: "Куки безопасности",
        button_title: "Сохранить выбранное",
        accept_all_button_title: "Принять все",
        refuse_all_button_title: "Отклонить все",
        consent_text: "Мы уважаем вашу конфиденциальность. Мы используем необходимые куки для работы сайта, а с вашего согласия — также куки для аналитики и рекламы{partners}. Вы можете изменить или отозвать согласие в любое время.",
        consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>Узнать больше</a>",
        change_cookieFer_preferences: "Настройки куки",
        settings_button_title: "Настройки",
        consent_link_text: "Узнать больше",

      },
      pl: {
        title: "Zgoda na używanie danych osobowych",
        necessary_cookies_title: "Niezbędne ciasteczka",
        ad_storage_title: "Ciasteczka reklamowe",
        ad_user_data_title: "Użycie danych reklamowych",
        ad_personalization_title: "Personalizacja reklam",
        analytics_storage_title: "Ciasteczka analityczne",
        functionality_storage_title: "Ciasteczka funkcjonalności",
        personalization_storage_title: "Ciasteczka personalizacji",
        security_storage_title: "Ciasteczka bezpieczeństwa",
        button_title: "Zapisz wybrane",
        accept_all_button_title: "Zaakceptuj wszystko",
        refuse_all_button_title: "Odrzuć wszystko",
        consent_text: "Szanujemy Twoją prywatność. Używamy niezbędnych ciasteczek do działania strony, a za Twoją zgodą także ciasteczek analitycznych i reklamowych{partners}. Możesz zmienić lub wycofać zgodę w dowolnym momencie.",
        consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>Dowiedz się więcej</a>",
        change_cookieFer_preferences: "Ustawienia ciasteczek",
        settings_button_title: "Ustawienia",
        consent_link_text: "Dowiedz się więcej",

      },
      sl: {
        title: "Privolitev za uporabo osebnih podatkov",
        necessary_cookies_title: "Nujni piškotki",
        ad_storage_title: "Oglaševalski piškotki",
        ad_user_data_title: "Uporaba oglaševalskih podatkov",
        ad_personalization_title: "Personalizacija oglasov",
        analytics_storage_title: "Analitični piškotki",
        functionality_storage_title: "Piškotki funkcionalnosti",
        personalization_storage_title: "Piškotki personalizacije",
        security_storage_title: "Piškotki varnosti",
        button_title: "Shrani izbrano",
        accept_all_button_title: "Sprejmi vse",
        refuse_all_button_title: "Zavrni vse",
        consent_text: "Spoštujemo vašo zasebnost. Nujne piškotke uporabljamo za delovanje spletne strani, z vašo privolitvijo pa tudi piškotke za analitiko in oglaševanje{partners}. Privolitev lahko kadar koli spremenite ali prekličete.",
        consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>Več informacij</a>",
        change_cookieFer_preferences: "Nastavitve piškotkov",
        settings_button_title: "Nastavitve",
        consent_link_text: "Več informacij",

      },
      cs: {
        title: "Souhlas s používáním osobních údajů",
        necessary_cookies_title: "Nezbytné cookies",
        ad_storage_title: "Reklamní cookies",
        ad_user_data_title: "Využití reklamních dat",
        ad_personalization_title: "Personalizace reklam",
        analytics_storage_title: "Analytické cookies",
        functionality_storage_title: "Funkční cookies",
        personalization_storage_title: "Cookies pro personalizaci",
        security_storage_title: "Bezpečnostní cookies",
        button_title: "Uložit vybrané",
        accept_all_button_title: "Přijmout vše",
        refuse_all_button_title: "Odmítnout vše",
        consent_text: "Respektujeme vaše soukromí. Nezbytné cookies používáme pro fungování webu a s vaším souhlasem také cookies pro analýzu a reklamu{partners}. Souhlas můžete kdykoli změnit nebo odvolat.",
        consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>Více informací</a>",
        change_cookieFer_preferences: "Nastavení cookies",
        settings_button_title: "Nastavení",
        consent_link_text: "Více informací",

      },
      nl: {
        title: "Toestemming voor het gebruik van persoonsgegevens",
        necessary_cookies_title: "Noodzakelijke cookies",
        ad_storage_title: "Advertentiecookies",
        ad_user_data_title: "Gebruik van advertentiegegevens",
        ad_personalization_title: "Advertentiepersonalisatie",
        analytics_storage_title: "Analytische cookies",
        functionality_storage_title: "Functionaliteitscookies",
        personalization_storage_title: "Personalisatiecookies",
        security_storage_title: "Beveiligingscookies",
        button_title: "Geselecteerde opslaan",
        accept_all_button_title: "Accepteer alles",
        refuse_all_button_title: "Weiger alles",
        consent_text: "Wij respecteren uw privacy. We gebruiken noodzakelijke cookies om de website te laten werken en, met uw toestemming, cookies voor analyse en advertenties{partners}. U kunt uw toestemming op elk moment wijzigen of intrekken.",
        consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>Meer weten</a>",
        change_cookieFer_preferences: "Cookie-instellingen",
        settings_button_title: "Instellingen",
        consent_link_text: "Meer weten",

      },
      is: {
        title: "Samþykki fyrir notkun persónuupplýsinga",
        necessary_cookies_title: "Nauðsynlegar kökur",
        ad_storage_title: "Auglýsingakökur",
        ad_user_data_title: "Notkun auglýsingagagna",
        ad_personalization_title: "Sérsniðnar auglýsingar",
        analytics_storage_title: "Greiningarkökur",
        functionality_storage_title: "Virknikökur",
        personalization_storage_title: "Sérsniðnar kökur",
        security_storage_title: "Öryggiskökur",
        button_title: "Vista val",
        accept_all_button_title: "Samþykkja allt",
        refuse_all_button_title: "Hafna öllu",
        consent_text: "Við virðum friðhelgi þína. Við notum nauðsynlegar kökur til að vefsíðan virki og, með samþykki þínu, kökur fyrir greiningu og auglýsingar{partners}. Þú getur breytt eða afturkallað samþykki þitt hvenær sem er.",
        consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>Læra meira</a>",
        change_cookieFer_preferences: "Kökustillingar",
        settings_button_title: "Stillingar",
        consent_link_text: "Læra meira",

      },
      fr: {
        title: "Consentement pour l'utilisation des données personnelles",
        necessary_cookies_title: "Cookies nécessaires",
        ad_storage_title: "Cookies publicitaires",
        ad_user_data_title: "Utilisation des données publicitaires",
        ad_personalization_title: "Personnalisation des publicités",
        analytics_storage_title: "Cookies analytiques",
        functionality_storage_title: "Cookies de fonctionnalité",
        personalization_storage_title: "Cookies de personnalisation",
        security_storage_title: "Cookies de sécurité",
        button_title: "Sauvegarder la sélection",
        accept_all_button_title: "Tout accepter",
        refuse_all_button_title: "Tout refuser",
        consent_text: "Nous respectons votre vie privée. Nous utilisons des cookies nécessaires au fonctionnement du site et, avec votre consentement, des cookies d'analyse et de publicité{partners}. Vous pouvez modifier ou retirer votre consentement à tout moment.",
        consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>En savoir plus</a>",
        change_cookieFer_preferences: "Paramètres des cookies",
        settings_button_title: "Paramètres",
        consent_link_text: "En savoir plus",

      },
      hu: {
        title: "Hozzájárulás a személyes adatok használatához",
        necessary_cookies_title: "Szükséges sütik",
        ad_storage_title: "Hirdetési sütik",
        ad_user_data_title: "Hirdetési adatok használata",
        ad_personalization_title: "Hirdetések személyre szabása",
        analytics_storage_title: "Analitikai sütik",
        functionality_storage_title: "Funkcionalitás sütik",
        personalization_storage_title: "Személyre szabási sütik",
        security_storage_title: "Biztonsági sütik",
        button_title: "Kiválasztottak mentése",
        accept_all_button_title: "Összes elfogadása",
        refuse_all_button_title: "Összes elutasítása",
        consent_text: "Tiszteletben tartjuk a magánszféráját. A weboldal működéséhez szükséges sütiket használunk, hozzájárulásával pedig analitikai és hirdetési sütiket is{partners}. Hozzájárulását bármikor módosíthatja vagy visszavonhatja.",
        consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>Tudj meg többet</a>",
        change_cookieFer_preferences: "Sütibeállítások",
        settings_button_title: "Beállítások",
        consent_link_text: "Tudj meg többet",

      },
      // Add other languages...
    };
  }
}
export default CookieFer;
