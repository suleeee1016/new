// Network ve cihaz bilgileri için utility fonksiyonlar

// Sunucu IP adresini otomatik tespit et
export const getServerIP = () => {
  // Geliştirme ortamında local IP'yi kullan
  if (process.env.NODE_ENV === 'development') {
    // Bu bilgi sunucuda çalıştırılan script ile alınabilir
    return process.env.REACT_APP_SERVER_IP || window.location.hostname;
  }
  
  // Production'da window.location'dan al
  return window.location.hostname;
};

// API Base URL'yi dinamik oluştur
export const getAPIBaseURL = () => {
  const serverIP = getServerIP();
  const apiPort = process.env.REACT_APP_API_PORT || '3001';
  
  // Eğer localhost ise ve production değilse, IP adresini kullan
  if (serverIP === 'localhost' && process.env.NODE_ENV === 'development') {
    // Local IP adresini tespit etmeye çalış
    return `http://${getLocalIP()}:${apiPort}`;
  }
  
  return `http://${serverIP}:${apiPort}`;
};

// Local IP adresini tespit et (yaklaşık)
export const getLocalIP = () => {
  // Bu browser ortamında tam olarak çalışmaz, server tarafında yapılmalı
  // Şimdilik default IP döndür
  return process.env.REACT_APP_LOCAL_IP || '192.168.1.111';
};

// Cihaz bilgilerini al
export const getDeviceInfo = () => {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screen: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timestamp: new Date().toISOString()
  };
};

// Session ID oluştur
export const generateSessionId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  const deviceHash = btoa(navigator.userAgent).substr(0, 8);
  return `session_${timestamp}_${deviceHash}_${random}`;
};

// Network durumunu kontrol et
export const checkNetworkConnection = async (apiUrl) => {
  try {
    const response = await fetch(`${apiUrl}/health`, {
      method: 'GET',
      timeout: 5000
    });
    return response.ok;
  } catch (error) {
    console.warn('Network connection check failed:', error);
    return false;
  }
};

// Çoklu cihaz erişimi için kullanıcı session'larını kontrol et
export const checkActiveSessionsForUser = async (userId, apiRequest) => {
  try {
    const sessions = await apiRequest('/sessions');
    const userSessions = sessions.filter(session => 
      session.userId === userId && 
      isSessionActive(session)
    );
    
    return {
      count: userSessions.length,
      sessions: userSessions,
      hasMultipleSessions: userSessions.length > 1
    };
  } catch (error) {
    console.error('Failed to check user sessions:', error);
    return { count: 0, sessions: [], hasMultipleSessions: false };
  }
};

// Session'ın aktif olup olmadığını kontrol et
export const isSessionActive = (session) => {
  const sessionTime = new Date(session.createdAt);
  const currentTime = new Date();
  const sessionTimeout = process.env.REACT_APP_SESSION_TIMEOUT || 3600000; // 1 saat
  
  return (currentTime - sessionTime) < sessionTimeout;
};

// Network ayarları
export const NETWORK_CONFIG = {
  defaultPort: 3001,
  defaultIP: '192.168.1.111',
  sessionTimeout: 3600000, // 1 saat
  maxSessionsPerUser: 5,
  enableCrossDeviceSync: true
};
