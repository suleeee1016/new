import React, { useState } from "react";
import "./App.css";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Auth from "./components/Auth";
import Header from "./components/Header";
import AdminPanel from "./components/AdminPanel";
import Favorites from "./components/Favorites";
import ThreeJSExample from "./ThreeJSExample";

const AppContent = () => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const [showFavorites, setShowFavorites] = useState(false);

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading">Yükleniyor...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth />;
  }

  return (
    <div className="app">
      <Header 
        onShowFavorites={() => setShowFavorites(!showFavorites)}
        showingFavorites={showFavorites}
      />
      
      <main className="main-content">
        {isAdmin ? (
          <AdminPanel />
        ) : showFavorites ? (
          <Favorites />
        ) : (
          <div className="container">
            <ThreeJSExample />
          </div>
        )}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
