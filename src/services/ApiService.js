// API Service for production
class ApiService {
  constructor() {
    // Development için local server, production için gerçek API
    this.baseURL = process.env.NODE_ENV === 'production' 
      ? 'https://your-api-server.com/api' 
      : 'http://localhost:3001';
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      // Fallback to localStorage in case of API failure
      return this.fallbackToLocalStorage(endpoint, options);
    }
  }

  // Fallback mechanism
  fallbackToLocalStorage(endpoint, options) {
    console.log('📱 Falling back to localStorage');
    
    if (endpoint === '/patterns') {
      return JSON.parse(localStorage.getItem('patterns') || '[]');
    }
    
    if (endpoint === '/users') {
      return JSON.parse(localStorage.getItem('users') || '[]');
    }
    
    return [];
  }

  // Patterns
  async getPatterns() {
    return this.request('/patterns');
  }

  async addPattern(pattern) {
    return this.request('/patterns', {
      method: 'POST',
      body: JSON.stringify(pattern),
    });
  }

  async deletePattern(id) {
    return this.request(`/patterns/${id}`, {
      method: 'DELETE',
    });
  }

  // Users
  async getUsers() {
    return this.request('/users');
  }

  async createUser(user) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  }

  async updateUser(id, user) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });
  }

  async updateUserFavorites(userId, favorites) {
    return this.request(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ favorites }),
    });
  }

  // Authentication
  async login(email, password) {
    try {
      const response = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      
      if (response.token) {
        localStorage.setItem('authToken', response.token);
      }
      
      return response;
    } catch (error) {
      // Fallback to localStorage auth
      return this.fallbackAuth(email, password);
    }
  }

  fallbackAuth(email, password) {
    console.log('📱 Using localStorage auth fallback');
    
    // Admin check
    if (email === 'admin@admin.com' && password === 'admin123') {
      return {
        success: true,
        user: { id: 'admin', email, name: 'Admin', role: 'admin' },
      };
    }

    // Regular user check
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
      const { password: _, ...userWithoutPassword } = user;
      return { success: true, user: userWithoutPassword };
    }
    
    return { success: false, message: 'Invalid credentials' };
  }
}

export default new ApiService();
