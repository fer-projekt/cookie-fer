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
Include the CookieBot script in your project.
Create an instance of the CookieBot class with your Google Tag ID:

    import CookieBot from './path/to/cookiebot.js';
    document.addEventListener('DOMContentLoaded', () => {
        const cookieBot = new CookieBot('YOUR_GOOGLE_TAG_ID');
    });

## Customization
Customize the consent dialog according to your site's design and consent requirements. The dialog can be styled using CSS and configured to include any specific consent options relevant to your site.
## Preference Button
Implement a button allowing users to change their cookie preferences at any time:

    <button id="changePreferences">Change Cookie Preferences</button>

Attach an event listener to this button to trigger the consent dialog:

    document.getElementById('changePreferences').addEventListener('click', () => {
        cookieBot.openDialog();
    });


Remember to replace placeholders (like path/to/cookiebot.js, YOUR_GOOGLE_TAG_ID, and links to documentation or license files) with actual paths and IDs relevant to your project. 

## License
This project is licensed under the MIT License - see the LICENSE file for details.
