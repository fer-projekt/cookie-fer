# CookieFer: JavaScript Consent Management for Google Consent v2 and Facebook Tracking

CookieFer is JavaScript solution designed for website owners to manage user consents for cookies and tracking technologies, ensuring compliance with data protection regulations like GDPR and CCPA. It now seamlessly integrates with both Google Consent Mode v2 and Facebook Pixel, offering dynamic consent handling and a respectful, legal approach to user data across major advertising platforms.

CookieFer enhances the integration of tracking technologies on your website by automatically generating and managing the necessary script codes for Google Analytics (via gtag.js) and Facebook Pixel. This feature simplifies the setup process, ensuring that your website complies with user consent preferences while eliminating the need for manual code insertion for these services.

# Automated Script Injection

Upon initialization, CookieFer dynamically inserts the Google Analytics and Facebook Pixel scripts into your webpage based on the provided identifiers (Google Tag ID and Facebook Pixel ID). This automation is designed to respect the consent choices made by your users, loading these tracking technologies only when permission has been granted, thereby adhering to privacy regulations such as GDPR and CCPA.

## Setup

No need to manually add separate script tags for Google Analytics or Facebook Pixel in your website's HTML. CookieFer handles the inclusion of these scripts dynamically, reducing setup complexity and potential errors.

When initializing CookieFer, pass your valid Google Tag ID and Facebook Pixel ID (if necessary) as arguments to the constructor.

## Remove Existing Tracking Scripts 

If you have previously added Google Analytics or Facebook Pixel scripts directly to your website's HTML, remove those scripts to prevent duplicate tracking and ensure that data collection is managed solely through CookieFer.

# Features

**Consent Dialog:** A customizable dialog prompts users for their cookie preferences, enhancing transparency and control over personal data processing.

**Local Storage:** User preferences are stored locally, ensuring their choices persist across sessions and visits, thereby improving the user experience by eliminating repetitive consent prompts.

**Dynamic Preference Management:** Users can modify their consent choices at any time, providing ongoing compliance and flexibility.

**Google Tag Manager and Facebook Pixel Integration:**: Provides seamless integration with Google Tag Manager (gtag.js) and Facebook Pixel, enabling or disabling specific tracking functionalities based on obtained consents. This ensures compliance while maintaining the utility of analytics and advertising cookies.

**Multi-Language Support**: Dynamically creates consent dialogs based on the user's browser language, enhancing accessibility and user experience for a global audience.

**Security and Isolation:** Adheres to domain-specific storage rules, safeguarding user preferences and ensuring data isolation in line with web security standards.

**To integrate CookieFer into your website, follow these steps:**

# Installation & Initialization

Import CookieFer as an ES module and create one instance. The stylesheet is loaded only when the dialog is actually shown:

    <script type="module">
        import CookieFer from './dist/cookie-fer.min.js';

        const cookieFer = new CookieFer(
            'G-XXXXXXXXXX',              // Google tag ID (G-…, AW-…, GTM-…) or an array of IDs
            './dist/cookie-fer.min.css', // stylesheet URL, or null if the page already includes it
            'YOUR_FACEBOOK_PIXEL_ID',    // Meta Pixel ID, or null
            { /* options and translation overrides, see below */ }
        );
    </script>

The Pixel ID and the options are optional. Creating a second instance on the same page returns the first one.

## Multi-Language Support

CookieFer now offers comprehensive multi-language support, enabling you to present the consent dialog in the user's preferred language. This feature enhances the user experience for a global audience by providing localized consent information, ensuring clarity and improving compliance with international privacy regulations.

CookieFer supports the following languages out of the box:

**Supported Languages:**

 - English (en) 
 - German (de) 
 - Italian (it) 
 - Russian (ru) 
 - Polish (pl)
 - Slovenian (sl) 
 - Czech (cs) 
 - Dutch (nl) 
 - Icelandic (is) 
 - French (fr)
 - Hungarian (hu)
 - Croatian (hr)

**Customizing Language Content** 

CookieFer allows for  customization through options passed at initialization. This enables you  to specify the exact text and titles for various cookie categories and consent information.

    const cookieFerOptions = {
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
        // {partners} becomes " (Google, Meta)", listing only the services this instance loads
        consent_text: "We respect your privacy. We use necessary cookies to run this website and, with your consent, cookies for analytics and advertising{partners}. You can change or withdraw your consent at any time.",
        consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>Learn More</a>",
        consent_link_text: "Learn More", // used with the privacyPolicyUrl option
        settings_button_title: "Settings", // phones: opens the categories
        change_cookieFer_preferences: "Cookie Settings",
    };

