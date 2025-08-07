import React, { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useAuth } from "./contexts/AuthContext";
import "./styles.css";

// Model dosyaları - orijinal asset import sistemi
import table8 from "./assets/dress.glb";
import table5 from "./assets/model5.glb";
import table6 from "./assets/model6.glb";
import table7 from "./assets/model7.glb";
import table10 from "./assets/model10.glb";
import table13 from "./assets/model13.glb";
import table14 from "./assets/model122.glb";
import table15 from "./assets/model123.glb";

// Fallback texture (admin sistemine geçtiğimiz için sadece bir tane kalıyor)
import Image1 from "./assets/1.jpg";

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
    console.log(`✅ API Response received`);
    return data;
  } catch (error) {
    console.error('❌ API Request failed:', error);
    
    // Fallback to localStorage
    console.log('📱 Falling back to localStorage');
    return fallbackToLocalStorage(endpoint, options);
  }
};

const fallbackToLocalStorage = (endpoint, options) => {
  if (endpoint === '/patterns') {
    if (options.method === 'GET' || !options.method) {
      return JSON.parse(localStorage.getItem('patterns') || '[]');
    }
    if (options.method === 'POST') {
      const patterns = JSON.parse(localStorage.getItem('patterns') || '[]');
      const newPattern = JSON.parse(options.body);
      newPattern.id = `pattern_${Date.now()}`;
      patterns.push(newPattern);
      localStorage.setItem('patterns', JSON.stringify(patterns));
      return newPattern;
    }
    if (options.method === 'DELETE') {
      const patternId = endpoint.split('/')[2];
      const patterns = JSON.parse(localStorage.getItem('patterns') || '[]');
      const filteredPatterns = patterns.filter(p => p.id !== patternId);
      localStorage.setItem('patterns', JSON.stringify(filteredPatterns));
      return { success: true };
    }
  }
  return [];
};

let container, camera, scene, renderer, orbitControls, modelSelector, textureSelector, colorSelector;
const materials = {};  // Store materials for each mesh
let currentModel = null; // Mevcut modeli takip et
let setIsLoading, setModelInfo; // State setter fonksiyonları

const setupScene = () => {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf5f5f5); // Hafif gri arka plan
};

const setupCamera = () => {
  camera = new THREE.PerspectiveCamera(75, container.offsetWidth / container.offsetHeight, 0.1, 1000);
  camera.position.set(0, 0, 5);
  scene.add(camera);
};

const setupLights = () => {
  // Ana hemisfer ışığı
  const hemispheric = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
  scene.add(hemispheric);
  
  // Directional ışık - yukarıdan
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
  directionalLight.position.set(10, 10, 5);
  directionalLight.castShadow = true;
  scene.add(directionalLight);
  
  // Ambient ışık - genel aydınlatma
  const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
  scene.add(ambientLight);
};

const setupRenderer = () => {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setClearColor(0xffffff);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.offsetWidth, container.offsetHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  
  // Canvas elementini container'a ekle ve stil ayarla
  const canvas = renderer.domElement;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  
  container.appendChild(canvas);
};

const loadModel = (model) => {
  console.log("Model yükleniyor:", model);
  setIsLoading(true);
  
  // Önceki modeli temizle
  if (currentModel) {
    scene.remove(currentModel);
    currentModel = null;
  }
  
  // Konsol uyarılarını geçici olarak bastır
  const originalWarn = console.warn;
  console.warn = (...args) => {
    const message = args[0];
    if (message && typeof message === 'string' && 
        message.includes('Custom UV set') && 
        message.includes('not yet supported')) {
      return; // Bu uyarıyı bastır
    }
    originalWarn.apply(console, args);
  };
  
  const loader = new GLTFLoader();
  loader.load(
    model,
    (gltf) => {
      // Konsol uyarılarını normale döndür
      console.warn = originalWarn;
      
      console.log("Model yüklendi:", gltf);
      const object = gltf.scene;
      
      // Model boyutunu ayarla
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const maxSize = Math.max(size.x, size.y, size.z);
      const scale = 2 / maxSize;
      object.scale.setScalar(scale);
      
      // Merkeze yerleştir
      const center = box.getCenter(new THREE.Vector3());
      object.position.sub(center.multiplyScalar(scale));
      
      scene.add(object);
      currentModel = object;
      setupModel(object);
      
      setIsLoading(false);
      setModelInfo({
        name: getModelName(model),
        type: "GLB Model"
      });
    },
    (progress) => {
      // Progress loglarını kaldır - çok fazla console spam yapıyor
    },
    (error) => {
      // Konsol uyarılarını normale döndür (hata durumunda)
      console.warn = originalWarn;
      console.error("Model yükleme hatası:", error);
      setIsLoading(false);
    }
  );
};

