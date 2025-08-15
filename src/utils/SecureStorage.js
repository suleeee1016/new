// 🔒 Güvenli LocalStorage Yönetimi

class SecureStorage {
  // Şifreleme için basit XOR (production'da daha güçlü encryption kullanın)
  static encrypt(data, key = 'DRESS_APP_SECRET_2025') {
    const jsonString = JSON.stringify(data);
    let encrypted = '';
    for (let i = 0; i < jsonString.length; i++) {
      encrypted += String.fromCharCode(
        jsonString.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    return btoa(encrypted); // Base64 encode
  }

  static decrypt(encryptedData, key = 'DRESS_APP_SECRET_2025') {
    try {
      const encrypted = atob(encryptedData); // Base64 decode
      let decrypted = '';
      for (let i = 0; i < encrypted.length; i++) {
        decrypted += String.fromCharCode(
          encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
      }
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('❌ Decryption failed:', error);
      return null;
    }
  }

  // Güvenli set
  static setSecureItem(key, value) {
    const encrypted = this.encrypt(value);
    localStorage.setItem(`secure_${key}`, encrypted);
    
    // Expiration time ekle
    const expiration = Date.now() + (24 * 60 * 60 * 1000); // 24 saat
    localStorage.setItem(`${key}_expires`, expiration.toString());
  }

  // Güvenli get
  static getSecureItem(key) {
    const expiration = localStorage.getItem(`${key}_expires`);
    
    // Expiration kontrolü
    if (expiration && Date.now() > parseInt(expiration)) {
      this.removeSecureItem(key);
      return null;
    }

    const encryptedData = localStorage.getItem(`secure_${key}`);
    if (!encryptedData) return null;
    
    return this.decrypt(encryptedData);
  }

  // Güvenli remove
  static removeSecureItem(key) {
    localStorage.removeItem(`secure_${key}`);
    localStorage.removeItem(`${key}_expires`);
  }

  // Tüm secure items'ları temizle
  static clearSecureStorage() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('secure_') || key.endsWith('_expires')) {
        localStorage.removeItem(key);
      }
    });
  }

  // Storage size kontrolü
  static getStorageSize() {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return {
      used: total,
      usedMB: (total / 1024 / 1024).toFixed(2),
      available: 5242880 - total, // ~5MB limit
      availableMB: ((5242880 - total) / 1024 / 1024).toFixed(2)
    };
  }

  // Auto cleanup eski veriler
  static cleanupExpiredData() {
    const keys = Object.keys(localStorage);
    const now = Date.now();
    
    keys.forEach(key => {
      if (key.endsWith('_expires')) {
        const expiration = parseInt(localStorage.getItem(key));
        if (now > expiration) {
          const baseKey = key.replace('_expires', '');
          this.removeSecureItem(baseKey);
          console.log(`🧹 Expired data removed: ${baseKey}`);
        }
      }
    });
  }
}

// XSS Protection için
class XSSProtection {
  static sanitizeData(data) {
    if (typeof data === 'string') {
      return data
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized = {};
      for (const key in data) {
        sanitized[key] = this.sanitizeData(data[key]);
      }
      return sanitized;
    }
    
    return data;
  }
}

export { SecureStorage, XSSProtection };
