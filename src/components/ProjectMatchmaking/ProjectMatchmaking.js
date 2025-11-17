// frontend/src/components/ProjectMatchmaking/ProjectMatchmaking.js
// MOBA-Style Project Matchmaking Feature
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import SkillMatchingAPI from '../../services/skillMatchingAPI';
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
  CheckCircle
} from 'lucide-react';

const ProjectMatchmaking = ({ onProjectSelect }) => {
  const { user } = useAuth();
  const [matchState, setMatchState] = useState('idle'); // idle, searching, found, cooldown
  const [matchedProjects, setMatchedProjects] = useState([]);
  const [searchProgress, setSearchProgress] = useState(0);
  const [cooldownTime, setCooldownTime] = useState(0);

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
      // Simulate realistic search time
      await new Promise(resolve => setTimeout(resolve, 2500));

      const response = await SkillMatchingAPI.getEnhancedRecommendations(user.id, {
        limit: 12,
        includeExplanations: true
      });

      const projects = response.data.recommendations;
      
      setMatchedProjects(projects);
      setMatchState('found');
      
      // Start 30-second cooldown
      setCooldownTime(30);
      
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
    if (onProjectSelect) {
      onProjectSelect(project);
    }
  };

  const renderIdleState = () => (
  <div style={styles.idleContainer}>
    <div style={styles.heroSection}>
      {/* MOVED: Icon and Title Group - More Compact */}
      <div style={styles.titleGroup}>
        <div style={styles.iconCircle}>
          <Target size={40} style={{ color: '#3b82f6' }} />
        </div>
        <h2 style={styles.heroTitle}>Project Matchmaking</h2>
        <p style={styles.heroSubtitle}>
          Find perfect team projects matched to your skills
        </p>
      </div>

      {/* MOVED UP: Start Button - Now Prominent */}
      <button 
        style={styles.startButton}
        onClick={startMatchmaking}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.05)';
          e.target.style.boxShadow = '0 8px 30px rgba(59, 130, 246, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = '0 4px 20px rgba(59, 130, 246, 0.3)';
        }}
      >
        <Search size={22} />
        Start Matchmaking
      </button>

      {/* Features Grid - Now Below Button */}
      <div style={styles.featureGrid}>
        <div style={styles.featureCard}>
          <TrendingUp size={20} style={{ color: '#3b82f6' }} />
          <h4 style={styles.featureTitle}>Smart Matching</h4>
          <p style={styles.featureText}>AI-powered recommendations</p>
        </div>
        <div style={styles.featureCard}>
          <Sparkles size={20} style={{ color: '#8b5cf6' }} />
          <h4 style={styles.featureTitle}>Perfect Fit</h4>
          <p style={styles.featureText}>Tailored to your level</p>
        </div>
        <div style={styles.featureCard}>
          <Users size={20} style={{ color: '#10b981' }} />
          <h4 style={styles.featureTitle}>Active Teams</h4>
          <p style={styles.featureText}>Engaged collaborators</p>
        </div>
      </div>
    </div>
  </div>
);

  const renderSearchingState = () => (
    <div style={styles.searchingContainer}>
      <div style={styles.searchAnimation}>
        <div style={styles.pulseRing}></div>
        <div style={{...styles.pulseRing, animationDelay: '0.5s'}}></div>
        <div style={styles.searchIcon}>
          <Target size={48} style={{ color: '#3b82f6' }} />
        </div>
      </div>

      <h2 style={styles.searchingTitle}>Finding Your Perfect Matches</h2>
      <p style={styles.searchingText}>Analyzing your skills and preferences...</p>

      <div style={styles.progressBarContainer}>
        <div style={styles.progressBar}>
          <div 
            style={{
              ...styles.progressFill,
              width: `${searchProgress}%`
            }}
          />
        </div>
        <span style={styles.progressText}>{searchProgress}%</span>
      </div>

      <div style={styles.searchSteps}>
        <div style={styles.step}>
          <CheckCircle size={16} style={{ color: '#10b981' }} />
          <span>Scanning available projects</span>
        </div>
        <div style={styles.step}>
          <CheckCircle size={16} style={{ color: '#10b981' }} />
          <span>Calculating compatibility</span>
        </div>
        <div style={styles.step}>
          {searchProgress < 90 ? (
            <Clock size={16} style={{ color: '#6b7280' }} />
          ) : (
            <CheckCircle size={16} style={{ color: '#10b981' }} />
          )}
          <span>Ranking best matches</span>
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
              e.target.style.backgroundColor = '#2563eb';
            }
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#3b82f6';
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
            <button style={styles.joinButton}>
              <Code size={16} />
              View Project
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      {matchState === 'idle' && renderIdleState()}
      {matchState === 'searching' && renderSearchingState()}
      {(matchState === 'found' || matchState === 'cooldown') && renderFoundState()}
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    minHeight: '600px'
  },
  
  // IDLE STATE STYLES
  // IDLE STATE STYLES - OPTIMIZED
