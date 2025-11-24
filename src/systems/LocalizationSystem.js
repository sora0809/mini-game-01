class LocalizationSystem {
  constructor() {
    this.strings = {};
    this.lang = 'ja';
    this.defaultLang = 'ja';
  }

  init(data = {}, defaultLanguage = 'ja') {
    this.strings = data || {};
    if (this.strings[defaultLanguage]) {
      this.defaultLang = defaultLanguage;
    } else {
      this.defaultLang = Object.keys(this.strings)[0] || 'ja';
    }
    this.setLanguage(defaultLanguage);
  }

  setLanguage(langCode) {
    if (langCode && this.strings[langCode]) {
      this.lang = langCode;
    } else {
      this.lang = this.defaultLang;
    }
  }

  getLanguage() {
    return this.lang;
  }

  t(key) {
    if (!key) return '';
    const table = this.strings[this.lang] || {};
    if (Object.prototype.hasOwnProperty.call(table, key)) {
      return table[key];
    }
    const fallback = this.strings[this.defaultLang] || {};
    return fallback[key] ?? key;
  }
}

export default new LocalizationSystem();
