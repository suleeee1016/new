import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './AdminPanel.css';

const AdminPanel = () => {
  console.log('🎯 AdminPanel component rendering...');
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  console.log('🌐 API_BASE_URL:', API_BASE_URL);
  const { apiRequest } = useAuth();
  const [patterns, setPatterns] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('patterns'); // 'patterns' or 'users'
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPattern, setEditingPattern] = useState(null);
  // isLoading removed as it's not used in this component
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(5); // Her sayfada 5 kullanıcı göster
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    imageFile: null,
    imageData: ''
  });

  useEffect(() => {
    loadPatterns();
    loadUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPatterns = async () => {
    try {
      console.log("🌐 Loading patterns from API...");
      
      const savedPatterns = await apiRequest('/patterns');
      setPatterns(savedPatterns);
      console.log("✅ Patterns loaded:", savedPatterns.length);
      
    } catch (error) {
      console.error("❌ Failed to load patterns:", error);
      // Fallback to localStorage
      const savedPatterns = JSON.parse(localStorage.getItem('patterns') || '[]');
      setPatterns(savedPatterns);
    }
  };

  const loadUsers = async () => {
    try {
      console.log("🌐 Loading users from API...");
      
      const usersData = await apiRequest('/users');
      setUsers(usersData);
      console.log("✅ Users loaded:", usersData.length);
      
    } catch (error) {
      console.error("❌ Failed to load users:", error);
      // Fallback to localStorage users
      const localUsers = JSON.parse(localStorage.getItem('users') || '[]');
      setUsers(localUsers);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // PNG formatı kontrolü
      if (!file.type === 'image/png') {
        alert('Lütfen sadece PNG formatında dosya seçin');
        e.target.value = '';
        return;
      }

      // Dosya boyutu kontrolü (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Dosya boyutu 5MB\'dan küçük olmalıdır');
        e.target.value = '';
        return;
      }

      // FileReader ile dosyayı base64'e çevir
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData({
          ...formData,
          imageFile: file,
          imageData: event.target.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.category) {
      alert('Lütfen tüm alanları doldurun');
      return;
    }

    // PNG dosya kontrolü
    if (!formData.imageFile) {
      alert('Lütfen bir PNG dosya seçin');
      return;
    }

    try {
      const newPattern = {
        id: editingPattern ? editingPattern.id : `pattern_${Date.now()}`,
        name: formData.name,
        category: formData.category,
        fileName: formData.imageFile.name,
        imageUrl: formData.imageData,
        isFileUpload: true,
        addedAt: editingPattern ? editingPattern.addedAt : new Date().toISOString(),
        uploadedBy: 'admin'
      };

      let result;
      if (editingPattern) {
        // Update existing pattern
        console.log("🌐 Updating pattern via API...");
        result = await apiRequest(`/patterns/${editingPattern.id}`, {
          method: 'PUT',
          body: JSON.stringify(newPattern)
        });
        
        // Update local state
        const updatedPatterns = patterns.map(p => p.id === editingPattern.id ? newPattern : p);
        setPatterns(updatedPatterns);
        
      } else {
        // Add new pattern
        console.log("🌐 Adding new pattern via API...");
        result = await apiRequest('/patterns', {
          method: 'POST',
          body: JSON.stringify(newPattern)
        });
        
        // Update local state
        setPatterns([...patterns, result]);
      }

      console.log("✅ Pattern saved successfully");
      
      // Trigger reload in ThreeJSExample
      if (window.reloadAdminPatterns) {
        window.reloadAdminPatterns();
      }
      
      resetForm();
      alert(`✅ Desen ${editingPattern ? 'güncellendi' : 'eklendi'}!`);
      
    } catch (error) {
      console.error("❌ Failed to save pattern:", error);
      
      // Fallback to localStorage
      console.log("📱 Using localStorage fallback");
      const newPattern = {
        id: editingPattern ? editingPattern.id : Date.now().toString(),
        name: formData.name,
        category: formData.category,
        fileName: formData.imageFile.name,
        imageUrl: formData.imageData,
        isFileUpload: true,
        addedAt: editingPattern ? editingPattern.addedAt : new Date().toISOString(),
        uploadedBy: 'admin'
      };

      let updatedPatterns;
      if (editingPattern) {
        updatedPatterns = patterns.map(p => p.id === editingPattern.id ? newPattern : p);
      } else {
        updatedPatterns = [...patterns, newPattern];
      }

      setPatterns(updatedPatterns);
      localStorage.setItem('patterns', JSON.stringify(updatedPatterns));
      
      resetForm();
      alert(`✅ Desen ${editingPattern ? 'güncellendi' : 'eklendi'} (localStorage)!`);
      
    }
  };

  const resetForm = () => {
    setFormData({ name: '', category: '', imageFile: null, imageData: '' });
    setShowAddForm(false);
    setEditingPattern(null);
    
    // File input'u temizle
    const fileInput = document.getElementById('imageFile');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleEdit = (pattern) => {
    setEditingPattern(pattern);
    setFormData({
      name: pattern.name,
      category: pattern.category,
      imageFile: null,
      imageData: pattern.imageUrl
    });
    setShowAddForm(true);
  };

  const handleDelete = async (patternId) => {
    if (!window.confirm('Bu deseni silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      console.log("🌐 Deleting pattern via API...");
      await apiRequest(`/patterns/${patternId}`, {
        method: 'DELETE'
      });

      // Update local state
      const updatedPatterns = patterns.filter(p => p.id !== patternId);
      setPatterns(updatedPatterns);
      
      console.log("✅ Pattern deleted successfully");
      
      // Trigger reload in ThreeJSExample
      if (window.reloadAdminPatterns) {
        window.reloadAdminPatterns();
      }
      
      alert("✅ Desen silindi!");
      
    } catch (error) {
      console.error("❌ Failed to delete pattern:", error);
      
      // Fallback to localStorage
      console.log("📱 Using localStorage fallback for deletion");
      const updatedPatterns = patterns.filter(p => p.id !== patternId);
      setPatterns(updatedPatterns);
      localStorage.setItem('patterns', JSON.stringify(updatedPatterns));
      alert("✅ Desen silindi (localStorage)!");
      
    }
  };

  const getUserFavoritePatterns = (userFavorites) => {
    if (!userFavorites || userFavorites.length === 0) return [];
    
    return userFavorites.map(favorite => {
      // Yeni format (patternId var)
      if (favorite.patternId) {
        const pattern = patterns.find(p => p.id === favorite.patternId);
        return pattern ? {
          ...pattern,
          favoriteDate: favorite.addedAt || favorite.createdAt
        } : {
          id: favorite.patternId,
          name: favorite.fileName || 'Bilinmeyen Desen',
          favoriteDate: favorite.addedAt || favorite.createdAt,
          notFound: true
        };
      }
      
      // Eski format (direkt pattern objesi)
      return {
        ...favorite,
        favoriteDate: favorite.addedAt || favorite.createdAt
      };
    });
  };

  // Pagination logic
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(users.length / usersPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Tab değiştiğinde sayfa sıfırla
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  return (
    <div className="admin-panel">
      <div className="admin-debug">
        <p>🔧 Debug: AdminPanel rendered successfully</p>
        <p>📊 Patterns count: {patterns.length}</p>
        <p>👥 Users count: {users.length}</p>
        <p>🌐 API URL: {API_BASE_URL}</p>
      </div>
      
      <div className="admin-header">
        <h2>👑 Admin Paneli</h2>
        <div className="admin-tabs">
          <button 
            onClick={() => handleTabChange('patterns')}
            className={`tab-btn ${activeTab === 'patterns' ? 'active' : ''}`}
          >
            🎨 Desenler ({patterns.length})
          </button>
          <button 
            onClick={() => handleTabChange('users')}
            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          >
            👥 Kullanıcılar ({users.length})
          </button>
        </div>
        {activeTab === 'patterns' && (
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="add-pattern-btn"
          >
            {showAddForm ? 'İptal' : '+ Yeni Desen Ekle'}
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="pattern-form-container">
          <h3>{editingPattern ? 'Desen Düzenle' : 'Yeni Desen Ekle'}</h3>
          <form onSubmit={handleSubmit} className="pattern-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Desen Adı *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Örn: Çiçekli Elbise"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="category">Kategori *</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Kategori Seç</option>
                  <option value="casual">Günlük</option>
                  <option value="formal">Resmi</option>
                  <option value="party">Parti</option>
                  <option value="summer">Yaz</option>
                  <option value="winter">Kış</option>
                </select>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="imageFile">PNG Dosya Seç *</label>
              <input
                type="file"
                id="imageFile"
                accept=".png,image/png"
                onChange={handleFileChange}
                required
              />
              <small style={{ color: '#666', fontSize: '12px', marginTop: '5px' }}>
                Sadece PNG formatında dosyalar kabul edilir (Maksimum 5MB)
              </small>
              {formData.imageData && (
                <div className="image-preview">
                  <img src={formData.imageData} alt="Önizleme" style={{ width: '100px', height: '100px', objectFit: 'cover', marginTop: '10px', borderRadius: '8px' }} />
                </div>
              )}
            </div>
            
            <div className="form-actions">
              <button type="submit" className="submit-btn">
                {editingPattern ? 'Güncelle' : 'Ekle'}
              </button>
              <button type="button" onClick={resetForm} className="cancel-btn">
                İptal
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'patterns' && (
        <div className="patterns-list">
          <h3>Mevcut Desenler ({patterns.length})</h3>
          
          {patterns.length === 0 ? (
            <div className="empty-state">
              <p>🎨 Henüz desen eklenmemiş</p>
              <p>API Bağlantısı: {API_BASE_URL || process.env.REACT_APP_API_URL || 'http://localhost:3001'}</p>
            </div>
          ) : (
            <div className="patterns-grid">
              {patterns.map(pattern => (
                <div key={pattern.id} className="pattern-card">
                  <div className="pattern-image">
                    <img src={pattern.imageUrl} alt={pattern.name} />
                  </div>
                  <div className="pattern-info">
                    <h4>{pattern.name}</h4>
                    <p className="pattern-category">{pattern.category}</p>
                    <p className="pattern-date">
                      {pattern.addedAt ? new Date(pattern.addedAt).toLocaleDateString('tr-TR') : 
                       pattern.createdAt ? new Date(pattern.createdAt).toLocaleDateString('tr-TR') : 
                       'Tarih belirtilmemiş'}
                    </p>
                  </div>
                  <div className="pattern-actions">
                    <button 
                      onClick={() => handleEdit(pattern)}
                      className="edit-btn"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDelete(pattern.id)}
                      className="delete-btn"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="users-list">
          <div className="users-header">
            <h3>Kullanıcılar ve Favorileri ({users.length})</h3>
            <div className="pagination-info">
              <span>
                Sayfa {currentPage} / {totalPages} 
                ({indexOfFirstUser + 1}-{Math.min(indexOfLastUser, users.length)} / {users.length})
              </span>
            </div>
          </div>
          
          {users.length === 0 ? (
            <div className="empty-state">
              <p>Henüz kullanıcı kaydı yok</p>
            </div>
          ) : (
            <>
              <div className="users-container">
                {currentUsers.map(user => {
                  const favoritePatterns = getUserFavoritePatterns(user.favorites || []);
                  return (
                    <div key={user.id} className="user-card">
                      <div className="user-header">
                        <div className="user-info">
                          <h4>👤 {user.name}</h4>
                          <p className="user-email">📧 {user.email}</p>
                          <p className="user-date">
                            📅 Kayıt: {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                          </p>
                          <p className="user-favorites-count">
                            ❤️ {favoritePatterns.length} favori desen
                          </p>
                        </div>
                        <div className="user-stats">
                          <div className="stat-badge">
                            <span className="stat-number">{favoritePatterns.length}</span>
                            <span className="stat-label">Favori</span>
                          </div>
                        </div>
                      </div>
                      
                      {favoritePatterns.length > 0 && (
                        <div className="user-favorites">
                          <h5>🎨 Beğendiği Desenler:</h5>
                          <div className="favorites-grid">
                            {favoritePatterns.map((pattern, index) => (
                              <div key={pattern.id || index} className="favorite-item">
                                {pattern.notFound ? (
                                  <div className="pattern-not-found">
                                    <div className="pattern-placeholder">❓</div>
                                    <div className="pattern-details">
                                      <p className="pattern-name">{pattern.name}</p>
                                      <p className="pattern-status">Desen bulunamadı</p>
                                      <p className="pattern-date">
                                        {new Date(pattern.favoriteDate).toLocaleDateString('tr-TR')}
                                      </p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="pattern-found">
                                    <div className="pattern-image-small">
                                      <img 
                                        src={pattern.imageUrl} 
                                        alt={pattern.name}
                                        onError={(e) => {
                                          e.target.src = '/placeholder-pattern.png';
                                        }}
                                      />
                                    </div>
                                    <div className="pattern-details">
                                      <p className="pattern-name">{pattern.name}</p>
                                      <p className="pattern-category">{pattern.category}</p>
                                      <p className="pattern-date">
                                        Beğenme: {new Date(pattern.favoriteDate).toLocaleDateString('tr-TR')}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="pagination-container">
                  <div className="pagination">
                    <button
                      onClick={handlePrevPage}
                      disabled={currentPage === 1}
                      className="pagination-btn prev-btn"
                    >
                      ← Önceki
                    </button>
                    
                    <div className="pagination-numbers">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
                        <button
                          key={number}
                          onClick={() => handlePageChange(number)}
                          className={`pagination-number ${currentPage === number ? 'active' : ''}`}
                        >
                          {number}
                        </button>
                      ))}
                    </div>
                    
                    <button
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                      className="pagination-btn next-btn"
                    >
                      Sonraki →
                    </button>
                  </div>
                  
                  <div className="pagination-summary">
                    <span>
                      Toplam {users.length} kullanıcı, sayfa başına {usersPerPage} gösteriliyor
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
