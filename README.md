# FerCookieBot: Enhanced Consent Management for Google Consent v2 and Facebook Tracking

FerCookieBot is an advanced JavaScript solution designed for website owners to manage user consents for cookies and tracking technologies, ensuring compliance with data protection regulations like GDPR and CCPA. It now seamlessly integrates with both Google Consent Mode v2 and Facebook Pixel, offering dynamic consent handling and a respectful, legal approach to user data across major advertising platforms.

FerCookieBot enhances the integration of tracking technologies on your website by automatically generating and managing the necessary script codes for Google Analytics (via gtag.js) and Facebook Pixel. This feature simplifies the setup process, ensuring that your website complies with user consent preferences while eliminating the need for manual code insertion for these services.

## Automated Script Injection

Upon initialization, FerCookieBot dynamically inserts the Google Analytics and Facebook Pixel scripts into your webpage based on the provided identifiers (Google Tag ID and Facebook Pixel ID). This automation is designed to respect the consent choices made by your users, loading these tracking technologies only when permission has been granted, thereby adhering to privacy regulations such as GDPR and CCPA.

## Remove Existing Tracking Scripts: 

When initializing FerCookieBot, pass your valid Google Tag ID and Facebook Pixel ID (if necessary) as arguments to the constructor.

If you have previously added Google Analytics or Facebook Pixel scripts directly to your website's HTML, remove those scripts to prevent duplicate tracking and ensure that data collection is managed solely through FerCookieBot.

## Features

**Consent Dialog:** A customizable dialog prompts users for their cookie preferences, enhancing transparency and control over personal data processing.

**Local Storage:** User preferences are stored locally, ensuring their choices persist across sessions and visits, thereby improving the user experience by eliminating repetitive consent prompts.

**Dynamic Preference Management:** Users can modify their consent choices at any time, providing ongoing compliance and flexibility.

**Google Tag Manager and Facebook Pixel Integration:**: Provides seamless integration with Google Tag Manager (gtag.js) and Facebook Pixel, enabling or disabling specific tracking functionalities based on obtained consents. This ensures compliance while maintaining the utility of analytics and advertising cookies.

**Multi-Language Support**: Dynamically creates consent dialogs based on the user's browser language, enhancing accessibility and user experience for a global audience.

**Security and Isolation:** Adheres to domain-specific storage rules, safeguarding user preferences and ensuring data isolation in line with web security standards.

**To integrate FerCookieBot into your website, follow these steps:**

## Installation & Initialization

Include the FerCookieBot css in your project.

    <link  rel="stylesheet"  href="css/fer-cookiebot.css">

Include the FerCookieBot script in your project.

Create an instance of the FerCookieBot class with your Google Tag ID and Facebook Pixel ID (Pixel and options are optional):

    import FerCookieBot from './path/to/fer-cookiebot.js';
    const cookieBotOptions = {
        // Your customization options / translations
    };
    /* ADD YOUR GTAG ID, PIXEL_ID, OPTIONS - CREATES GTAG/GA4 TAG, PIXEL TAG AND INITIALIZE COOKIES */
    const cookieBot = new FerCookieBot('YOUR_GOOGLE_TAG_ID');
    /* const cookieBot = new FerCookieBot('YOUR_GOOGLE_TAG_ID', 'YOUR_FACEBOOK_PIXEL_ID', cookieBotOptions); */



## Multi-Language Support

FerCookieBot now offers comprehensive multi-language support, enabling you to present the consent dialog in the user's preferred language. This feature enhances the user experience for a global audience by providing localized consent information, ensuring clarity and improving compliance with international privacy regulations.

FerCookieBot supports the following languages out of the box:

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
 - Croatian (hr)

**Customizing Language Content** 

FerCookieBot allows for  customization through options passed at initialization. This enables you  to specify the exact text and titles for various cookie categories and consent information.

    const cookieBotOptions = {
        title: "Your Consent Title",
        necessary_cookies_title: "Necessary Cookies",
        ad_storage_title: "Advertising Cookies",
        ad_user_data_title: "Use of Advertising Data",
        ad_personalization_title: "Ad Personalization",
        analytics_storage_title: "Analytics Cookies",
        button_title: "Save Settings",
        consent_text: "This website uses cookies. We use cookies to personalize content and ads, provide social media features, and analyze our traffic.",
        consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>Learn More</a>",
    };

## Preference Button

Implement a button allowing users to change their cookie preferences at any time:

    <button id="changeCookieBotPreferences">Change Cookie Preferences</button>

Remember to replace placeholders (like path/to/fer-cookiebot.js, YOUR_GOOGLE_TAG_ID, and links to documentation or license files) with actual paths and IDs relevant to your project. 

## License

This project is licensed under the MIT License - see the LICENSE file for details.