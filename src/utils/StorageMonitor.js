// 📊 LocalStorage Limit Monitoring

class StorageMonitor {
  static checkStorageLimits() {
    const stats = {
      localStorage: this.getLocalStorageStats(),
      sessionStorage: this.getSessionStorageStats(),
      indexedDB: 'Not implemented',
      recommendations: []
    };

    // Uyarılar ve öneriler
    if (stats.localStorage.usagePercent > 80) {
      stats.recommendations.push('🚨 LocalStorage %80 dolu - temizlik gerekli');
    }
    
    if (stats.localStorage.usagePercent > 95) {
      stats.recommendations.push('❌ LocalStorage kritik seviyede - acil temizlik!');
      this.emergencyCleanup();
    }

    return stats;
  }

  static getLocalStorageStats() {
    let total = 0;
    const items = {};
    
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const value = localStorage[key];
        const size = new Blob([value]).size;
        items[key] = {
          size: size,
          sizeMB: (size / 1024 / 1024).toFixed(3),
          preview: value.substring(0, 50) + '...'
        };
        total += size;
      }
    }

    const maxSize = 5 * 1024 * 1024; // 5MB typical limit
    
    return {
      totalSize: total,
      totalSizeMB: (total / 1024 / 1024).toFixed(2),
      maxSizeMB: (maxSize / 1024 / 1024).toFixed(2),
      usagePercent: ((total / maxSize) * 100).toFixed(1),
      itemCount: Object.keys(items).length,
      items: items,
      available: maxSize - total,
      availableMB: ((maxSize - total) / 1024 / 1024).toFixed(2)
    };
  }

  static getSessionStorageStats() {
    let total = 0;
    for (let key in sessionStorage) {
      if (sessionStorage.hasOwnProperty(key)) {
        total += sessionStorage[key].length + key.length;
      }
    }
    
    return {
      totalSize: total,
      totalSizeMB: (total / 1024 / 1024).toFixed(2),
      itemCount: Object.keys(sessionStorage).length
    };
  }

  // Acil durum temizliği
  static emergencyCleanup() {
    console.warn('🚨 Emergency localStorage cleanup initiated');
    
    // Eski pattern'ları temizle
    const patterns = JSON.parse(localStorage.getItem('patterns') || '[]');
    if (patterns.length > 50) {
      const recentPatterns = patterns.slice(-30); // Son 30'u tut
      localStorage.setItem('patterns', JSON.stringify(recentPatterns));
      console.log(`🧹 Cleaned ${patterns.length - 30} old patterns`);
    }

    // Eski session'ları temizle
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('session_') || key.includes('temp_')) {
        localStorage.removeItem(key);
      }
    });

    // Expired data cleanup
    if (window.SecureStorage) {
      window.SecureStorage.cleanupExpiredData();
    }
  }

  // Otomatik monitoring başlat
  static startMonitoring(intervalMinutes = 5) {
    return setInterval(() => {
      const stats = this.checkStorageLimits();
      
      if (stats.recommendations.length > 0) {
        console.warn('📊 Storage Warning:', stats.recommendations);
        
        // User'a uyarı göster
        if (stats.localStorage.usagePercent > 90) {
          alert(`⚠️ Depolama alanı %${stats.localStorage.usagePercent} dolu!\nUygulama yavaşlayabilir.`);
        }
      }
    }, intervalMinutes * 60 * 1000);
  }

  // Veri analizi
  static analyzeStorageUsage() {
    const stats = this.getLocalStorageStats();
    const analysis = {
      largestItems: [],
      oldestItems: [],
      duplicates: [],
      recommendations: []
    };

    // En büyük itemları bul
    analysis.largestItems = Object.entries(stats.items)
      .sort(([,a], [,b]) => b.size - a.size)
      .slice(0, 5)
      .map(([key, data]) => ({ key, ...data }));

    // Öneriler
    if (analysis.largestItems[0]?.size > 1024 * 1024) { // 1MB
      analysis.recommendations.push(
        `🔍 ${analysis.largestItems[0].key} çok büyük (${analysis.largestItems[0].sizeMB}MB)`
      );
    }

    // Pattern duplicates kontrolü
    const patterns = JSON.parse(localStorage.getItem('patterns') || '[]');
    const patternNames = patterns.map(p => p.name);
    const duplicateNames = patternNames.filter((name, index) => 
      patternNames.indexOf(name) !== index
    );
    
    if (duplicateNames.length > 0) {
      analysis.duplicates = [...new Set(duplicateNames)];
      analysis.recommendations.push(
        `🔄 ${duplicateNames.length} duplicate pattern bulundu`
      );
    }

    return analysis;
  }
}

// Console'da kullanım için global yap
window.StorageMonitor = StorageMonitor;

export default StorageMonitor;