const getModelName = (model) => {
  const modelNames = {
    [table5]: "Zarif Elbise",
    [table6]: "Klasik Elbise", 
    [table7]: "Modern Elbise",
    [table8]: "Şık Elbise",
    [table10]: "Vintage Elbise",
    [table13]: "Casual Elbise",
    [table14]: "Parti Elbisesi",
    [table15]: "Gece Elbisesi"
  };
  return modelNames[model] || "3D Model";
};

const setupModel = (object) => {
  // Clear previous materials
  for (let key in materials) {
    delete materials[key];
  }

  // Store materials for each mesh
  object.traverse((obj) => {
    if (obj.isMesh) {
      materials[obj.name] = obj.material;
      if (obj.material) {
        obj.material.side = THREE.DoubleSide;
        obj.material.needsUpdate = true;
      }
    }
  });

  // Apply current texture and color if available
  if (textureSelector && textureSelector.value) {
    const currentTexture = convertImageToTexture(textureSelector.value);
    const currentColor = colorSelector ? colorSelector.value : "#ffffff";
    for (let key in materials) {
      materials[key].map = currentTexture;
      materials[key].color.set(currentColor);
      materials[key].needsUpdate = true;
    }
  }
};

const setupOrbitControls = () => {
  orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.05;
  orbitControls.rotateSpeed = 1.0;
  orbitControls.autoRotate = true;
  orbitControls.autoRotateSpeed = 1.0;
};

const onWindowResize = () => {
  camera.aspect = container.offsetWidth / container.offsetHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.offsetWidth, container.offsetHeight);
};

const convertImageToTexture = (image) => {
  const textureLoader = new THREE.TextureLoader();
  let texture = textureLoader.load(image);
  texture.encoding = THREE.sRGBEncoding;
  texture.flipY = false;
  return texture;
};

const init = (model) => {
  if (!container || scene) {
    console.log("Init atlandı - container yok veya zaten başlatılmış");
    return;
  }
  
  setupScene();
  setupCamera();
  setupLights();
  setupRenderer();
  setupOrbitControls();
  loadModel(model);
};

// Desen boyut kontrol fonksiyonu
const adjustPatternScale = (scale) => {
  if (!currentModel) return;
  
  currentModel.traverse((obj) => {
    if (obj.isMesh && obj.material && obj.material.map) {
      // Texture repeat değerini ayarla (büyük scale = daha küçük desen)
      const repeatValue = 1 / scale;
      obj.material.map.repeat.set(repeatValue, repeatValue);
      obj.material.map.needsUpdate = true;
      obj.material.needsUpdate = true;
    }
  });
  
  // Render güncelle
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
};

