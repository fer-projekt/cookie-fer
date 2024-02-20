/* VERIFY CONSENT https://tagassistant.google.com */

class FerCookieBot {
    
    constructor(googleTagId, facebookPixelId,  options = {}) {
        this.googleTagId = googleTagId;
        this.facebookPixelId = facebookPixelId || null;
        this.dialogId = 'consentDialog';
        this.options = options;
        this.translations = this.defineTranslations();
        this.language = document.documentElement.lang || "en"; // Default to English
        this.translatedOptions = this.translations[this.language] || this.translations["en"]; // Fallback to English
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

    addFacebookPixel() {
        // console.log('Adding Facebook Pixel...');
        if (!this.facebookPixelId) return;
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window,document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', this.facebookPixelId); // Replace 'YOUR_PIXEL_ID' with your actual Facebook Pixel ID
        fbq('track', 'PageView');
        this.addFacebookPixelNoscript();
    }

    addFacebookPixelNoscript() {
        const noscript = document.createElement('noscript');
        const img = document.createElement('img');
        img.height = 1;
        img.width = 1;
        img.style.display = 'none';
        img.src = `https://www.facebook.com/tr?id=${this.facebookPixelId}&ev=PageView&noscript=1`;
        noscript.appendChild(img);
        // Append the noscript tag to the body or a specific element within your page.
        document.body.insertBefore(noscript, document.body.firstChild);
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
        // Create the dialog element
        const dialog = document.createElement('dialog');
        dialog.id = 'consentDialog';
        document.body.appendChild(dialog);
        // Set the title from translated options
        const titleDiv = document.createElement('div');
        titleDiv.id = 'consent_title';
        titleDiv.innerText = this.translatedOptions.title;
        dialog.appendChild(titleDiv);
        // Dynamically create and append checkbox items with labels from translated options
        const consentItems = [{
                id: 'necessary_cookies',
                text: this.translatedOptions.necessary_cookies_title,
                disabled: true,
                checked: true
            },
            {
                id: 'ad_storage',
                text: this.translatedOptions.ad_storage_title
            },
            {
                id: 'ad_user_data',
                text: this.translatedOptions.ad_user_data_title
            },
            {
                id: 'ad_personalization',
                text: this.translatedOptions.ad_personalization_title
            },
            {
                id: 'analytics_storage',
                text: this.translatedOptions.analytics_storage_title
            }
        ];
        consentItems.forEach(item => {
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
        // Set the consent text from translated options
        const consentTextDiv = document.createElement('div');
        consentTextDiv.id = 'consent_text';
        consentTextDiv.innerHTML = this.translatedOptions.consent_text + ' ' + this.translatedOptions.consent_link;
        dialog.appendChild(consentTextDiv);
        // Create and append the save preferences button
        const saveButton = document.createElement('button');
        saveButton.id = 'saveCookieBotPreferences';
        saveButton.className = 'consent-button';
        saveButton.innerText = this.translatedOptions.button_title;
        dialog.appendChild(saveButton);
    }

    loadConsentSettings() {
        const consentSettings = JSON.parse(localStorage.getItem('consentSettings'));

        /* START BUTTON */
        if (document.getElementById('changeCookieBotPreferences')) {
            document.getElementById('changeCookieBotPreferences').addEventListener('click', () => {
                this.openDialog();
            });
        }

        if (consentSettings) {
            document.getElementById('ad_storage').checked = consentSettings.adStorage;
            document.getElementById('ad_user_data').checked = consentSettings.adUserData;
            document.getElementById('ad_personalization').checked = consentSettings.adPersonalization;
            document.getElementById('analytics_storage').checked = consentSettings.analyticsStorage;
        }
        if (consentSettings.adStorage == true && consentSettings.adUserData == true) {
            this.addFacebookPixel();
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

    defineTranslations() {
        return {
            // Define your translations for each language here
            hr: {
                title: "Vaš naslov pristanka",
                necessary_cookies_title: "Nužni kolačići",
                ad_storage_title: "Oglašavački kolačići",
                ad_user_data_title: "Korištenje podataka o oglašavanju",
                ad_personalization_title: "Personalizacija oglasa",
                analytics_storage_title: "Kolačići analitike",
                button_title: "Spremi postavke",
                consent_text: "Ova web-stranica koristi kolačiće. Kolačiće upotrebljavamo kako bismo personalizirali sadržaj i oglase, omogućili značajke društvenih medija i analizirali promet.",
                consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>Opširnije</a>",
            },
            en: {
                title: "Your Consent Title",
                necessary_cookies_title: "Necessary Cookies",
                ad_storage_title: "Advertising Cookies",
                ad_user_data_title: "Use of Advertising Data",
                ad_personalization_title: "Ad Personalization",
                analytics_storage_title: "Analytics Cookies",
                button_title: "Save Settings",
                consent_text: "This website uses cookies. We use cookies to personalize content and ads, provide social media features, and analyze our traffic.",
                consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>Learn More</a>",
            },
            de: {
                title: "Ihre Zustimmung",
                necessary_cookies_title: "Notwendige Cookies",
                ad_storage_title: "Werbungs-Cookies",
                ad_user_data_title: "Nutzung von Werbedaten",
                ad_personalization_title: "Personalisierung der Werbung",
                analytics_storage_title: "Analyse-Cookies",
                button_title: "Einstellungen speichern",
                consent_text: "Diese Webseite verwendet Cookies. Wir verwenden Cookies, um Inhalte und Anzeigen zu personalisieren, Funktionen für soziale Medien anbieten zu können und den Verkehr zu analysieren.",
                consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>Mehr erfahren</a>",
            },
            it: {
                title: "Il tuo consenso",
                necessary_cookies_title: "Cookie necessari",
                ad_storage_title: "Cookie pubblicitari",
                ad_user_data_title: "Utilizzo dei dati pubblicitari",
                ad_personalization_title: "Personalizzazione degli annunci",
                analytics_storage_title: "Cookie analitici",
                button_title: "Salva impostazioni",
                consent_text: "Questo sito utilizza i cookie. Utilizziamo i cookie per personalizzare contenuti e annunci, fornire funzionalità dei social media e analizzare il nostro traffico.",
                consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>Scopri di più</a>",
            },
            ru: {
                title: "Ваше согласие",
                necessary_cookies_title: "Необходимые куки",
                ad_storage_title: "Куки для рекламы",
                ad_user_data_title: "Использование данных для рекламы",
                ad_personalization_title: "Персонализация рекламы",
                analytics_storage_title: "Аналитические куки",
                button_title: "Сохранить настройки",
                consent_text: "Этот сайт использует куки. Мы используем куки для персонализации контента и рекламы, предоставления социальных медиа функций и анализа нашего трафика.",
                consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>Узнать больше</a>",
            },
            pl: {
                title: "Twoja zgoda",
                necessary_cookies_title: "Niezbędne ciasteczka",
                ad_storage_title: "Ciasteczka reklamowe",
                ad_user_data_title: "Używanie danych reklamowych",
                ad_personalization_title: "Personalizacja reklam",
                analytics_storage_title: "Ciasteczka analityczne",
                button_title: "Zapisz ustawienia",
                consent_text: "Ta strona używa ciasteczek. Używamy ciasteczek do personalizacji treści i reklam, oferowania funkcji mediów społecznościowych i analizowania ruchu na stronie.",
                consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>Dowiedz się więcej</a>",
            },
            sl: {
                title: "Vaše soglasje",
                necessary_cookies_title: "Nujni piškotki",
                ad_storage_title: "Oglaševalski piškotki",
                ad_user_data_title: "Uporaba oglaševalskih podatkov",
                ad_personalization_title: "Personalizacija oglasov",
                analytics_storage_title: "Analitični piškotki",
                button_title: "Shrani nastavitve",
                consent_text: "Ta spletna stran uporablja piškotke. Piškotke uporabljamo za personalizacijo vsebine in oglasov, omogočanje funkcij družbenih omrežij in analizo prometa.",
                consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>Več informacij</a>",
            },
            cs: {
                title: "Váš souhlas",
                necessary_cookies_title: "Nezbytné cookies",
                ad_storage_title: "Reklamní cookies",
                ad_user_data_title: "Použití reklamních dat",
                ad_personalization_title: "Personalizace reklam",
                analytics_storage_title: "Analytické cookies",
                button_title: "Uložit nastavení",
                consent_text: "Tato webová stránka používá cookies. Používáme cookies k personalizaci obsahu a reklam, k poskytování funkcí sociálních médií a k analýze našeho provozu.",
                consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>Více informací</a>",
            },
            nl: {
                title: "Uw toestemming",
                necessary_cookies_title: "Noodzakelijke cookies",
                ad_storage_title: "Advertentiecookies",
                ad_user_data_title: "Gebruik van advertentiegegevens",
                ad_personalization_title: "Advertentiepersonalisatie",
                analytics_storage_title: "Analytische cookies",
                button_title: "Instellingen opslaan",
                consent_text: "Deze website gebruikt cookies. We gebruiken cookies om content en advertenties te personaliseren, om functies voor sociale media te bieden en om ons verkeer te analyseren.",
                consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>Meer leren</a>",
            },
            is: {
                title: "Þitt samþykki",
                necessary_cookies_title: "Nauðsynlegar kökur",
                ad_storage_title: "Auglýsingakökur",
                ad_user_data_title: "Notkun auglýsingagagna",
                ad_personalization_title: "Sérsniðnar auglýsingar",
                analytics_storage_title: "Greiningarkökur",
                button_title: "Vista stillingar",
                consent_text: "Þessi vefsíða notar kökur. Við notum kökur til að sérsníða efni og auglýsingar, bjóða upp á samfélagsmiðlaeiginleika og greina umferð okkar.",
                consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>Lærðu meira</a>",
            },
            fr: {
                title: "Votre consentement",
                necessary_cookies_title: "Cookies nécessaires",
                ad_storage_title: "Cookies publicitaires",
                ad_user_data_title: "Utilisation des données publicitaires",
                ad_personalization_title: "Personnalisation des annonces",
                analytics_storage_title: "Cookies analytiques",
                button_title: "Sauvegarder les paramètres",
                consent_text: "Ce site utilise des cookies. Nous utilisons des cookies pour personnaliser le contenu et les annonces, offrir des fonctionnalités de médias sociaux et analyser notre trafic.",
                consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>En savoir plus</a>",
            },
            // Add other languages...
        };
    }
}
export default FerCookieBot;