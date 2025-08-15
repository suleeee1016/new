// 🔄 Cross-Device Synchronization Service

class CrossDeviceSync {
  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
    this.syncQueue = [];
    this.isOnline = navigator.onLine;
    this.lastSyncTime = this.getLastSyncTime();
    this.syncInterval = null;
    this.websocket = null;
    this.apiBaseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    
    // Event listeners
    this.setupNetworkListeners();
    this.setupWindowListeners();
    
    console.log('🔄 CrossDeviceSync initialized for device:', this.deviceId);
  }

  // Device ID yönetimi
  getOrCreateDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${this.generateRandomId()}`;
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  generateRandomId() {
    return Math.random().toString(36).substr(2, 9);
  }

  // Son sync zamanı
  getLastSyncTime() {
    return parseInt(localStorage.getItem('lastSyncTime') || '0');
  }

  setLastSyncTime(timestamp = Date.now()) {
    localStorage.setItem('lastSyncTime', timestamp.toString());
    this.lastSyncTime = timestamp;
  }

  // Network durumu izleme
  setupNetworkListeners() {
    window.addEventListener('online', () => {
      console.log('📶 Device back online - starting sync');
      this.isOnline = true;
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      console.log('📵 Device offline - queuing changes');
      this.isOnline = false;
    });
  }

  // Window/tab değişiklikleri izleme
  setupWindowListeners() {
    // Sayfa focus olduğunda sync kontrol et
    window.addEventListener('focus', () => {
      this.checkForUpdates();
    });

    // Sayfa kapatılırken son sync
    window.addEventListener('beforeunload', () => {
      this.emergencySync();
    });

    // Storage değişiklikleri izle (aynı browser'da farklı tab'lar için)
    window.addEventListener('storage', (e) => {
      if (e.key === 'crossDeviceUpdate') {
        this.handleCrossTabUpdate(e.newValue);
      }
    });
  }

  // Ana sync fonksiyonu
  async syncData(dataType, data, operation = 'update') {
    const syncItem = {
      id: `sync_${Date.now()}_${this.generateRandomId()}`,
      deviceId: this.deviceId,
      dataType,
      data,
      operation, // 'create', 'update', 'delete'
      timestamp: Date.now(),
      synced: false,
      attempts: 0
    };

    // Önce local'e kaydet
    this.addToLocalSync(syncItem);

    // Online ise hemen sync et
    if (this.isOnline) {
      await this.uploadToServer(syncItem);
    } else {
      console.log('📵 Offline - item queued for sync:', syncItem.id);
    }

    return syncItem.id;
  }

  // Local sync kuyruğuna ekle
  addToLocalSync(syncItem) {
    this.syncQueue.push(syncItem);
    
    // localStorage'da da sakla
    const storedQueue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
    storedQueue.push(syncItem);
    localStorage.setItem('syncQueue', JSON.stringify(storedQueue));

    // Diğer tab'lara bildir
    this.notifyOtherTabs('queueUpdated', syncItem);
  }

  // Server'a upload
  async uploadToServer(syncItem) {
    try {
      const response = await fetch(`${this.apiBaseURL}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-ID': this.deviceId
        },
        body: JSON.stringify(syncItem)
      });

      if (response.ok) {
        syncItem.synced = true;
        syncItem.syncedAt = Date.now();
        console.log('✅ Synced to server:', syncItem.id);
        
        // Başarılı sync'i kaydet
        this.updateSyncStatus(syncItem.id, true);
        return true;
      } else {
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Sync failed:', error);
      syncItem.attempts++;
      
      if (syncItem.attempts >= 3) {
        console.error('❌ Sync failed permanently:', syncItem.id);
        this.updateSyncStatus(syncItem.id, false, 'max_attempts_reached');
      }
      
      return false;
    }
  }

  // Server'dan değişiklikleri çek
  async pullFromServer() {
    try {
      const response = await fetch(
        `${this.apiBaseURL}/sync/changes?since=${this.lastSyncTime}&deviceId=${this.deviceId}`,
        {
          headers: {
            'X-Device-ID': this.deviceId
          }
        }
      );

      if (response.ok) {
        const changes = await response.json();
        console.log(`📥 Pulled ${changes.length} changes from server`);
        
        await this.applyServerChanges(changes);
        this.setLastSyncTime();
        
        return changes;
      } else {
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Pull from server failed:', error);
      return [];
    }
  }

  // Server değişikliklerini uygula
  async applyServerChanges(changes) {
    for (const change of changes) {
      // Kendi device'ımızdan gelen değişiklikleri atla
      if (change.deviceId === this.deviceId) {
        continue;
      }

      try {
        await this.applyChange(change);
        console.log(`✅ Applied change: ${change.dataType} - ${change.operation}`);
      } catch (error) {
        console.error('❌ Failed to apply change:', change, error);
      }
    }

    // UI'ya bildir
    this.notifyUI('dataUpdated', { changes });
  }

  // Tek bir değişikliği uygula
  async applyChange(change) {
    switch (change.dataType) {
      case 'patterns':
        return await this.applyPatternChange(change);
      case 'favorites':
        return await this.applyFavoriteChange(change);
      case 'users':
        return await this.applyUserChange(change);
      default:
        console.warn('Unknown data type:', change.dataType);
    }
  }

  // Pattern değişikliklerini uygula
  async applyPatternChange(change) {
    const patterns = JSON.parse(localStorage.getItem('patterns') || '[]');
    
    switch (change.operation) {
      case 'create':
        // Duplicate kontrolü
        if (!patterns.find(p => p.id === change.data.id)) {
          patterns.push(change.data);
        }
        break;
        
      case 'update':
        const updateIndex = patterns.findIndex(p => p.id === change.data.id);
        if (updateIndex !== -1) {
          patterns[updateIndex] = { ...patterns[updateIndex], ...change.data };
        }
        break;
        
      case 'delete':
        const deleteIndex = patterns.findIndex(p => p.id === change.data.id);
        if (deleteIndex !== -1) {
          patterns.splice(deleteIndex, 1);
        }
        break;
    }

    localStorage.setItem('patterns', JSON.stringify(patterns));
    
    // Admin panel'e bildir
    if (window.reloadAdminPatterns) {
      window.reloadAdminPatterns();
    }
  }

  // Favorite değişikliklerini uygula
  async applyFavoriteChange(change) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    if (currentUser.id === change.userId) {
      currentUser.favorites = change.data.favorites;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      
      // UI'ya bildir
      this.notifyUI('favoritesUpdated', currentUser.favorites);
    }
  }

  // User değişikliklerini uygula
  async applyUserChange(change) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    switch (change.operation) {
      case 'create':
        if (!users.find(u => u.id === change.data.id)) {
          users.push(change.data);
        }
        break;
        
      case 'update':
        const updateIndex = users.findIndex(u => u.id === change.data.id);
        if (updateIndex !== -1) {
          users[updateIndex] = { ...users[updateIndex], ...change.data };
        }
        break;
    }

    localStorage.setItem('users', JSON.stringify(users));
  }

  // Sync kuyruğunu işle
  async processSyncQueue() {
    if (!this.isOnline) {
      console.log('📵 Offline - skipping sync queue processing');
      return;
    }

    const storedQueue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
    const pendingItems = storedQueue.filter(item => !item.synced);

    console.log(`🔄 Processing ${pendingItems.length} pending sync items`);

    for (const item of pendingItems) {
      const success = await this.uploadToServer(item);
      if (success) {
        this.removeSyncItem(item.id);
      }
    }

    // Server'dan değişiklikleri çek
    await this.pullFromServer();
  }

  // Sync item'ı sil
  removeSyncItem(syncId) {
    this.syncQueue = this.syncQueue.filter(item => item.id !== syncId);
    
    const storedQueue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
    const updatedQueue = storedQueue.filter(item => item.id !== syncId);
    localStorage.setItem('syncQueue', JSON.stringify(updatedQueue));
  }

  // Sync durumunu güncelle
  updateSyncStatus(syncId, success, error = null) {
    const storedQueue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
    const item = storedQueue.find(item => item.id === syncId);
    
    if (item) {
      item.synced = success;
      item.error = error;
      item.lastAttempt = Date.now();
      localStorage.setItem('syncQueue', JSON.stringify(storedQueue));
    }
  }

  // Diğer tab'lara bildirim
  notifyOtherTabs(action, data) {
    const notification = {
      action,
      data,
      timestamp: Date.now(),
      deviceId: this.deviceId
    };
    
    localStorage.setItem('crossDeviceUpdate', JSON.stringify(notification));
    
    // Hemen sil (sadece event trigger için)
    setTimeout(() => {
      localStorage.removeItem('crossDeviceUpdate');
    }, 100);
  }

  // Cross-tab update handler
  handleCrossTabUpdate(updateData) {
    if (!updateData) return;
    
    try {
      const update = JSON.parse(updateData);
      console.log('📨 Cross-tab update received:', update.action);
      
      // Kendi update'imizi ignore et
      if (update.deviceId === this.deviceId) return;
      
      this.notifyUI('crossTabUpdate', update);
    } catch (error) {
      console.error('❌ Failed to parse cross-tab update:', error);
    }
  }

  // UI'ya event gönder
  notifyUI(eventType, data) {
    const event = new CustomEvent('crossDeviceSync', {
      detail: { type: eventType, data }
    });
    window.dispatchEvent(event);
  }

  // Güncellemeleri kontrol et
  async checkForUpdates() {
    if (this.isOnline) {
      console.log('🔍 Checking for updates...');
      await this.pullFromServer();
    }
  }

  // Acil durum sync'i
  emergencySync() {
    if (this.isOnline && this.syncQueue.length > 0) {
      console.log('🚨 Emergency sync...');
      // Synchronous operation
      navigator.sendBeacon(
        `${this.apiBaseURL}/sync/emergency`,
        JSON.stringify({
          deviceId: this.deviceId,
          queue: this.syncQueue
        })
      );
    }
  }

  // Otomatik sync başlat
  startAutoSync(intervalSeconds = 30) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      this.processSyncQueue();
    }, intervalSeconds * 1000);

    console.log(`🔄 Auto-sync started (${intervalSeconds}s interval)`);
  }

  // Auto-sync durdur
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('⏹️ Auto-sync stopped');
    }
  }

  // Sync istatistikleri
  getSyncStats() {
    const storedQueue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
    
    return {
      deviceId: this.deviceId,
      isOnline: this.isOnline,
      lastSyncTime: this.lastSyncTime,
      queueLength: storedQueue.length,
      pendingItems: storedQueue.filter(item => !item.synced).length,
      failedItems: storedQueue.filter(item => item.attempts >= 3).length,
      syncInterval: this.syncInterval ? 'Active' : 'Stopped'
    };
  }

  // Manuel full sync
  async fullSync() {
    console.log('🔄 Starting full synchronization...');
    
    try {
      // Önce pending items'ları sync et
      await this.processSyncQueue();
      
      // Sonra server'dan güncellemeleri çek
      await this.pullFromServer();
      
      console.log('✅ Full synchronization completed');
      return true;
    } catch (error) {
      console.error('❌ Full synchronization failed:', error);
      return false;
    }
  }
}

// Global instance
window.CrossDeviceSync = CrossDeviceSync;

export default CrossDeviceSync;
