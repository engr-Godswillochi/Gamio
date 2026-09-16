import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import HowItWorks from './components/HowItWorks';
import DualCreation from './components/DualCreation';
import TrendingGames from './components/TrendingGames';
import RemixExplainer from './components/RemixExplainer';
import CTASection from './components/CTASection';
import Footer from './components/Footer';
import FloatingParticles from './components/FloatingParticles';
import ManualBuilder from './components/builder/ManualBuilder';
import AICreator from './components/builder/AICreator';
import GamePlayer from './components/player/GamePlayer';
import UserProfile from './components/profile/UserProfile';
import EditorWorkspace from './components/editor/EditorWorkspace';
import CreateGameModal from './components/editor/CreateGameModal';

export default function App() {
  // Views: 'landing' | 'create' | 'editor' | 'builder' | 'ai-creator' | 'play' | 'profile'
  const [currentView, setCurrentView] = useState('landing');
  const [activeSlug, setActiveSlug] = useState('neon-dash-runner');
  const [profileUsername, setProfileUsername] = useState('CyberRunner');
  const [remixSchema, setRemixSchema] = useState(null);
  const [editorSchema, setEditorSchema] = useState(null);

  // ── Navigation Handlers ──

  const handleStartCreate = () => {
    setCurrentView('create');
  };

  const handleStartEditor = (schema) => {
    setEditorSchema(schema);
    setCurrentView('editor');
  };

  const handleStartManualBuilder = () => {
    setRemixSchema(null);
    setCurrentView('builder');
  };

  const handleStartAICreator = () => {
    setCurrentView('ai-creator');
  };

  const handlePlayGame = (slug) => {
    setActiveSlug(slug || 'neon-dash-runner');
    setCurrentView('play');
  };

  const handleRemixGame = (schema) => {
    // If it's a v2 entity schema, open in the new editor
    if (schema && Array.isArray(schema.entities)) {
      const cloned = JSON.parse(JSON.stringify(schema));
      cloned.title = `${cloned.title} (Remix)`;
      cloned.remixOfId = cloned.id;
      const remixId = crypto.randomUUID ? crypto.randomUUID() : `remix_${Date.now().toString(36)}`;
      cloned.id = remixId;
      cloned.slug = `${cloned.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${remixId.slice(-8)}`;
      // Preserve the entity-schema version. Downgrading a v3 remix to v1
      // discards the logic block when the editor normalizes the schema.
      cloned.version = schema.version || 3;
      cloned.creationPath = 'manual';
      setEditorSchema(cloned);
      setCurrentView('editor');
    } else {
      // Legacy schema — open in old builder
      setRemixSchema(schema);
      setCurrentView('builder');
    }
  };

  const handleViewProfile = (username) => {
    setProfileUsername(username || 'CyberRunner');
    setCurrentView('profile');
  };

  // ── View Router ──

  if (currentView === 'create') {
    return (
      <CreateGameModal
        onStartEditor={handleStartEditor}
        onBack={() => setCurrentView('landing')}
      />
    );
  }

  if (currentView === 'editor') {
    return (
      <EditorWorkspace
        initialSchema={editorSchema}
        onPublishSuccess={(newSlug) => {
          setActiveSlug(newSlug);
          setCurrentView('play');
        }}
        onBack={() => setCurrentView('landing')}
      />
    );
  }

  if (currentView === 'ai-creator') {
    return (
      <AICreator
        onBackClick={() => setCurrentView('landing')}
        onCustomizeInBuilder={(schema) => {
          setRemixSchema(schema);
          setCurrentView('builder');
        }}
        onPublishSuccess={(newSlug) => {
          setActiveSlug(newSlug);
          setCurrentView('play');
        }}
      />
    );
  }

  if (currentView === 'builder') {
    return (
      <ManualBuilder
        initialSchema={remixSchema}
        onPublishSuccess={(newSlug) => {
          setActiveSlug(newSlug);
          setCurrentView('play');
        }}
      />
    );
  }

  if (currentView === 'play') {
    return (
      <GamePlayer
        slug={activeSlug}
        onBackClick={() => setCurrentView('landing')}
        onRemixClick={(schema) => handleRemixGame(schema)}
        onNavigateSlug={(slug) => handlePlayGame(slug)}
      />
    );
  }

  if (currentView === 'profile') {
    return (
      <UserProfile
        username={profileUsername}
        onBackClick={() => setCurrentView('landing')}
        onPlayGame={(slug) => handlePlayGame(slug)}
      />
    );
  }

  // ── Landing Page ──
  return (
    <div className="scanlines relative min-h-screen bg-[#07040d]">
      <FloatingParticles />
      <Navbar
        onBuildClick={handleStartCreate}
        onPlayClick={() => handlePlayGame('neon-dash-runner')}
        onProfileClick={() => handleViewProfile('CyberRunner')}
      />
      <main className="relative z-10 pixel-grid">
        <Hero
          onBuildClick={handleStartCreate}
          onPlayClick={() => handlePlayGame('neon-dash-runner')}
        />
        <HowItWorks />
        <DualCreation
          onBuildClick={handleStartCreate}
          onAIClick={handleStartAICreator}
        />
        <TrendingGames
          onPlayGame={handlePlayGame}
          onRemixGame={handleRemixGame}
        />
        <RemixExplainer onBuildClick={handleStartCreate} />
        <CTASection onBuildClick={handleStartCreate} />
      </main>
      <Footer />
    </div>
  );
}
