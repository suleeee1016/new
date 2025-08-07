import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Header.css';

const Header = ({ onShowFavorites, showingFavorites }) => {
  const { user, logout, isAdmin } = useAuth();

  return (
    <header className="app-header">
      <div className="header-content">
        <h1>3D Elbise Koleksiyonu</h1>
        
        <div className="header-actions">
          <div className="user-info">
            <span className="user-name">
              {isAdmin ? '👑 ' : '👤 '}
              {user?.name}
            </span>
            <span className="user-role">
              ({isAdmin ? 'Admin' : 'Kullanıcı'})
            </span>
          </div>
          
          {!isAdmin && (
            <button 
              onClick={onShowFavorites}
              className={`favorites-btn ${showingFavorites ? 'active' : ''}`}
            >
              ❤️ {showingFavorites ? 'Ana Sayfa' : 'Favorilerim'}
            </button>
          )}
          
          <button onClick={logout} className="logout-btn">
            Çıkış Yap
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
