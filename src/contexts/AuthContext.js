import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// API Service
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    console.log(`🌐 API Request: ${config.method || 'GET'} ${url}`);
    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`✅ API Response:`, data);
    return data;
  } catch (error) {
    console.error('❌ API Request failed:', error);
    
    // Fallback to localStorage
    console.log('📱 Falling back to localStorage');
    return fallbackToLocalStorage(endpoint, options);
  }
};

const fallbackToLocalStorage = (endpoint, options) => {
  console.log(`📱 LocalStorage fallback for: ${endpoint}`);
  
  if (endpoint === '/users' && options.method === 'GET') {
    return JSON.parse(localStorage.getItem('users') || '[]');
  }
  
  if (endpoint === '/users' && options.method === 'POST') {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const newUser = JSON.parse(options.body);
    newUser.id = Date.now().toString();
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    return newUser;
  }
  
  if (endpoint.startsWith('/users/') && options.method === 'PATCH') {
    const userId = endpoint.split('/')[2];
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      const updateData = JSON.parse(options.body);
      users[userIndex] = { ...users[userIndex], ...updateData };
      localStorage.setItem('users', JSON.stringify(users));
      return users[userIndex];
    }
  }
  
  return null;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Uygulama başlarken kullanıcı bilgilerini kontrol et
    const initializeAuth = async () => {
      const token = localStorage.getItem('authToken');
      const savedUser = localStorage.getItem('currentUser');
      
      if (token && savedUser) {
        try {
          // Token doğrula (opsiyonel)
          setUser(JSON.parse(savedUser));
          console.log('👤 User restored from localStorage');
        } catch (error) {
          console.error('❌ Failed to restore user:', error);
          localStorage.removeItem('authToken');
          localStorage.removeItem('currentUser');
        }
      }
      setIsLoading(false);
    };
    
    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      setIsLoading(true);
      
      // Admin kontrolü
      if (email === 'admin@admin.com' && password === 'admin123') {
        const adminUser = {
          id: 'admin',
          email: 'admin@admin.com',
          name: 'Administrator',
          role: 'admin'
        };
        setUser(adminUser);
        localStorage.setItem('currentUser', JSON.stringify(adminUser));
        localStorage.setItem('authToken', 'admin-token');
        console.log('🔑 Admin login successful');
        return { success: true, user: adminUser };
      }

      // Normal kullanıcı API kontrolü
      const users = await apiRequest('/users');
      const foundUser = users.find(u => u.email === email && u.password === password);
      
      if (foundUser) {
        const userWithoutPassword = { ...foundUser };
        delete userWithoutPassword.password;
        
        setUser(userWithoutPassword);
        localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
        localStorage.setItem('authToken', `user-${foundUser.id}`);
        console.log('🔑 User login successful');
        return { success: true, user: userWithoutPassword };
      }

      return { success: false, message: 'Geçersiz email veya şifre' };
      
    } catch (error) {
      console.error('❌ Login error:', error);
      return { success: false, message: 'Giriş yapılırken hata oluştu' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name, email, password) => {
    try {
      setIsLoading(true);
      
      // Mevcut kullanıcıları kontrol et
      const users = await apiRequest('/users');
      const existingUser = users.find(u => u.email === email);
      
      if (existingUser) {
        return { success: false, message: 'Bu email zaten kayıtlı' };
      }

      // Yeni kullanıcı oluştur
      const newUser = {
        name,
        email,
        password,
        role: 'user',
        favorites: [],
        createdAt: new Date().toISOString()
      };

      const createdUser = await apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify(newUser)
      });

      // Kullanıcıyı giriş yap
      const userWithoutPassword = { ...createdUser };
      delete userWithoutPassword.password;
      
      setUser(userWithoutPassword);
      localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
      localStorage.setItem('authToken', `user-${createdUser.id}`);
      
      console.log('👤 User registered successfully');
      return { success: true, user: userWithoutPassword };
      
    } catch (error) {
      console.error('❌ Register error:', error);
      return { success: false, message: 'Kayıt olurken hata oluştu' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    console.log('👋 User logged out');
  };

  const updateUserFavorites = async (favorites) => {
    if (user) {
      try {
        console.log('💾 Updating user favorites via API...');
        
        // API ile güncelle
        const updatedUser = await apiRequest(`/users/${user.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ favorites })
        });
        
        if (updatedUser) {
          const userWithFavorites = { ...user, favorites };
          setUser(userWithFavorites);
          localStorage.setItem('currentUser', JSON.stringify(userWithFavorites));
          console.log('✅ Favorites updated successfully');
        }
        
      } catch (error) {
        console.error('❌ Failed to update favorites:', error);
        
        // Fallback: localStorage'a kaydet
        console.log('📱 Using localStorage fallback for favorites');
        const updatedUser = { ...user, favorites };
        setUser(updatedUser);
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        
        // users listesinde de güncelle (localStorage fallback)
        try {
          const users = JSON.parse(localStorage.getItem('users') || '[]');
          const userIndex = users.findIndex(u => u.id === user.id);
          if (userIndex !== -1) {
            users[userIndex].favorites = favorites;
            localStorage.setItem('users', JSON.stringify(users));
          }
        } catch (localError) {
          console.error('❌ LocalStorage fallback failed:', localError);
          alert('Favori kaydedilirken hata oluştu!');
        }
      }
    }
  };

  const value = {
    user,
    login,
    register,
    logout,
    updateUserFavorites,
    isAdmin: user?.role === 'admin',
    isAuthenticated: !!user,
    isLoading,
    // API utilities
    apiRequest
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
