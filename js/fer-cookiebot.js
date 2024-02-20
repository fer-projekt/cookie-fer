/* VERIFY CONSENT https://tagassistant.google.com */

class FerCookieBot {
    constructor(googleTagId, options = {}) {
        this.googleTagId = googleTagId;
        this.dialogId = 'consentDialog';

        this.options = {
            title: "Your Consent Title",
            necessary_cookies_title: "Necessary Cookies",
            ad_storage_title: "Advertising Cookies",
            ad_user_data_title: "Use of Advertising Data",
            ad_personalization_title: "Ad Personalization",
            analytics_storage_title: "Analytics Cookies",
            button_title: "Save Settings",
            consent_text: "This website uses cookies. We use cookies to personalize content and ads, provide social media features, and analyze our traffic.",
            consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>Learn More</a>",
            ...options
        };

        this.loadGTagScript().then(() => {
            this.initDataLayer();
            this.initializeConsentMode();
            this.createConsentDialog();
            this.loadConsentSettings();
            this.checkDialogState();
            this.attachEventListeners();
        }).catch(error => {
            console.error("Failed to load Google Tag:", error);
        });
    }

    initDataLayer() {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push(arguments);
    }

    gtag(command, ...args) {
        window.dataLayer.push([command, ...args]);
    }

    loadGTagScript() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.async = true;
            script.src = `https://www.googletagmanager.com/gtag/js?id=${this.googleTagId}`;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    initializeConsentMode() {
        this.gtag('js', new Date());
        this.gtag('consent', 'default', {
            'ad_storage': 'denied',
            'ad_user_data': 'denied',
            'ad_personalization': 'denied',
            'analytics_storage': 'denied',
            'wait_for_update': 500,
        });
        this.gtag('config', this.googleTagId);
    }

    updateConsent(adStorage, adUserData, adPersonalization, analyticsStorage) {
        this.gtag('consent', 'update', {
            'ad_storage': adStorage ? 'granted' : 'denied',
            'ad_user_data': adUserData ? 'granted' : 'denied',
            'ad_personalization': adPersonalization ? 'granted' : 'denied',
            'analytics_storage': analyticsStorage ? 'granted' : 'denied',
        });

        localStorage.setItem('consentSettings', JSON.stringify({
            adStorage,
            adUserData,
            adPersonalization,
            analyticsStorage
        }));
    }

    createConsentDialog() {
        const dialog = document.getElementById('consentDialog');
        // Set title
        const titleDiv = document.createElement('div');
        titleDiv.id = 'consent_title';
        titleDiv.innerText = this.options.title;
        dialog.appendChild(titleDiv);

        // Create and append checkboxes and labels
        const items = [{
                id: 'necessary_cookies',
                text: this.options.necessary_cookies_title,
                disabled: true,
                checked: true
            },
            {
                id: 'ad_storage',
                text: this.options.ad_storage_title
            },
            {
                id: 'ad_user_data',
                text: this.options.ad_user_data_title
            },
            {
                id: 'ad_personalization',
                text: this.options.ad_personalization_title
            },
            {
                id: 'analytics_storage',
                text: this.options.analytics_storage_title
            }
        ];

        items.forEach(item => {
            const label = document.createElement('label');
            label.className = 'consent-item';

            const input = document.createElement('input');
            input.type = 'checkbox';
            input.id = item.id;
            if (item.disabled) input.disabled = true;
            if (item.checked) input.checked = true;

            const textNode = document.createTextNode(' ' + item.text);

            label.appendChild(input);
            label.appendChild(textNode);
            dialog.appendChild(label);
        });

        // Set consent text
        const consentTextDiv = document.createElement('div');
        consentTextDiv.id = 'consent_text';
        consentTextDiv.innerHTML = this.options.consent_text + ' ' + this.options.consent_link;
        dialog.appendChild(consentTextDiv);

        // Save preferences button
        const saveButton = document.createElement('button');
        saveButton.id = 'saveCookieBotPreferences';
        saveButton.className = 'consent-button';
        saveButton.innerText = this.options.button_title;
        dialog.appendChild(saveButton);
    }

    loadConsentSettings() {
        const consentSettings = JSON.parse(localStorage.getItem('consentSettings'));

        /* START BUTTON */
        if (document.getElementById('changeCookieBotPreferences')) {
            document.getElementById('changeCookieBotPreferences').addEventListener('click', () => {
                this.openDialog();
            });
            document.getElementById('consent_title').innerText = this.options.title;
        }
        if (consentSettings) {
            document.getElementById('ad_storage').checked = consentSettings.adStorage;
            document.getElementById('ad_user_data').checked = consentSettings.adUserData;
            document.getElementById('ad_personalization').checked = consentSettings.adPersonalization;
            document.getElementById('analytics_storage').checked = consentSettings.analyticsStorage;
        }
    }

    checkDialogState() {
        const dialogState = localStorage.getItem('dialogState');
        if (dialogState === 'closed') {
            this.closeDialog();
        } else {
            this.openDialog();
        }
    }

    openDialog() {
        const dialog = document.getElementById(this.dialogId);
        if (dialog) dialog.showModal();
        else console.error('Dialog element not found');
    }

    closeDialog() {
        const dialog = document.getElementById(this.dialogId);
        if (dialog) dialog.close();
    }

    attachEventListeners() {
        const saveButton = document.getElementById('saveCookieBotPreferences');
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                this.saveCookieBotPreferences();
            });
        }
    }

    saveCookieBotPreferences() {
        const adStorage = document.getElementById('ad_storage').checked;
        const adUserData = document.getElementById('ad_user_data').checked;
        const adPersonalization = document.getElementById('ad_personalization').checked;
        const analyticsStorage = document.getElementById('analytics_storage').checked;
        this.updateConsent(adStorage, adUserData, adPersonalization, analyticsStorage);
        // Set dialog state as 'closed' in localStorage after saving preferences
        localStorage.setItem('dialogState', 'closed');
        this.closeDialog();
    }
}

export default FerCookieBot;