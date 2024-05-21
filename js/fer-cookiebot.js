class FerCookieBot {
  constructor(googleTagId, cssStyleSheet, facebookPixelId, options = {}) {
    this.googleTagId = googleTagId;
    this.cssStyleSheet = cssStyleSheet || null;
    this.facebookPixelId = facebookPixelId || null;
    this.dialogId = 'consentDialog';
    this.language = document.documentElement.lang || "en"; // Default to English
    this.translations = this.defineTranslations();
    const defaultTranslationsForLanguage = this.translations[this.language] || this.translations["en"];
    this.translatedOptions = {
      ...defaultTranslationsForLanguage,
      ...options
    };
    this.loadGTagScript();
    this.checkDialogState();
  }

  gtag() {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(arguments);
  }

  loadGTagScript() {
    const consentSettings = JSON.parse(localStorage.getItem('consentSettings')) || this.getDefaultConsentSettings();
    this.initializeConsentMode(consentSettings);
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.googleTagId}`;
    script.onload = () => {
      this.gtag('js', new Date());
      this.gtag('config', this.googleTagId);

    };
    document.head.appendChild(script);
  }
  getDefaultConsentSettings() {
    return {
      adStorage: false,
      adUserData: false,
      adPersonalization: false,
      analyticsStorage: false,
      functionalityStorage: false,
      personalizationStorage: false,
      securityStorage: false
    };
  }

  loadInitialConsent(consentSettings) {
    this.updateConsent(consentSettings);
  }

  addFacebookPixel() {
    if (!this.facebookPixelId || !/^\d{16}$/.test(this.facebookPixelId)) {
      return;
    }

    ! function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

    fbq('init', this.facebookPixelId);
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
    document.body.insertBefore(noscript, document.body.firstChild);
  }

  initializeConsentMode(consentSettings) {
    this.gtag('consent', 'default', {
      'ad_storage': 'denied',
      'ad_user_data':  'denied',
      'ad_personalization':   'denied',
      'analytics_storage':  'denied',
      'functionality_storage':  'denied',
      'personalization_storage':  'denied',
      'security_storage':  'denied'
    });
    this.updateConsent(consentSettings);
  }

  updateConsent({
    adStorage = false,
    adUserData = false,
    adPersonalization = false,
    analyticsStorage = false,
    functionalityStorage = false,
    personalizationStorage = false,
    securityStorage = false
  }) {
    const consentSettings = {
      adStorage,
      adUserData,
      adPersonalization,
      analyticsStorage,
      functionalityStorage,
      personalizationStorage,
      securityStorage
    };
    this.gtag('consent', 'update', {
      'ad_storage': adStorage ? 'granted' : 'denied',
      'ad_user_data': adUserData ? 'granted' : 'denied',
      'ad_personalization': adPersonalization ? 'granted' : 'denied',
      'analytics_storage': analyticsStorage ? 'granted' : 'denied',
      'functionality_storage': functionalityStorage ? 'granted' : 'denied',
      'personalization_storage': personalizationStorage ? 'granted' : 'denied',
      'security_storage': securityStorage ? 'granted' : 'denied'
    });
    localStorage.setItem('consentSettings', JSON.stringify(consentSettings));
    this.createConsentCookies(consentSettings);
    this.pushConsentToDataLayer(consentSettings);
  }

  createConsentCookies(consentSettings) {
    const cookieSettings = {
      'Consent_Necessary_Cookies': 'granted',
      'Consent_Advertising_Cookies': consentSettings.adStorage ? 'granted' : 'denied',
      'Consent_Use_of_Advertising_Data': consentSettings.adUserData ? 'granted' : 'denied',
      'Consent_Ad_Personalization': consentSettings.adPersonalization ? 'granted' : 'denied',
      'Consent_Analytics_Cookies': consentSettings.analyticsStorage ? 'granted' : 'denied',
      'Consent_Functionality_Cookies': consentSettings.functionalityStorage ? 'granted' : 'denied',
      'Consent_Personalization_Cookies': consentSettings.personalizationStorage ? 'granted' : 'denied',
      'Consent_Security_Cookies': consentSettings.securityStorage ? 'granted' : 'denied',
    };

    for (const [cookieName, cookieValue] of Object.entries(cookieSettings)) {
      document.cookie = `${cookieName}=${cookieValue};path=/;secure;SameSite=None`;
    }
  }

  loadCSS() {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.href = this.cssStyleSheet;
      link.type = 'text/css';
      link.rel = 'stylesheet';
      link.onload = () => resolve("CSS loaded successfully");
      link.onerror = () => reject(new Error("CSS failed to load"));
      document.head.appendChild(link);
    });
  }

  createConsentDialog() {
    return new Promise((resolve, reject) => {
      this.loadCSS().then(() => {
        const dialog = document.createElement('div');
        dialog.id = this.dialogId;
        dialog.style.display = 'none';
        document.body.appendChild(dialog);

        const titleDiv = document.createElement('div');
        titleDiv.id = 'consent_title';
        titleDiv.innerText = this.translatedOptions.title;
        dialog.appendChild(titleDiv);

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
          },
          {
            id: 'functionality_storage',
            text: this.translatedOptions.functionality_storage_title
          },
          {
            id: 'personalization_storage',
            text: this.translatedOptions.personalization_storage_title
          },
          {
            id: 'security_storage',
            text: this.translatedOptions.security_storage_title
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
          label.appendChild(input);
          label.appendChild(document.createTextNode(' ' + item.text));
          dialog.appendChild(label);
        });

        const consentTextDiv = document.createElement('div');
        consentTextDiv.id = 'consent_text';
        consentTextDiv.innerHTML = `${this.translatedOptions.consent_text} ${this.translatedOptions.consent_link}`;
        dialog.appendChild(consentTextDiv);

        const consentButtonsDiv = document.createElement('div');
        consentButtonsDiv.id = 'consent_buttons';
        dialog.appendChild(consentButtonsDiv);

        const createButton = (id, text) => {
          const button = document.createElement('button');
          button.id = id;
          button.className = 'consent-button';
          button.innerText = text;
          return button;
        };

        consentButtonsDiv.appendChild(createButton('saveAcceptAllCookieBotPreferences', this.translatedOptions.accept_all_button_title));
        consentButtonsDiv.appendChild(createButton('saveRefuseAllCookieBotPreferences', this.translatedOptions.refuse_all_button_title));
        consentButtonsDiv.appendChild(createButton('saveCookieBotPreferences', this.translatedOptions.button_title));

        resolve();
      }).catch(error => reject(error));
    });
  }

  loadConsentSettings() {
    const consentSettings = JSON.parse(localStorage.getItem('consentSettings'));
    if (consentSettings) {
      document.getElementById('ad_storage').checked = consentSettings.adStorage;
      document.getElementById('ad_user_data').checked = consentSettings.adUserData;
      document.getElementById('ad_personalization').checked = consentSettings.adPersonalization;
      document.getElementById('analytics_storage').checked = consentSettings.analyticsStorage;
      document.getElementById('functionality_storage').checked = consentSettings.functionalityStorage;
      document.getElementById('personalization_storage').checked = consentSettings.personalizationStorage;
      document.getElementById('security_storage').checked = consentSettings.securityStorage;
    }
    if (consentSettings && consentSettings.adStorage && consentSettings.adUserData) {
      this.addFacebookPixel();
    }
  }

  checkDialogState() {
    const dialogState = localStorage.getItem('dialogState');
    if (dialogState !== 'closed') {
      this.createConsentDialog().then(() => {
        this.openDialog();
        this.attachEventListeners();
      }).catch(error => console.error("Error creating dialog:", error));
    }

    const changeCBPrefButton = document.getElementById('changeCookieBotPreferences');
    if (changeCBPrefButton) {
      changeCBPrefButton.innerText = this.translatedOptions.change_cookiebot_preferences;
      let dialogCreated = false;
      changeCBPrefButton.style.cursor = 'pointer';
      changeCBPrefButton.addEventListener('click', () => {
        if (!dialogCreated) {
          this.createConsentDialog().then(() => {
            this.openDialog();
            this.loadConsentSettings();
            this.attachEventListeners();
            dialogCreated = true;
          }).catch(error => console.error("Error creating dialog:", error));
        } else {
          this.openDialog();
          this.loadConsentSettings();
        }
      });
    }
  }

  openDialog() {
    const dialog = document.getElementById(this.dialogId);
    if (dialog) {
      dialog.style.display = 'block';
    } else {
      console.error('Dialog element not found. Ensure createConsentDialog() is called before openDialog().');
    }
  }

  closeDialog() {
    const dialog = document.getElementById(this.dialogId);
    if (dialog) dialog.style.display = 'none';
  }

  attachEventListeners() {
    const addClickListener = (id, handler) => {
      const button = document.getElementById(id);
      if (button) button.addEventListener('click', handler);
    };

    addClickListener('saveCookieBotPreferences', () => {
      this.saveCookieBotPreferences();
      this.closeDialog();
    });
    addClickListener('saveAcceptAllCookieBotPreferences', () => {
      this.acceptAndSaveAll();
      this.closeDialog();
    });
    addClickListener('saveRefuseAllCookieBotPreferences', () => {
      this.refuseAndSaveAll();
      this.closeDialog();
    });
  }

  saveCookieBotPreferences() {
    const consentSettings = {
      adStorage: document.getElementById('ad_storage').checked,
      adUserData: document.getElementById('ad_user_data').checked,
      adPersonalization: document.getElementById('ad_personalization').checked,
      analyticsStorage: document.getElementById('analytics_storage').checked,
      functionalityStorage: document.getElementById('functionality_storage').checked,
      personalizationStorage: document.getElementById('personalization_storage').checked,
      securityStorage: document.getElementById('security_storage').checked
    };
    this.updateConsent(consentSettings);

    localStorage.setItem('dialogState', 'closed');
  }

  acceptAndSaveAll() {
    const consentSettings = {
      adStorage: true,
      adUserData: true,
      adPersonalization: true,
      analyticsStorage: true,
      functionalityStorage: true,
      personalizationStorage: true,
      securityStorage: true
    };
    this.updateConsent(consentSettings);

    localStorage.setItem('dialogState', 'closed');
  }

  refuseAndSaveAll() {
    const consentSettings = {
      adStorage: false,
      adUserData: false,
      adPersonalization: false,
      analyticsStorage: false,
      functionalityStorage: false,
      personalizationStorage: false,
      securityStorage: false
    };
    this.updateConsent(consentSettings);

    localStorage.setItem('dialogState', 'closed');
  }

  pushConsentToDataLayer(consentSettings) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'consentUpdate',
      consentSettings: {
        adStorage: consentSettings.adStorage ? "granted" : "denied",
        adUserData: consentSettings.adUserData ? "granted" : "denied",
        adPersonalization: consentSettings.adPersonalization ? "granted" : "denied",
        analyticsStorage: consentSettings.analyticsStorage ? "granted" : "denied",
        functionalityStorage: consentSettings.functionalityStorage ? "granted" : "denied",
        personalizationStorage: consentSettings.personalizationStorage ? "granted" : "denied",
        securityStorage: consentSettings.securityStorage ? "granted" : "denied",
        wait_for_update: 300,
      }
    });
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
        consent_text: "Ova web-stranica koristi kolačiće. Kolačiće upotrebljavamo kako bismo personalizirali sadržaj i oglase, omogućili značajke društvenih medija i analizirali promet.",
        consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>Opširnije</a>",
        change_cookiebot_preferences: "Promijeni postavke Cookiebota",
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
        consent_text: "This website uses cookies. We use cookies to personalize content and ads, to provide social media features, and to analyze our traffic.",
        consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>Learn More</a>",
        change_cookiebot_preferences: "Change Cookiebot Preferences",

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
        consent_text: "Diese Webseite verwendet Cookies. Wir verwenden Cookies, um Inhalte und Anzeigen zu personalisieren, Funktionen für soziale Medien anzubieten und unseren Verkehr zu analysieren.",
        consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>Mehr erfahren</a>",
        change_cookiebot_preferences: "Cookiebot-Einstellungen ändern",

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
        consent_text: "Questo sito utilizza i cookie. Utilizziamo i cookie per personalizzare contenuti e annunci, fornire funzioni dei social media e analizzare il nostro traffico.",
        consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>Scopri di più</a>",
        change_cookiebot_preferences: "Modifica le preferenze di Cookiebot",

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
        consent_text: "Этот сайт использует куки. Мы используем куки для персонализации контента и рекламы, предоставления функций социальных сетей и анализа трафика.",
        consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>Узнать больше</a>",
        change_cookiebot_preferences: "Изменить настройки Cookiebot",

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
        consent_text: "Ta strona używa ciasteczek. Używamy ciasteczek do personalizacji treści i reklam, oferowania funkcji mediów społecznościowych i analizowania naszego ruchu.",
        consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>Dowiedz się więcej</a>",
        change_cookiebot_preferences: "Zmień preferencje Cookiebota",

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
        consent_text: "Ta spletna stran uporablja piškotke. Uporabljamo piškotke za prilagajanje vsebine in oglasov, zagotavljanje funkcij socialnih medijev in analizo prometa.",
        consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>Več informacij</a>",
        change_cookiebot_preferences: "Spremeni nastavitve Cookiebota",

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
        consent_text: "Tento web používá cookies. Cookies používáme k personalizaci obsahu a reklam, k poskytování funkcí sociálních sítí a k analýze našeho provozu.",
        consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>Více informací</a>",
        change_cookiebot_preferences: "Změnit předvolby Cookiebotu",

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
        consent_text: "Deze website gebruikt cookies. We gebruiken cookies om content en advertenties te personaliseren, om sociale mediafuncties te bieden en om ons verkeer te analyseren.",
        consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>Meer weten</a>",
        change_cookiebot_preferences: "Cookiebot-voorkeuren wijzigen",

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
        consent_text: "Þessi vefsíða notar kökur. Við notum kökur til að sérsníða efni og auglýsingar, bjóða upp á samfélagsmiðlaeiginleika og greina umferð okkar.",
        consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>Læra meira</a>",
        change_cookiebot_preferences: "Breyta stillingum Cookiebot",

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
        consent_text: "Ce site utilise des cookies. Nous utilisons des cookies pour personnaliser le contenu et les annonces, offrir des fonctionnalités de médias sociaux et analyser notre trafic.",
        consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>En savoir plus</a>",
        change_cookiebot_preferences: "Modifier les préférences de Cookiebot",

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
        consent_text: "Ez a weboldal sütiket használ. Sütiket használunk a tartalom és hirdetések személyre szabásához, a közösségi média funkciók biztosításához és forgalmunk elemzéséhez.",
        consent_link: "<a href='https://policies.google.com/privacy' target='_blank'>Tudj meg többet</a>",
        change_cookiebot_preferences: "Cookiebot beállítások megváltoztatása",

      },
      // Add other languages...
    };
  }
}
export default FerCookieBot;