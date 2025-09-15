import React, { useState, useEffect, useRef } from 'react';
import UnifiedViewer from './UnifiedViewer';
import ExperienceModal from './ExperienceModal';
import BackendUI from './BackendUI';
import { Brain, Zap, Gamepad2, Microscope, Sparkles, Bot, Target, Eye } from 'lucide-react';
import './HomePage.css';

interface HomePageProps {
  onNavigateToSimulation: () => void;
  onNavigateToCustomSimulation: () => void;
  onShowBackendUI: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ onNavigateToSimulation, onNavigateToCustomSimulation, onShowBackendUI }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showBackendUI, setShowBackendUI] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const heroRef = useRef<HTMLHeadingElement>(null);

  // Handle hero header visibility detection using Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // When hero header is NOT intersecting (out of view), navbar should be black
        setIsScrolled(!entry.isIntersecting);
      },
      {
        threshold: 0.1, // Trigger when 10% of hero header is out of view
        rootMargin: '-60px 0px 0px 0px' // Account for navbar height
      }
    );

    if (heroRef.current) {
      observer.observe(heroRef.current);
    }

    return () => {
      if (heroRef.current) {
        observer.unobserve(heroRef.current);
      }
    };
  }, []);


  return (
    <div className="homepage">
      {/* Navigation Header */}
      <nav className={`homepage-nav ${isScrolled ? 'scrolled' : ''}`}>
        <div className="nav-brand">
          <h1>machinaRL</h1>
        </div>
        <div className="nav-links">
          <a 
            href="#" 
            className="nav-link"
            onClick={(e) => {
              e.preventDefault();
              onNavigateToSimulation();
            }}
          >
            Live sim
          </a>
          <a 
            href="#" 
            className="nav-link"
            onClick={(e) => {
              e.preventDefault();
              onNavigateToCustomSimulation();
            }}
          >
            Make your sim
          </a>
          <a href="#docs" className="nav-link">docs</a>
        </div>
        <button 
          className="get-started-btn"
          onClick={onNavigateToSimulation}
        >
          Experience
        </button>
        <button 
          className="admin-btn"
          onClick={() => {
            console.log('🔧 Admin button clicked - showing BackendUI');
            setShowBackendUI(true);
          }}
          title="Open Backend Admin Dashboard"
        >
          🔧 Admin
        </button>
      </nav>

      {/* Main Content */}
      <main className="homepage-main">
        <div className="hero-section">
          <h2 className="hero-title" ref={heroRef}>machinaRL</h2>
          <p className="hero-subtitle">Reinforcement learning meets digital life.</p>
          <p className="hero-description">
            An experimental 3D simulation where autonomous agents learn, adapt, and evolve inside dynamic environments. 
            Powered by reinforcement learning, these digital creatures discover survival strategies, cooperation, and conflict — 
            not because they're scripted to, but because behavior emerges naturally from the loop.
          </p>
          
          {/* 3D Viewer */}
          <div className="homepage-viewer">
            <UnifiedViewer 
              width={800} 
              height={400} 
              modelFilename="scifi.glb"
              onStateChange={() => {}}
              onControlAction={() => {}}
            />
          </div>

          {/* Experience Button */}
          <div className="experience-button-container">
            <button 
              className="experience-button"
              onClick={() => setIsModalOpen(true)}
            >
              <Gamepad2 size={20} />
              Experience
            </button>
          </div>

        </div>

        {/* Core Features Section */}
        <section className="core-features-section">
          <div className="core-features-grid">
            <div className="core-feature-card">
              <div className="feature-icon">
                <Sparkles size={32} />
              </div>
              <h3>Emergence</h3>
              <p>Watch unexpected behaviors unfold from simple rules.</p>
            </div>
            <div className="core-feature-card">
              <div className="feature-icon">
                <Bot size={32} />
              </div>
              <h3>Autonomy</h3>
              <p>Agents act without scripts or micromanagement.</p>
            </div>
            <div className="core-feature-card">
              <div className="feature-icon">
                <Eye size={32} />
              </div>
              <h3>Exploration</h3>
              <p>A living playground where users can observe, interact, and experiment.</p>
            </div>
            <div className="core-feature-card">
              <div className="feature-icon">
                <Microscope size={32} />
              </div>
              <h3>Research-Ready</h3>
              <p>Deterministic seeds, reproducible runs, transparent configs.</p>
            </div>
          </div>
        </section>

        {/* Technology Section */}
        <section className="technology-section">
          <div className="tech-content">
            <h3>Emergence, autonomy, and behavior forged in the loop</h3>
            <p>
              MACHINA RL is a cutting-edge reinforcement learning platform that creates 
              autonomous digital ecosystems where AI agents learn, adapt, and evolve. 
              Watch as complex behaviors emerge from simple rules, creating a living 
              laboratory for understanding intelligence and emergence.
            </p>
          </div>
        </section>

        {/* Features Section */}
        <section className="features-section">
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-small">
                <Brain size={24} />
              </div>
              <h4>Reinforcement Learning</h4>
              <p>Advanced RL algorithms power autonomous decision-making and learning in dynamic environments.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-small">
                <Zap size={24} />
              </div>
              <h4>Real-time Emergence</h4>
              <p>Witness complex behaviors and strategies emerge naturally from agent interactions.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-small">
                <Target size={24} />
              </div>
              <h4>Research Platform</h4>
              <p>Deterministic environments with reproducible results for scientific research and experimentation.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="homepage-footer">
        <p>
          By sending a message, you agree to our{' '}
          <a href="#terms" className="footer-link">Terms of Use</a>
          {' '}and acknowledge that you have read and understand our{' '}
          <a href="#privacy" className="footer-link">Privacy Policy</a>.
        </p>
      </footer>

      {/* Experience Modal */}
      <ExperienceModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onExpand={() => {
          setIsModalOpen(false);
          onNavigateToSimulation();
        }}
      />

      {/* Backend UI */}
      <BackendUI 
        isOpen={showBackendUI}
        onClose={() => setShowBackendUI(false)}
      />
    </div>
  );
};

export default HomePage;
