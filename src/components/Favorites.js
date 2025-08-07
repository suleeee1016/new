import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Favorites.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const Favorites = () => {
  const { user, updateUserFavorites } = useAuth();
  const [favoritesWithImages, setFavoritesWithImages] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const favorites = user?.favorites || [];

  // API'den patterns'ı al
  useEffect(() => {
    const loadPatterns = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/patterns`);
        if (response.ok) {
          const patternsData = await response.json();
          setPatterns(patternsData);
        } else {
          // Fallback to localStorage
          const localPatterns = JSON.parse(localStorage.getItem('patterns') || '[]');
          setPatterns(localPatterns);
        }
      } catch (error) {
        console.error('❌ Failed to load patterns:', error);
        // Fallback to localStorage
        const localPatterns = JSON.parse(localStorage.getItem('patterns') || '[]');
        setPatterns(localPatterns);
      } finally {
        setIsLoading(false);
      }
    };

    loadPatterns();
  }, []);

  // Favorites'ı patterns ile birleştir
  useEffect(() => {
    if (patterns.length > 0 && favorites.length > 0) {
      const enrichedFavorites = favorites.map(fav => {
        // Yeni format: patternId var
        if (fav.patternId) {
          const pattern = patterns.find(p => p.id === fav.patternId);
          return {
            ...fav,
            imageUrl: pattern?.imageUrl || '/placeholder-pattern.png',
            actualPattern: pattern
          };
        }
        // Eski format: imageUrl var
        else if (fav.imageUrl) {
          return fav;
        }
        // Fallback
        else {
          return {
            ...fav,
            imageUrl: '/placeholder-pattern.png'
          };
        }
      });
      
      setFavoritesWithImages(enrichedFavorites);
    } else {
      setFavoritesWithImages(favorites);
    }
  }, [favorites, patterns]);

  const removeFavorite = (patternId) => {
    const updatedFavorites = favorites.filter(fav => fav.id !== patternId);
    updateUserFavorites(updatedFavorites);
  };

  if (isLoading) {
    return (
      <div className="favorites-container">
        <div className="favorites-empty">
          <h2>❤️ Favorilerim</h2>
          <p>Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (favoritesWithImages.length === 0) {
    return (
      <div className="favorites-container">
        <div className="favorites-empty">
          <h2>❤️ Favorilerim</h2>
          <p>Henüz favori desen eklenmemiş</p>
          <p>Desenleri beğenip buraya ekleyebilirsiniz</p>
        </div>
      </div>
    );
  }

  return (
    <div className="favorites-container">
      <div className="favorites-header">
        <h2>❤️ Favorilerim ({favoritesWithImages.length})</h2>
      </div>
      
      <div className="favorites-grid">
        {favoritesWithImages.map(pattern => (
          <div key={pattern.id} className="favorite-card">
            <div className="favorite-image">
              <img 
                src={pattern.imageUrl} 
                alt={pattern.name}
                onError={(e) => {
                  e.target.src = '/placeholder-pattern.png';
                }}
                loading="lazy"
              />
            </div>
            <div className="favorite-info">
              <h3>{pattern.name}</h3>
              <p className="favorite-category">
                {pattern.category}
                {pattern.isAdminPattern && (
                  <span className="admin-badge"> • Admin Deseni</span>
                )}
              </p>
              <p className="favorite-date">
                Eklenme: {new Date(pattern.addedAt || pattern.createdAt).toLocaleDateString('tr-TR')}
              </p>
              {pattern.fileName && (
                <p className="favorite-filename">
                  📁 {pattern.fileName}
                </p>
              )}
            </div>
            <div className="favorite-actions">
              <button 
                onClick={() => removeFavorite(pattern.id)}
                className="remove-favorite-btn"
                title="Favorilerden kaldır"
              >
                💔 Kaldır
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Favorites;
