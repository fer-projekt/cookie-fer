# CookieBot: User Consent Management
CookieBot is a JavaScript-based solution designed to help website owners manage user consents for cookies and tracking technologies in compliance with data protection regulations like GDPR and CCPA. It integrates seamlessly with Google Consent Mode, allowing for dynamic consent handling and ensuring a respectful and legal approach to user data.

## Features
**Consent Dialog:** A customizable dialog prompts users for their cookie preferences, enhancing transparency and control over personal data processing.

**Local Storage:** User preferences are stored locally, ensuring their choices persist across sessions and visits, thereby improving the user experience by eliminating repetitive consent prompts.

**Dynamic Preference Management:** Users can modify their consent choices at any time, providing ongoing compliance and flexibility.

**Integration with Google Tag Manager:** Adjusts tracking functionalities based on user consents, ensuring compliance while maintaining the utility of analytics and advertising cookies.

**Security and Isolation:** Adheres to domain-specific storage rules, safeguarding user preferences and ensuring data isolation in line with web security standards.
Getting Started

**To integrate CookieBot into your website, follow these steps:**

## Installation & Initialization
Include the CookieBot css in your project.

    <link  rel="stylesheet"  href="css/fer-cookiebot.css">

Include the CookieBot script in your project.

Create an instance of the CookieBot class with your Google Tag ID:

    import FerCookieBot from './path/to/fer-cookiebot.js';
    /* ADD YOUR GTAG ID, OPTIONS - CREATES GTAG/GA4 TAG AND INITIALIZE COOKIES */
    const  cookieBot  =  new  FerCookieBot('YOUR_GOOGLE_TAG_ID', cookieBotOptions);

## Customization
CookieBot allows for extensive customization through options passed at initialization. This enables you to tailor the consent dialog to fit your website's style and requirements, as well as to specify the exact text and titles for various cookie categories and consent information.

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

    <button id="changePreferences">Change Cookie Preferences</button>

Attach an event listener to this button to trigger the consent dialog:

    document.getElementById('changePreferences').addEventListener('click', () => {
        cookieBot.openDialog();
    });


Remember to replace placeholders (like path/to/fer-cookiebot.js, YOUR_GOOGLE_TAG_ID, and links to documentation or license files) with actual paths and IDs relevant to your project. 

## License
This project is licensed under the MIT License - see the LICENSE file for details.