idleContainer: {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '40px 20px',  // Reduced from 60px
  minHeight: '500px'
},
heroSection: {
  textAlign: 'center',
  maxWidth: '700px',
  width: '100%'
},
titleGroup: {
  marginBottom: '32px'  // Compact spacing
},
iconCircle: {
  width: '80px',  // Reduced from 100px
  height: '80px',
  borderRadius: '50%',
  backgroundColor: 'rgba(59, 130, 246, 0.15)',
  border: '2px solid rgba(59, 130, 246, 0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 20px',
  animation: 'pulse-glow 2s ease-in-out infinite'
},
heroTitle: {
  fontSize: '32px',  // Slightly reduced
  fontWeight: 'bold',
  color: 'white',
  marginBottom: '8px'
},
heroSubtitle: {
  fontSize: '16px',
  color: '#9ca3af',
  marginBottom: '0'
},
featureGrid: {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',  // Slightly smaller
  gap: '16px',
  marginTop: '32px',  // Added space above features
  width: '100%'
},
featureCard: {
  padding: '20px',  // Reduced from 24px
  backgroundColor: 'rgba(26, 28, 32, 0.4)',
  borderRadius: '12px',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  textAlign: 'center',
  transition: 'all 0.3s ease'
},
featureTitle: {
  fontSize: '14px',
  fontWeight: '600',
  color: 'white',
  margin: '10px 0 6px'
},
featureText: {
  fontSize: '12px',
  color: '#9ca3af',
  margin: 0,
  lineHeight: '1.4'
},
startButton: {
  padding: '18px 56px',  // Bigger button
  fontSize: '20px',      // Bigger text
  fontWeight: '700',     // Bolder
  color: 'white',
  backgroundColor: '#3b82f6',
  border: 'none',
  borderRadius: '16px',  // More rounded
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3), 0 0 40px rgba(59, 130, 246, 0.1)',
  transition: 'all 0.3s ease',
  margin: '0 auto',
  position: 'relative',
  overflow: 'hidden'
},

  // SEARCHING STATE STYLES
  searchingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '80px 20px',
    textAlign: 'center'
  },
  searchAnimation: {
    position: 'relative',
    width: '120px',
    height: '120px',
    marginBottom: '32px'
  },
  pulseRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    border: '3px solid #3b82f6',
    animation: 'pulse 2s infinite',
    opacity: 0
  },
  searchIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  searchingTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: 'white',
    marginBottom: '8px'
  },
  searchingText: {
    fontSize: '16px',
    color: '#9ca3af',
    marginBottom: '32px'
  },
  progressBarContainer: {
    width: '100%',
    maxWidth: '400px',
    marginBottom: '32px'
  },
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    transition: 'width 0.3s ease',
    borderRadius: '4px'
  },
  progressText: {
    fontSize: '14px',
    color: '#9ca3af',
    fontWeight: '600'
  },
  searchSteps: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    alignItems: 'flex-start',
    maxWidth: '300px'
  },
  step: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#d1d5db'
  },

  // RESULTS STATE STYLES
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
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    color: 'white',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease'
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
    position: 'relative'
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

// Add animation keyframes
const styleSheet = document.createElement("style");
styleSheet.textContent = `
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
`;
document.head.appendChild(styleSheet);

export default ProjectMatchmaking;