/* VERIFY CONSENT https://tagassistant.google.com */

class FerCookieBot {
    constructor(googleTagId, options = {}) {
        this.googleTagId = googleTagId;
        this.dialogId = 'consentDialog'; 

        this.options = {
            title: "Postavke pristanka",
            necessary_cookies_title: "Nužni kolačići",
            ad_storage_title: "Oglašavački kolačići",
            ad_user_data_title: "Korištenje podataka o oglašavanju",
            ad_personalization_title: "Personalizacija oglasa",
            analytics_storage_title: "Kolačići analitike",
            buton_title: "Spremi postavke",
            consent_text: "Ova web-stranica koristi kolačiće. Kolačiće upotrebljavamo kako bismo personalizirali sadržaj i oglase, omogućili značajke društvenih medija i analizirali promet.",
            consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>Opširnije</a>",
            ...options
        };

        this.loadGTagScript().then(() => {
            this.initDataLayer();
            this.initializeConsentMode();
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

    loadConsentSettings() {
        const consentSettings = JSON.parse(localStorage.getItem('consentSettings'));
        
        /* START BUTTON */
        if (document.getElementById('changeCookieBotPreferences')) {
            document.getElementById('changeCookieBotPreferences').addEventListener('click', () => {
                this.openDialog();
            });
            document.getElementById('consent_title').innerText = this.options.title;
        }

        /* SET OPTIONS */
        function appendTextNode(inputId, text) {
            const inputElement = document.getElementById(inputId);
            if (inputElement) {
                const textNode = document.createTextNode(text);
                inputElement.parentNode.insertBefore(textNode, inputElement.nextSibling);
            }
        }

        appendTextNode('necessary_cookies', this.options.necessary_cookies_title);
        appendTextNode('ad_storage', this.options.ad_storage_title);
        appendTextNode('ad_user_data', this.options.ad_user_data_title);
        appendTextNode('ad_personalization', this.options.ad_personalization_title);
        appendTextNode('analytics_storage', this.options.analytics_storage_title);

        document.getElementById('consent_title').innerText = this.options.title;
        document.getElementById('savePreferences').innerText = this.options.buton_title;

        document.getElementById('consent_text').innerHTML = this.options.consent_text + ' ' + this.options.consent_link;

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
        const saveButton = document.getElementById('savePreferences');
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                this.savePreferences();
            });
        }
    }

    savePreferences() {
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