const ThreeJSExample = () => {
  const { user, updateUserFavorites, isAdmin } = useAuth();
  const [adminPatterns, setAdminPatterns] = useState([]);
  const [isLoading, setIsLoadingState] = useState(true);
  const [modelInfo, setModelInfoState] = useState({ name: '', type: '' });
  const [patternScale, setPatternScale] = useState(1); // Desen boyutu state'i
  
  const [searchTerm, setSearchTerm] = useState("");
  const [patternsLoading, setPatternsLoading] = useState(false);
  
  // Global setter'ları bağla
  setIsLoading = setIsLoadingState;
  setModelInfo = setModelInfoState;
  
  // Desen filtreleme
  const filteredPatterns = adminPatterns.filter(pattern => {
    const matchesSearch = pattern.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Search term değiştiğinde scroll'u sıfırla
  const scrollContainerRef = useRef(null);
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [searchTerm]);  // Keyboard navigation için useEffect - Scroll sistemi için
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT') return; // Input alanlarında keyboard navigation'ı devre dışı bırak
      
      switch(e.key) {
        case 'Escape':
          setSearchTerm("");
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Admin desenlerini API'den yükle
  useEffect(() => {
    const loadAdminPatterns = async () => {
      setPatternsLoading(true);
      try {
        console.log("🌐 Loading admin patterns from API...");
        const patterns = await apiRequest('/patterns');
        console.log("📥 Admin patterns loaded:", patterns.length);
        setAdminPatterns(patterns);
      } catch (error) {
        console.error("❌ Failed to load patterns:", error);
        // Fallback to localStorage
        const patterns = JSON.parse(localStorage.getItem('patterns') || '[]');
        setAdminPatterns(patterns);
      } finally {
        setPatternsLoading(false);
      }
    };
    
    // İlk yükleme
    loadAdminPatterns();
    
    // Storage değişikliklerini dinle (localStorage fallback için)
    const handleStorageChange = (e) => {
      if (e.key === 'patterns') {
        console.log("🔄 Storage change detected, reloading patterns");
        loadAdminPatterns();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // API patterns için polling (5 saniyede bir kontrol et)
    const pollingInterval = setInterval(() => {
      loadAdminPatterns();
    }, 5000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollingInterval);
    };
  }, []);

  // React-based texture selection handler
  const selectTexture = useCallback((textureUrl, patternName) => {
    console.log(`🎨 Selecting texture: ${patternName}`, textureUrl);
    
    if (!textureUrl) {
      console.error("❌ No texture URL provided");
      return;
    }
    
    try {
      const texture = convertImageToTexture(textureUrl);
      
      // Apply texture to all materials with current scale
      let appliedCount = 0;
      for (let key in materials) {
        if (materials[key]) {
          materials[key].map = texture;
          
          // Mevcut scale değerini uygula
          const repeatValue = 1 / patternScale;
          texture.repeat.set(repeatValue, repeatValue);
          texture.needsUpdate = true;
          
          materials[key].needsUpdate = true;
          appliedCount++;
        }
      }
      
      console.log(`✅ Texture applied to ${appliedCount} materials with scale ${patternScale}`);
      sessionStorage.setItem("selectedTexture", textureUrl);
      
      // Force render update
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
        console.log("🔄 Render updated successfully");
      }
      
      // Update radio button selection
      const radioButton = document.querySelector(`input[name="texture"][value="${textureUrl}"]`);
      if (radioButton) {
        radioButton.checked = true;
        console.log("📻 Radio button updated");
      }
      
    } catch (error) {
      console.error("❌ Error applying texture:", error);
    }
  }, [patternScale]); // patternScale dependency'si eklendi

  // Legacy event handler for DOM events (fallback)
  const handleTextureChange = useCallback((event) => {
    const textureUrl = event.target.value;
    const pattern = adminPatterns.find(p => p.imageUrl === textureUrl);
    const patternName = pattern ? pattern.name : 'Unknown Pattern';
    
    console.log("🎨 Legacy texture change triggered:", patternName);
    selectTexture(textureUrl, patternName);
  }, [adminPatterns, selectTexture]);

  // Admin patterns değiştiğinde event listener'ları yeniden kur ve ilk pattern'i uygula
  useEffect(() => {
    if (adminPatterns.length > 0) {
      // İlk pattern'i otomatik uygula
      const firstPattern = adminPatterns[0];
      const savedTexture = sessionStorage.getItem("selectedTexture");
      
      // Eğer kayıtlı texture varsa onu kullan, yoksa ilk pattern'i kullan
      const textureToApply = savedTexture || firstPattern.imageUrl;
      const patternToApply = adminPatterns.find(p => p.imageUrl === textureToApply) || firstPattern;
      
      console.log("🎨 Auto-applying pattern:", patternToApply.name);
      
      setTimeout(() => {
        selectTexture(patternToApply.imageUrl, patternToApply.name);
      }, 500); // Model yüklendikten sonra uygula
    }

    const timer = setTimeout(() => {
      const textureRadios = document.querySelectorAll('input[name="texture"]');
      console.log("Admin patterns changed, re-adding listeners. Found radios:", textureRadios.length);
      
      textureRadios.forEach((radio, index) => {
        radio.removeEventListener("change", handleTextureChange);
        radio.addEventListener("change", handleTextureChange);
        console.log(`Re-added listener to radio ${index} with value:`, radio.value);
      });
    }, 200);

    return () => clearTimeout(timer);
  }, [adminPatterns, selectTexture, handleTextureChange]);
  
  const animationIdRef = useRef(null);
  
  const animate = useCallback(() => {
    if (!renderer || !scene || !camera) return;
    
    animationIdRef.current = requestAnimationFrame(animate);
    if (orbitControls) orbitControls.update();
    renderer.render(scene, camera);
  }, []);

  const ref = useRef(null);
  const modelRef = useRef(null);
  const textureRef = useRef(null);
  const colorRef = useRef(null);

  // Favorilere ekleme fonksiyonu
  const addToFavorites = useCallback(() => {
    console.log("🎯 addToFavorites çağırıldı");
    console.log("👤 user:", user);
    console.log("🔒 isAdmin:", isAdmin);
    
    if (!user) {
      alert("Favorilere eklemek için giriş yapın!");
      return;
    }
    
    if (isAdmin) {
      alert("Admin kullanıcıları favori ekleyemez. Normal kullanıcı olarak giriş yapın!");
      return;
    }
    
    // Öncelikle sessionStorage'dan aktif texture'ı al
    const currentTexture = sessionStorage.getItem("selectedTexture");
    console.log("🎨 currentTexture from sessionStorage:", currentTexture);
    
    if (!currentTexture) {
      alert("Lütfen önce bir desen seçin!");
      return;
    }
    
    // Admin desenlerinden kontrol et
    const adminPattern = adminPatterns.find(p => p.imageUrl === currentTexture);
    console.log("🎨 adminPattern found:", adminPattern);
    
    if (!adminPattern) {
      alert("Geçerli bir admin deseni bulunamadı!");
      return;
    }

    const currentFavorites = user.favorites || [];
    
    // Aynı desen zaten favorilerde mi kontrol et (patternId ile)
    const alreadyExists = currentFavorites.some(fav => 
      fav.patternId === (adminPattern.id || adminPattern.name) || 
      fav.imageUrl === currentTexture // Eski formatla uyumluluk için
    );
    
    if (alreadyExists) {
      alert(`'${adminPattern.name}' zaten favorilerinizde!`);
      return;
    }

    const newFavorite = {
      id: Date.now().toString(),
      name: adminPattern.name,
      category: adminPattern.category,
      // Büyük base64 URL'ler yerine sadece pattern ID'sini kullan
      patternId: adminPattern.id || adminPattern.name,
      // Küçük preview için sadece dosya adını kullan  
      fileName: adminPattern.fileName || 'pattern.png',
      addedAt: new Date().toISOString(),
      isAdminPattern: true
    };

    console.log("💾 Favorilere ekleniyor:", newFavorite);
    
    try {
      const updatedFavorites = [...currentFavorites, newFavorite];
      updateUserFavorites(updatedFavorites);
      alert(`✅ '${adminPattern.name}' deseni favorilere eklendi! ❤️`);
      console.log("✅ Favori başarıyla eklendi");
    } catch (error) {
      console.error("❌ Favori eklenirken hata:", error);
      alert("Favori eklenirken bir hata oluştu!");
    }
  }, [user, isAdmin, adminPatterns, updateUserFavorites]);

  // AdminPanel'den pattern güncellemelerini dinlemek için (API ile)
  const reloadAdminPatterns = useCallback(async () => {
    try {
      console.log("🔄 Manual pattern reload from API...");
      const patterns = await apiRequest('/patterns');
      console.log("✅ Patterns reloaded:", patterns.length);
      setAdminPatterns(patterns);
    } catch (error) {
      console.error("❌ Failed to reload patterns:", error);
      // Fallback to localStorage
      const patterns = JSON.parse(localStorage.getItem('patterns') || '[]');
      setAdminPatterns(patterns);
    }
  }, []);

  // localStorage temizleme utility'si
  const cleanupLocalStorage = useCallback(() => {
    try {
      console.log("🧹 Cleaning up localStorage...");
      
      // Storage kullanım bilgisini göster
      let totalSize = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length;
        }
      }
      console.log(`📊 Current localStorage size: ${(totalSize / 1024).toFixed(2)} KB`);
      
      // Sadece gerekli verileri koru
      const essentialData = {
        patterns: localStorage.getItem('patterns'),
        currentUser: localStorage.getItem('currentUser'),
        users: localStorage.getItem('users')
      };
      
      localStorage.clear();
      
      // Gerekli verileri geri yükle
      Object.entries(essentialData).forEach(([key, value]) => {
        if (value) localStorage.setItem(key, value);
      });
      
      console.log("✅ localStorage cleaned up successfully");
      return true;
    } catch (error) {
      console.error("❌ Cleanup failed:", error);
      return false;
    }
  }, []);

  // Global olarak kullanılabilir hale getir
  useEffect(() => {
    window.reloadAdminPatterns = reloadAdminPatterns;
    window.cleanupLocalStorage = cleanupLocalStorage;
    return () => {
      delete window.reloadAdminPatterns;
      delete window.cleanupLocalStorage;
    };
  }, [reloadAdminPatterns, cleanupLocalStorage]);

  useEffect(() => {
    // Eğer zaten başlatılmışsa tekrar başlatma
    if (scene && renderer && camera) {
      console.log("ThreeJS zaten başlatılmış, atlanıyor...");
      return;
    }
    
    container = ref.current;
    modelSelector = modelRef.current;
    textureSelector = textureRef.current;
    colorSelector = colorRef.current;

    if (!container) {
      console.log("Container henüz hazır değil");
      return;
    }

    const savedModel = sessionStorage.getItem("selectedModel") || table5;
    if (modelSelector) modelSelector.value = savedModel;

    const savedTexture = sessionStorage.getItem("selectedTexture") || (adminPatterns.length > 0 ? adminPatterns[0].imageUrl : Image1);
    const savedColor = sessionStorage.getItem("selectedColor") || "#ffffff";

    if (textureSelector) textureSelector.value = savedTexture;
    if (colorSelector) colorSelector.value = savedColor;

    const resizeHandler = () => onWindowResize();

    init(savedModel);
    animate();

    window.addEventListener("resize", resizeHandler, false);

    // Update model on selection change
    if (modelSelector) {
      modelSelector.addEventListener("change", (event) => {
        const selectedModel = event.target.value;
        sessionStorage.setItem("selectedModel", selectedModel);
        window.location.reload();
      });
    }

    // Add event listeners for texture and color selections - IMPROVED VERSION
    const addTextureEventListeners = () => {
      const textureRadios = document.querySelectorAll('input[name="texture"]');
      console.log("Texture radios found:", textureRadios.length);
      
      textureRadios.forEach((radio, index) => {
        // Remove existing listener to prevent duplicates
        radio.removeEventListener("change", handleTextureChange);
        // Add new listener
        radio.addEventListener("change", handleTextureChange);
        console.log(`Event listener added to radio ${index}`);
      });
    };

    // Initial setup for texture listeners
    addTextureEventListeners();
    
    // Re-add listeners when adminPatterns change (delayed to ensure DOM update)
    setTimeout(() => {
      addTextureEventListeners();
    }, 100);

    if (colorSelector) {
      colorSelector.addEventListener("input", (event) => {
        const color = event.target.value;
        for (let key in materials) {
          materials[key].color.set(color);
          materials[key].needsUpdate = true;
        }
        sessionStorage.setItem("selectedColor", color);
      });
    }

    return () => {
      console.log("Component cleanup başlıyor...");
      
      // Animasyonu durdur
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      
      // Event listener'ları temizle
      window.removeEventListener("resize", resizeHandler, false);
      
      // Three.js nesnelerini temizle
      if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss();
        if (renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      }
      
      if (scene) {
        scene.clear();
      }
      
      if (orbitControls) {
        orbitControls.dispose();
      }
      
      // Global değişkenleri sıfırla
      scene = null;
      renderer = null;
      camera = null;
      orbitControls = null;
      currentModel = null;
      
      console.log("Component cleanup tamamlandı");
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Dependency array'i boş - sadece mount/unmount'ta çalışsın

  return (
   <div className="preview">
      <div className="ref" ref={ref}>
        {isLoading && <div className="loading-spinner"></div>}
        <div className="model-info">
          <h3>{modelInfo.name}</h3>
          <p>{modelInfo.type}</p>
        </div>
        
        {/* Desen Boyutu Kontrolü */}
        <div className="pattern-scale-control">
          <label htmlFor="patternScale"><span role="img" aria-label="sanat">🎨</span> Desen Boyutu</label>
          <input
            type="range"
            id="patternScale"
            min="0.2"
            max="3"
            step="0.1"
            value={patternScale}
            onChange={(e) => {
              const newScale = parseFloat(e.target.value);
              setPatternScale(newScale);
              adjustPatternScale(newScale);
            }}
            className="pattern-scale-slider"
          />
          <div className="scale-labels">
            <span>Küçük</span>
            <span>Normal</span>
            <span>Büyük</span>
          </div>
        </div>
      </div>

      <div className="controls">
        <div className="model">
          <p><span role="img" aria-label="tiyatro">🎭</span> Model Seçimi</p>
          <select id="modelSelector" ref={modelRef}>
            <option value={table5}>Zarif Elbise</option>
            <option value={table6}>Klasik Elbise</option>
            <option value={table7}>Modern Elbise</option>
            <option value={table8}>Şık Elbise</option>
            <option value={table10}>Vintage Elbise</option>
            <option value={table13}>Casual Elbise</option>
            <option value={table15}>Gece Elbisesi</option>
            <option value={table14}>Parti Elbisesi</option>
          </select>
        </div>
        
        <div className="texture">
          <p><span role="img" aria-label="sanat">🎨</span> Desen Koleksiyonu</p>
          
          {/* Search Bar */}
          <div className="pattern-search-container">
            <input
              type="text"
              placeholder="Desen ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pattern-search"
            />
          </div>
          
          {/* Desen bilgileri */}
          <div className="pattern-info">
            <span className="pattern-count">
              {filteredPatterns.length} desen bulundu
            </span>
            <div className="keyboard-hints">
              <span className="keyboard-hint">ESC Temizle</span>
              <span className="keyboard-hint">↕️ Scroll</span>
            </div>
          </div>
          
          {/* Desenler Grid Container */}
          <div className="patterns-scroll-container" ref={scrollContainerRef}>
            {patternsLoading ? (
              <div className="patterns-loading">
                <div className="loading-spinner"></div>
                <p>Desenler yükleniyor...</p>
              </div>
            ) : filteredPatterns.length > 0 ? (
              <div className="patterns-grid">
                {filteredPatterns.map((pattern, index) => (
                  <label 
                    key={pattern.id} 
                    className="pattern-card"
                    onClick={() => selectTexture(pattern.imageUrl, pattern.name)}
                  >
                    <input 
                      type="radio" 
                      name="texture" 
                      value={pattern.imageUrl} 
                      hidden 
                      defaultChecked={index === 0}
                      onChange={() => selectTexture(pattern.imageUrl, pattern.name)}
                    />
                    <div className="pattern-image-container">
                      <img 
                        src={pattern.imageUrl} 
                        alt={pattern.name} 
                        className="pattern-image" 
                        loading="lazy"
                        onError={(e) => {
                          e.target.style.background = 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)';
                          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjZjFmNWY5Ii8+Cjx0ZXh0IHg9IjQwIiB5PSI0MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE2IiBmaWxsPSIjOTRhM2I4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+8J+WvzwvdGV4dD4KPC9zdmc+';
                        }}
                      />
                    </div>
                    <div className="pattern-details">
                      <span className="pattern-name">{pattern.name}</span>
                      <span className="pattern-category">{pattern.category}</span>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="no-patterns">
                {adminPatterns.length === 0 ? (
                  <>
                    <p>Henüz admin tarafından desen eklenmemiş</p>
                    <p style={{fontSize: '12px', color: '#95a5a6'}}>
                      Admin panelinden PNG desenler eklenmelidir
                    </p>
                  </>
                ) : (
                  <p>Arama kriterlerinize uygun desen bulunamadı</p>
                )}
              </div>
            )}
          </div>
        </div>
        
       
        
        {!isAdmin && (
          <div className="favorites">
            <button onClick={addToFavorites} className="favorite-btn">
              <span role="img" aria-label="kalp">❤️</span> Favorilere Ekle
            </button>
          </div>
        )}
      </div>
  </div>
  );
};
export default ThreeJSExample;
