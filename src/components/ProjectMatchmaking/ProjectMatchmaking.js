// frontend/src/components/ProjectMatchmaking/ProjectMatchmaking.js
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import SkillMatchingAPI from '../../services/skillMatchingAPI';
import MatchmakingModal from './MatchmakingModal';
import { 
  Search, 
  Target, 
  Zap, 
  Star, 
  Users, 
  Calendar, 
  Clock,
  TrendingUp,
  Code,
  Sparkles,
  RefreshCw,
  CheckCircle,
  Shield,
  Cpu,
  Radio
} from 'lucide-react';

const ProjectMatchmaking = ({ onProjectSelect }) => {
  const { user } = useAuth();
  const [matchState, setMatchState] = useState('idle'); // idle, searching, found, cooldown
  const [matchedProjects, setMatchedProjects] = useState([]);
  const [searchProgress, setSearchProgress] = useState(0);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [showMatchModal, setShowMatchModal] = useState(false);

  // Cooldown timer
  useEffect(() => {
    if (cooldownTime > 0) {
      const timer = setTimeout(() => setCooldownTime(cooldownTime - 1), 1000);
      return () => clearTimeout(timer);
    } else if (cooldownTime === 0 && matchState === 'cooldown') {
      setMatchState('idle');
    }
  }, [cooldownTime, matchState]);

  // Simulate search progress
  useEffect(() => {
    if (matchState === 'searching') {
      const interval = setInterval(() => {
        setSearchProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 2;
        });
      }, 50);

      return () => clearInterval(interval);
    }
  }, [matchState]);

  const startMatchmaking = async () => {
    setMatchState('searching');
    setSearchProgress(0);
    setMatchedProjects([]);

    try {
      await new Promise(resolve => setTimeout(resolve, 2500));

      const response = await SkillMatchingAPI.getEnhancedRecommendations(user.id, {
        limit: 12,
        includeExplanations: true
      });

      const projects = response.data.recommendations;
      
      setMatchedProjects(projects);
      setMatchState('found');
      setCooldownTime(30);
      
      // Show the modal when matches are found
      if (projects.length > 0) {
        setShowMatchModal(true);
      }
      
    } catch (error) {
      console.error('Matchmaking error:', error);
      setMatchState('idle');
      alert('Failed to find matches. Please try again.');
    }
  };

  const handleSearchAgain = () => {
    if (cooldownTime === 0) {
      startMatchmaking();
    }
  };

  const handleProjectClick = (project) => {
    setShowMatchModal(false);
    if (onProjectSelect) {
      onProjectSelect(project);
    }
  };

  const handleViewAllMatches = () => {
    setShowMatchModal(false);
  };

  const handleJoinProject = async (projectId, projectTitle) => {
  try {
    setJoining(true);
    
    const response = await projectService.joinProject(projectId);
    
    if (response.success) {
      // Show success message
      alert(`Successfully joined ${projectTitle}!`);
      
      // Navigate to project dashboard
      navigate(`/project/${projectId}/dashboard`);
      
      // Or refresh the project list
      // window.location.reload();
    } else {
      alert(response.message || 'Failed to join project');
    }
  } catch (error) {
    console.error('Error joining project:', error);
    const errorMessage = error.response?.data?.message || 'Failed to join project';
    alert(errorMessage);
  } finally {
    setJoining(false);
  }
};

  const renderIdleState = () => (
    <div style={styles.idleContainer}>
      {/* Grid Overlay */}
      <div style={styles.gridOverlay} />
      
      {/* Corner Accents */}
      <svg style={{...styles.cornerAccent, top: 0, left: 0}} viewBox="0 0 100 100">
        <path d="M0 40 L0 0 L40 0" fill="none" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="2"/>
        <circle cx="0" cy="0" r="4" fill="#3b82f6" opacity="0.6"/>
      </svg>
      <svg style={{...styles.cornerAccent, top: 0, right: 0, transform: 'scaleX(-1)'}} viewBox="0 0 100 100">
        <path d="M0 40 L0 0 L40 0" fill="none" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="2"/>
        <circle cx="0" cy="0" r="4" fill="#3b82f6" opacity="0.6"/>
      </svg>
      <svg style={{...styles.cornerAccent, bottom: 0, left: 0, transform: 'scaleY(-1)'}} viewBox="0 0 100 100">
        <path d="M0 40 L0 0 L40 0" fill="none" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="2"/>
        <circle cx="0" cy="0" r="4" fill="#3b82f6" opacity="0.6"/>
      </svg>
      <svg style={{...styles.cornerAccent, bottom: 0, right: 0, transform: 'scale(-1)'}} viewBox="0 0 100 100">
        <path d="M0 40 L0 0 L40 0" fill="none" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="2"/>
        <circle cx="0" cy="0" r="4" fill="#3b82f6" opacity="0.6"/>
      </svg>

      <div style={styles.heroSection}>
        {/* Hexagon Badge */}
        <div style={styles.hexagonContainer}>
          <div style={styles.hexagonBadge}>
            <svg style={styles.hexagonSvg} viewBox="0 0 100 115">
              <defs>
                <linearGradient id="hexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8"/>
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8"/>
                </linearGradient>
                <filter id="hexGlow">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <polygon 
                points="50,2 95,28 95,87 50,113 5,87 5,28" 
                fill="rgba(15, 23, 42, 0.9)"
                stroke="url(#hexGradient)"
                strokeWidth="2"
                filter="url(#hexGlow)"
              />
            </svg>
            <div style={styles.hexagonContent}>
              <Target size={44} color="#3b82f6" />
            </div>
          </div>
          
          {/* Orbiting dots */}
          <div style={styles.orbitRing}>
            <div style={{...styles.orbitDot, animationDelay: '0s'}} />
            <div style={{...styles.orbitDot, animationDelay: '1s'}} />
            <div style={{...styles.orbitDot, animationDelay: '2s'}} />
          </div>
        </div>

        {/* Title Section */}
        <div style={styles.titleSection}>
          <span style={styles.statusBadge}>
            <Radio size={12} />
            SYSTEM READY
          </span>
          <h2 style={styles.heroTitle}>Project Matchmaking</h2>
          <p style={styles.heroSubtitle}>
            Advanced AI-powered project discovery system
          </p>
        </div>

        {/* Start Button */}
        <button 
          style={styles.startButton}
          onClick={startMatchmaking}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
            e.currentTarget.style.boxShadow = '0 15px 40px rgba(59, 130, 246, 0.5), 0 0 60px rgba(59, 130, 246, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 30px rgba(59, 130, 246, 0.3), 0 0 40px rgba(59, 130, 246, 0.1)';
          }}
        >
          <div style={styles.buttonGlow} />
          <Search size={22} />
          <span>Initialize Search</span>
          <div style={styles.buttonArrow}>
            <Zap size={18} />
          </div>
        </button>

        {/* Stats Bar */}
        <div style={styles.statsBar}>
          <div style={styles.statItem}>
            <span style={styles.statNumber}>100+</span>
            <span style={styles.statLabel}>Projects</span>
          </div>
          <div style={styles.statDivider} />
          <div style={styles.statItem}>
            <span style={styles.statNumber}>78%</span>
            <span style={styles.statLabel}>Match Rate</span>
          </div>
          <div style={styles.statDivider} />
          <div style={styles.statItem}>
            <span style={styles.statNumber}>2.5s</span>
            <span style={styles.statLabel}>Avg Time</span>
          </div>
        </div>

        {/* Features Grid */}
        <div style={styles.featureGrid}>
          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>
              <Cpu size={22} style={{ color: '#3b82f6' }} />
            </div>
            <h4 style={styles.featureTitle}>Neural Matching</h4>
            <p style={styles.featureText}>AI analyzes your skill profile</p>
          </div>
          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>
              <Shield size={22} style={{ color: '#8b5cf6' }} />
            </div>
            <h4 style={styles.featureTitle}>Skill Calibration</h4>
            <p style={styles.featureText}>Matched to your experience</p>
          </div>
          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>
              <Users size={22} style={{ color: '#10b981' }} />
            </div>
            <h4 style={styles.featureTitle}>Team Sync</h4>
            <p style={styles.featureText}>Find active collaborators</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSearchingState = () => (
    <div style={styles.searchingContainer}>
      {/* Grid Overlay */}
      <div style={styles.gridOverlay} />
      
      {/* Scan Line */}
      <div style={styles.scanLine} />
      
      {/* Corner Accents */}
      <svg style={{...styles.cornerAccent, top: 0, left: 0}} viewBox="0 0 100 100">
        <path d="M0 40 L0 0 L40 0" fill="none" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="2"/>
      </svg>
      <svg style={{...styles.cornerAccent, top: 0, right: 0, transform: 'scaleX(-1)'}} viewBox="0 0 100 100">
        <path d="M0 40 L0 0 L40 0" fill="none" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="2"/>
      </svg>
      <svg style={{...styles.cornerAccent, bottom: 0, left: 0, transform: 'scaleY(-1)'}} viewBox="0 0 100 100">
        <path d="M0 40 L0 0 L40 0" fill="none" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="2"/>
      </svg>
      <svg style={{...styles.cornerAccent, bottom: 0, right: 0, transform: 'scale(-1)'}} viewBox="0 0 100 100">
        <path d="M0 40 L0 0 L40 0" fill="none" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="2"/>
      </svg>

      <div style={styles.searchContent}>
        {/* Radar Animation */}
        <div style={styles.radarContainer}>
          <div style={styles.radarRing} />
          <div style={styles.radarRing2} />
          <div style={styles.radarSweep} />
          <div style={styles.radarCenter}>
            <Target size={40} style={{ color: '#3b82f6' }} />
          </div>
        </div>

        <div style={styles.searchTextContainer}>
          <span style={styles.searchingBadge}>
            <div style={styles.pulseDot} />
            SCANNING
          </span>
          <h2 style={styles.searchingTitle}>Analyzing Projects</h2>
          <p style={styles.searchingText}>Cross-referencing your skill matrix...</p>
        </div>

        {/* Progress Bar */}
        <div style={styles.progressContainer}>
          <div style={styles.progressHeader}>
            <span style={styles.progressLabel}>MATCH PROGRESS</span>
            <span style={styles.progressPercent}>{searchProgress}%</span>
          </div>
          <div style={styles.progressBar}>
            <div 
              style={{
                ...styles.progressFill,
                width: `${searchProgress}%`
              }}
            />
            <div style={styles.progressGlow} />
          </div>
        </div>

        {/* Search Steps */}
        <div style={styles.searchSteps}>
          <div style={{...styles.step, opacity: searchProgress > 0 ? 1 : 0.4}}>
            <div style={{
              ...styles.stepIcon,
              backgroundColor: searchProgress > 20 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              borderColor: searchProgress > 20 ? '#10b981' : 'rgba(255, 255, 255, 0.1)'
            }}>
              {searchProgress > 20 ? (
                <CheckCircle size={14} style={{ color: '#10b981' }} />
              ) : (
                <Clock size={14} style={{ color: '#6b7280' }} />
              )}
            </div>
            <span>Scanning project database</span>
          </div>
          <div style={{...styles.step, opacity: searchProgress > 30 ? 1 : 0.4}}>
            <div style={{
              ...styles.stepIcon,
              backgroundColor: searchProgress > 60 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              borderColor: searchProgress > 60 ? '#10b981' : 'rgba(255, 255, 255, 0.1)'
            }}>
              {searchProgress > 60 ? (
                <CheckCircle size={14} style={{ color: '#10b981' }} />
              ) : (
                <Clock size={14} style={{ color: '#6b7280' }} />
              )}
            </div>
            <span>Calculating compatibility scores</span>
          </div>
          <div style={{...styles.step, opacity: searchProgress > 70 ? 1 : 0.4}}>
            <div style={{
              ...styles.stepIcon,
              backgroundColor: searchProgress >= 100 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              borderColor: searchProgress >= 100 ? '#10b981' : 'rgba(255, 255, 255, 0.1)'
            }}>
              {searchProgress >= 100 ? (
                <CheckCircle size={14} style={{ color: '#10b981' }} />
              ) : (
                <Clock size={14} style={{ color: '#6b7280' }} />
              )}
            </div>
            <span>Ranking optimal matches</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFoundState = () => (
    <div style={styles.resultsContainer}>
      <div style={styles.resultsHeader}>
        <div>
          <h2 style={styles.resultsTitle}>
            <Sparkles size={28} style={{ color: '#3b82f6' }} />
            {matchedProjects.length} Matches Found!
          </h2>
          <p style={styles.resultsSubtitle}>
            These projects are perfect for your skills and interests
          </p>
        </div>
        <button 
          style={{
            ...styles.searchAgainButton,
            opacity: cooldownTime > 0 ? 0.5 : 1,
            cursor: cooldownTime > 0 ? 'not-allowed' : 'pointer'
          }}
          onClick={handleSearchAgain}
          disabled={cooldownTime > 0}
          onMouseEnter={(e) => {
            if (cooldownTime === 0) {
              e.currentTarget.style.backgroundColor = '#2563eb';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#3b82f6';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <RefreshCw size={16} />
          {cooldownTime > 0 ? `Wait ${cooldownTime}s` : 'Find New Matches'}
        </button>
      </div>

      <div style={styles.projectGrid}>
        {matchedProjects.map((project) => (
          <div 
            key={project.projectId}
            style={styles.projectCard}
            onClick={() => handleProjectClick(project)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.3)';
              e.currentTarget.style.borderColor = '#3b82f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            {/* Match Score Badge */}
            <div style={styles.matchBadge}>
              <Star size={14} style={{ color: '#fbbf24' }} />
              <span>{project.score}% Match</span>
            </div>

            {/* Project Info */}
            <h3 style={styles.projectTitle}>{project.title}</h3>
            <p style={styles.projectDescription}>
              {project.description?.substring(0, 120)}...
            </p>

            {/* Technologies */}
            <div style={styles.techStack}>
              {project.programming_languages?.slice(0, 3).map((lang, idx) => (
                <span key={idx} style={styles.techBadge}>
                  {lang}
                </span>
              ))}
            </div>

            {/* Project Stats */}
            <div style={styles.projectStats}>
              <div style={styles.stat}>
                <Users size={14} />
                <span>{project.current_members || 0}/{project.maximum_members || 0}</span>
              </div>
              <div style={styles.stat}>
                <Zap size={14} />
                <span>{project.difficulty_level}</span>
              </div>
              {project.deadline && (
                <div style={styles.stat}>
                  <Calendar size={14} />
                  <span>{new Date(project.deadline).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {/* Match Factors */}
            {project.matchFactors && (
              <div style={styles.matchFactors}>
                <div style={styles.matchFactor}>
                  <span style={styles.factorLabel}>Skills:</span>
                  <div style={styles.factorBar}>
                    <div 
                      style={{
                        ...styles.factorFill,
                        width: `${project.matchFactors.languageScore || 0}%`,
                        backgroundColor: '#3b82f6'
                      }}
                    />
                  </div>
                </div>
                <div style={styles.matchFactor}>
                  <span style={styles.factorLabel}>Interest:</span>
                  <div style={styles.factorBar}>
                    <div 
                      style={{
                        ...styles.factorFill,
                        width: `${project.matchFactors.topicScore || 0}%`,
                        backgroundColor: '#8b5cf6'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Join Button */}
            <button 
              onClick={() => handleJoinProject(project.id, project.title)}
              disabled={joining}
              style={styles.joinButton}
            >
              {joining ? 'Joining...' : 'Join Project'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <style>{keyframes}</style>
      
      {matchState === 'idle' && renderIdleState()}
      {matchState === 'searching' && renderSearchingState()}
      {(matchState === 'found' || matchState === 'cooldown') && renderFoundState()}
      
      {/* Match Found Modal */}
      <MatchmakingModal
        isOpen={showMatchModal}
        onClose={() => setShowMatchModal(false)}
        matchedProjects={matchedProjects}
        onViewAllMatches={handleViewAllMatches}
        onProjectSelect={handleProjectClick}
      />
    </div>
  );
};

const keyframes = `
  @keyframes pulse {
    0% {
      transform: scale(0.8);
      opacity: 0;
    }
    50% {
      opacity: 0.5;
    }
    100% {
      transform: scale(1.4);
      opacity: 0;
    }
  }
  
  @keyframes hexPulse {
    0%, 100% { 
      filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.4));
    }
    50% { 
      filter: drop-shadow(0 0 35px rgba(59, 130, 246, 0.7));
    }
  }
  
  @keyframes orbit {
    0% { transform: rotate(0deg) translateX(70px) rotate(0deg); }
    100% { transform: rotate(360deg) translateX(70px) rotate(-360deg); }
  }
  
  @keyframes scanLine {
    0% { transform: translateY(-100%); opacity: 0; }
    50% { opacity: 1; }
    100% { transform: translateY(100%); opacity: 0; }
  }
  
  @keyframes radarSweep {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes radarPulse {
    0% { transform: scale(0.8); opacity: 0.8; }
    100% { transform: scale(1.5); opacity: 0; }
  }
  
  @keyframes pulseDot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.8); }
  }
  
  @keyframes borderGlow {
    0%, 100% { 
      box-shadow: inset 0 0 20px rgba(59, 130, 246, 0.1), 
                  0 0 20px rgba(59, 130, 246, 0.2);
    }
    50% { 
      box-shadow: inset 0 0 30px rgba(59, 130, 246, 0.2), 
                  0 0 40px rgba(59, 130, 246, 0.3);
    }
  }
  
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
`;

const styles = {
  container: {
    width: '100%',
    minHeight: '600px',
    position: 'relative'
  },
  
  // ============ SHARED STYLES ============
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `
      linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px)
    `,
    backgroundSize: '40px 40px',
    pointerEvents: 'none',
    borderRadius: '16px'
  },
  cornerAccent: {
    position: 'absolute',
    width: '80px',
    height: '80px',
    pointerEvents: 'none',
    zIndex: 1
  },
  
  // ============ IDLE STATE STYLES ============
  idleContainer: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '50px 30px',
    minHeight: '550px',
    background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.6) 0%, rgba(7, 11, 20, 0.8) 100%)',
    borderRadius: '20px',
    border: '1px solid rgba(59, 130, 246, 0.15)',
    overflow: 'hidden'
  },
  heroSection: {
    position: 'relative',
    zIndex: 2,
    textAlign: 'center',
    maxWidth: '700px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  hexagonContainer: {
    position: 'relative',
    width: '140px',
    height: '140px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  hexagonBadge: {
    position: 'relative',
    width: '100px',
    height: '115px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'hexPulse 3s ease-in-out infinite'
  },
  hexagonSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%'
  },
  hexagonContent: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  orbitRing: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '140px',
    height: '140px',
    transform: 'translate(-50%, -50%)',
    borderRadius: '50%',
    border: '1px dashed rgba(59, 130, 246, 0.2)',
    pointerEvents: 'none'
  },
  orbitDot: {
    position: 'absolute',
    width: '8px',
    height: '8px',
    backgroundColor: '#3b82f6',
    borderRadius: '50%',
    top: '50%',
    left: '50%',
    marginTop: '-4px',
    marginLeft: '-4px',
    animation: 'orbit 8s linear infinite',
    boxShadow: '0 0 10px #3b82f6'
  },
  titleSection: {
    marginBottom: '28px'
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#10b981',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '16px'
  },
  heroTitle: {
    fontSize: '36px',
    fontWeight: '800',
    color: 'white',
    marginBottom: '10px',
    letterSpacing: '-0.5px',
    background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  heroSubtitle: {
    fontSize: '16px',
    color: '#64748b',
    margin: 0,
    letterSpacing: '0.5px'
  },
  startButton: {
    position: 'relative',
    padding: '18px 48px',
    fontSize: '16px',
    fontWeight: '700',
    color: 'white',
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    border: 'none',
    borderRadius: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    boxShadow: '0 8px 30px rgba(59, 130, 246, 0.3), 0 0 40px rgba(59, 130, 246, 0.1)',
    transition: 'all 0.3s ease',
    marginBottom: '32px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    overflow: 'hidden'
  },
  buttonGlow: {
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '100%',
    height: '100%',
    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
    animation: 'shimmer 3s ease-in-out infinite'
  },
  buttonArrow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    marginLeft: '8px'
  },
  statsBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    padding: '16px 32px',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    marginBottom: '32px',
    animation: 'borderGlow 4s ease-in-out infinite'
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px'
  },
  statNumber: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#3b82f6',
    fontFamily: 'monospace'
  },
  statLabel: {
    fontSize: '11px',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  statDivider: {
    width: '1px',
    height: '30px',
    background: 'linear-gradient(180deg, transparent, rgba(59, 130, 246, 0.3), transparent)'
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    width: '100%',
    maxWidth: '600px'
  },
  featureCard: {
    padding: '20px 16px',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    textAlign: 'center',
    transition: 'all 0.3s ease'
  },
  featureIcon: {
    width: '44px',
    height: '44px',
    margin: '0 auto 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: '10px',
    border: '1px solid rgba(59, 130, 246, 0.2)'
  },
  featureTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'white',
    margin: '0 0 6px 0'
  },
  featureText: {
    fontSize: '12px',
    color: '#64748b',
    margin: 0,
    lineHeight: '1.4'
  },

  // ============ SEARCHING STATE STYLES ============
  searchingContainer: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 30px',
    minHeight: '550px',
    background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.6) 0%, rgba(7, 11, 20, 0.8) 100%)',
    borderRadius: '20px',
    border: '1px solid rgba(59, 130, 246, 0.15)',
    overflow: 'hidden'
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '3px',
    background: 'linear-gradient(90deg, transparent, #3b82f6, #8b5cf6, transparent)',
    animation: 'scanLine 2s ease-in-out infinite',
    boxShadow: '0 0 20px #3b82f6, 0 0 40px #3b82f6'
  },
  searchContent: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    maxWidth: '400px'
  },
  radarContainer: {
    position: 'relative',
    width: '150px',
    height: '150px',
    marginBottom: '32px'
  },
  radarRing: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '100%',
    height: '100%',
    marginTop: '-75px',
    marginLeft: '-75px',
    borderRadius: '50%',
    border: '2px solid rgba(59, 130, 246, 0.3)',
    animation: 'radarPulse 2s ease-out infinite'
  },
  radarRing2: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '100%',
    height: '100%',
    marginTop: '-75px',
    marginLeft: '-75px',
    borderRadius: '50%',
    border: '2px solid rgba(59, 130, 246, 0.3)',
    animation: 'radarPulse 2s ease-out infinite',
    animationDelay: '1s'
  },
  radarSweep: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '50%',
    height: '2px',
    background: 'linear-gradient(90deg, #3b82f6, transparent)',
    transformOrigin: 'left center',
    animation: 'radarSweep 2s linear infinite',
    boxShadow: '0 0 15px #3b82f6'
  },
  radarCenter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '70px',
    height: '70px',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid rgba(59, 130, 246, 0.5)'
  },
  searchTextContainer: {
    textAlign: 'center',
    marginBottom: '28px'
  },
  searchingBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 16px',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#3b82f6',
    textTransform: 'uppercase',
    letterSpacing: '2px',
    marginBottom: '16px'
  },
  pulseDot: {
    width: '8px',
    height: '8px',
    backgroundColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'pulseDot 1s ease-in-out infinite'
  },
  searchingTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: 'white',
    marginBottom: '8px'
  },
  searchingText: {
    fontSize: '15px',
    color: '#64748b',
    margin: 0
  },
  progressContainer: {
    width: '100%',
    marginBottom: '28px'
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  progressLabel: {
    fontSize: '11px',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
  progressPercent: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#3b82f6',
    fontFamily: 'monospace'
  },
  progressBar: {
    position: 'relative',
    width: '100%',
    height: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
    transition: 'width 0.3s ease',
    borderRadius: '4px',
    position: 'relative'
  },
  progressGlow: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '50px',
    height: '100%',
    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3))',
    animation: 'shimmer 1s ease-in-out infinite'
  },
  searchSteps: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '100%'
  },
  step: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '14px',
    color: '#94a3b8',
    transition: 'opacity 0.3s ease'
  },
  stepIcon: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid',
    transition: 'all 0.3s ease'
  },

  // ============ RESULTS STATE STYLES ============
  resultsContainer: {
    padding: '20px'
  },
  resultsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  resultsTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px'
  },
  resultsSubtitle: {
    fontSize: '14px',
    color: '#9ca3af',
    margin: 0
  },
  searchAgainButton: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    color: 'white',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
  },
  projectGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px'
  },
  projectCard: {
    padding: '20px',
    backgroundColor: 'rgba(26, 28, 32, 0.6)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    position: 'relative',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
  },
  matchBadge: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    padding: '6px 12px',
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    border: '1px solid rgba(251, 191, 36, 0.3)',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#fbbf24'
  },
  projectTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'white',
    marginBottom: '12px',
    paddingRight: '80px'
  },
  projectDescription: {
    fontSize: '14px',
    color: '#9ca3af',
    lineHeight: '1.5',
    marginBottom: '16px'
  },
  techStack: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '16px'
  },
  techBadge: {
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#60a5fa',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    borderRadius: '12px'
  },
  projectStats: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
    paddingTop: '16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
  },
  stat: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#9ca3af'
  },
  matchFactors: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '8px'
  },
  matchFactor: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  factorLabel: {
    fontSize: '12px',
    color: '#9ca3af',
    minWidth: '60px'
  },
  factorBar: {
    flex: 1,
    height: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '2px',
    overflow: 'hidden'
  },
  factorFill: {
    height: '100%',
    transition: 'width 0.3s ease'
  },
  joinButton: {
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    fontWeight: '600',
    color: 'white',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s ease'
  }
};

export default ProjectMatchmaking;