## Options

Besides the translation keys above, the options object accepts:

| Option | Default | Description |
|---|---|---|
| `language` | `<html lang>` | Dialog language. Regional codes such as `de-DE` use `de`; unknown languages fall back to English. |
| `theme` | `'light'` | `'light'`, `'dark'`, or `'auto'` to follow the visitor's system setting. |
| `consentMaxAgeDays` | `365` | Ask again after this many days. `0` keeps a choice forever. |
| `consentVersion` | `null` | Set or change it (e.g. `'2026-10'`) after a cookie policy change to ask every visitor again. |
| `privacyPolicyUrl` | `null` | Link to the site's own privacy or cookie policy, e.g. `'/politika-privatnosti'`. Without it the link points to Google's privacy policy. A custom `consent_link` takes precedence. |
| `consentMode` | `'advanced'` | `'advanced'` loads Google tags right away; until consent they send only cookieless pings. `'basic'` loads Google tags only after the visitor allows analytics or advertising. |
| `consentLogUrl` | `'https://cdn.fer.plus/cookie-fer/consent.php'` | Where every choice is recorded as proof of consent (see below). `false` turns it off. |
| `urlPassthrough` | `false` | Sets Google's `url_passthrough`: while advertising cookies are denied, ad click IDs (`gclid`, `wbraid` …) are carried through internal links so conversions can still be attributed. |

On phones and short screens, the first layer shows only the text and the buttons; **Settings** reveals the categories. When the dialog is opened from a preferences link, the categories are shown straight away.

## Preference Button

Implement a button allowing users to change their cookie preferences at any time. Its text is replaced with the translated `change_cookieFer_preferences`:

    <button id="changeCookieFerPreferences">Change Cookie Preferences</button>

Any element with a `data-cookiefer-open` attribute opens the dialog as well, including elements added after the page has loaded:

    <a href="/cookies" data-cookiefer-open>Cookie settings</a>

Prefer a `<button>`. A `<span>` or `<div>` trigger gets `role="button"` and a tab stop, so it still works from the keyboard.

## Theming

The dialog is styled with CSS custom properties, which you can override from your own stylesheet:

    :root {
        --cookiefer-accent: #e30613;            /* buttons, switches and links */
        --cookiefer-radius: 8px;
        --cookiefer-font: "Inter", sans-serif;  /* defaults to the system font */
    }

Available: `--cookiefer-accent`, `--cookiefer-accent-text`, `--cookiefer-bg`, `--cookiefer-text`, `--cookiefer-muted`, `--cookiefer-surface`, `--cookiefer-border`, `--cookiefer-radius`, `--cookiefer-shadow`, `--cookiefer-font`, `--cookiefer-font-size`, `--cookiefer-z-index`.

## JavaScript API

The instance is also available as `window.cookieFer`:

    window.cookieFer.openDialog();  // open the preferences dialog
    window.cookieFer.getConsent();  // { adStorage: false, analyticsStorage: true, … }

    window.addEventListener('cookiefer:update', (event) => {
        if (event.detail.functionalityStorage) loadVideoEmbeds();
    });

`cookiefer:update` fires when CookieFer starts and after every choice. Google Tag Manager setups can keep using the `consentUpdate` dataLayer event, which is pushed on every page load and after every choice.

## Stored Data

- `localStorage`: `consentSettings` (the choice), `dialogState`, and `consentMeta` (when the choice was made and for which `consentVersion`).
- `Consent_*` cookies mirror the choice for server-side code and expire together with it.
- Every choice gets a random consent ID (shown in the dialog when it is reopened) and is sent to `consent.php`, which appends it to `~/cookie-fer-consents/YYYY-MM.jsonl` outside the web root: time, consent ID, site, action and categories – no IP address or other personal data. On the server: `php consent.php stats [YYYY-MM]` (choices per site), `php consent.php find <consent id>`, `php consent.php prune <months>`.
- When a visitor withdraws consent, CookieFer deletes the matching Google Analytics (`_ga*`, `_gid`, `_gat*`), Google Ads (`_gcl_*`, `_gac_*`) and Meta Pixel (`_fbp`, `_fbc`) cookies.

Remember to replace placeholders (like path/to/cookie-fer.js, YOUR_GOOGLE_TAG_ID, and links to documentation or license files) with actual paths and IDs relevant to your project. 

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## BUILD

npm run build  