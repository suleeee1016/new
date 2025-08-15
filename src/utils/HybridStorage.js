// 🏗️ Hibrit Storage Strategy

class HybridStorage {
  constructor() {
    this.apiAvailable = true;
    this.storageType = process.env.REACT_APP_STORAGE_TYPE || 'hybrid';
    this.syncInterval = null;
  }

  // Strategy Pattern - Storage tipine göre karar ver
  async setItem(key, value, options = {}) {
    const strategy = this.getStorageStrategy(key, options);
    
    switch (strategy) {
      case 'api-first':
        return await this.setApiFirst(key, value, options);
      case 'local-first':
        return await this.setLocalFirst(key, value, options);
      case 'api-only':
        return await this.setApiOnly(key, value, options);
      case 'local-only':
        return this.setLocalOnly(key, value, options);
      default:
        return await this.setHybrid(key, value, options);
    }
  }

  // Strategy belirleme
  getStorageStrategy(key, options) {
    // Kritik veriler için API-first
    if (key.includes('auth') || key.includes('session')) {
      return 'api-first';
    }

    // UI state için local-first
    if (key.includes('ui') || key.includes('temp')) {
      return 'local-first';
    }

    // Sensitive data için API-only
    if (options.sensitive || key.includes('password')) {
      return 'api-only';
    }

    // Cache data için local-only
    if (options.cache || key.includes('cache')) {
      return 'local-only';
    }

    // Default: hybrid
    return 'hybrid';
  }

  // API-First stratejisi
  async setApiFirst(key, value, options) {
    try {
      // Önce API'ye kaydet
      await this.saveToAPI(key, value, options);
      
      // Başarılı ise localStorage'a da cache olarak kaydet
      this.saveToLocal(key, value, { ...options, cache: true });
      
      return { success: true, method: 'api-first' };
    } catch (error) {
      // API başarısız ise localStorage'a fallback
      console.warn('⚠️ API failed, falling back to localStorage');
      this.saveToLocal(key, value, { ...options, needsSync: true });
      return { success: true, method: 'local-fallback' };
    }
  }

  // Local-First stratejisi
  async setLocalFirst(key, value, options) {
    // Önce localStorage'a kaydet (hız için)
    this.saveToLocal(key, value, options);
    
    // Background'da API'ye sync et
    this.queueForSync(key, value, options);
    
    return { success: true, method: 'local-first' };
  }

  // Hibrit strateji
  async setHybrid(key, value, options) {
    const promises = [
      this.saveToAPI(key, value, options).catch(err => ({ error: err })),
      this.saveToLocal(key, value, options)
    ];

    const [apiResult, localResult] = await Promise.allSettled(promises);
    
    return {
      success: true,
      method: 'hybrid',
      api: apiResult.status === 'fulfilled',
      local: localResult.status === 'fulfilled'
    };
  }

  // API'ye kaydet
  async saveToAPI(key, value, options) {
    if (!this.apiAvailable) {
      throw new Error('API not available');
    }

    const endpoint = this.getAPIEndpoint(key);
    const payload = {
      key,
      value: options.sensitive ? this.encrypt(value) : value,
      timestamp: Date.now(),
      deviceId: this.getDeviceId(),
      ...options
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }

  // localStorage'a kaydet
  saveToLocal(key, value, options = {}) {
    try {
      const data = {
        value,
        timestamp: Date.now(),
        options,
        deviceId: this.getDeviceId()
      };

      if (options.secure || options.sensitive) {
        SecureStorage.setSecureItem(key, data);
      } else {
        localStorage.setItem(key, JSON.stringify(data));
      }

      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('🚨 localStorage quota exceeded');
        StorageMonitor.emergencyCleanup();
        // Tekrar dene
        try {
          localStorage.setItem(key, JSON.stringify(data));
          return true;
        } catch (retryError) {
          console.error('❌ localStorage save failed after cleanup:', retryError);
          return false;
        }
      }
      throw error;
    }
  }

  // Sync kuyruğu
  queueForSync(key, value, options) {
    const syncQueue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
    syncQueue.push({
      key,
      value,
      options,
      timestamp: Date.now(),
      attempts: 0
    });
    localStorage.setItem('syncQueue', JSON.stringify(syncQueue));
    
    // Background sync başlat
    this.processSyncQueue();
  }

  // Background sync işlemi
  async processSyncQueue() {
    const syncQueue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
    
    if (syncQueue.length === 0) return;

    for (let i = syncQueue.length - 1; i >= 0; i--) {
      const item = syncQueue[i];
      
      try {
        await this.saveToAPI(item.key, item.value, item.options);
        syncQueue.splice(i, 1); // Başarılı ise kuyruğundan çıkar
        console.log(`✅ Synced: ${item.key}`);
      } catch (error) {
        item.attempts++;
        if (item.attempts >= 3) {
          console.error(`❌ Sync failed permanently: ${item.key}`);
          syncQueue.splice(i, 1); // 3 denemeden sonra vazgeç
        }
      }
    }

    localStorage.setItem('syncQueue', JSON.stringify(syncQueue));
  }

  // Auto-sync başlat
  startAutoSync(intervalSeconds = 30) {
    this.syncInterval = setInterval(() => {
      this.processSyncQueue();
    }, intervalSeconds * 1000);
  }

  // Device ID oluştur
  getDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  // API endpoint belirleme
  getAPIEndpoint(key) {
    const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    
    if (key.includes('user') || key.includes('auth')) {
      return `${baseURL}/users`;
    }
    if (key.includes('pattern')) {
      return `${baseURL}/patterns`;
    }
    if (key.includes('session')) {
      return `${baseURL}/sessions`;
    }
    
    return `${baseURL}/storage`;
  }

  // Basit şifreleme
  encrypt(data) {
    return btoa(JSON.stringify(data));
  }

  decrypt(encryptedData) {
    return JSON.parse(atob(encryptedData));
  }
}

export default HybridStorage;
