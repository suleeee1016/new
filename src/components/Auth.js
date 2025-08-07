import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const { login, register } = useAuth();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (isLogin) {
      const result = login(formData.email, formData.password);
      if (!result.success) {
        setError(result.message);
      }
    } else {
      if (!formData.name || !formData.email || !formData.password) {
        setError('Tüm alanları doldurun');
        return;
      }
      
      if (formData.password.length < 6) {
        setError('Şifre en az 6 karakter olmalı');
        return;
      }

      const result = register(formData.name, formData.email, formData.password);
      if (!result.success) {
        setError(result.message);
      }
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({ name: '', email: '', password: '' });
    setError('');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{isLogin ? 'Giriş Yap' : 'Kayıt Ol'}</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="name">Ad Soyad</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Ad Soyad"
                required={!isLogin}
              />
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="email@example.com"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Şifre</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Şifre"
              required
            />
          </div>
          
          <button type="submit" className="auth-button">
            {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
          </button>
        </form>
        
        <div className="auth-switch">
          <p>
            {isLogin ? 'Hesabınız yok mu?' : 'Zaten hesabınız var mı?'}
            <button onClick={toggleMode} className="switch-button">
              {isLogin ? 'Kayıt Ol' : 'Giriş Yap'}
            </button>
          </p>
        </div>
        
        <div className="demo-info">
          <p><strong>Demo Hesaplar:</strong></p>
          <p>Admin: admin@admin.com / admin123</p>
          <p>Veya yeni hesap oluşturun</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
