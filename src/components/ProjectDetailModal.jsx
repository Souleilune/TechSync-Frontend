// frontend/src/components/ProjectDetailModal.js - ENHANCED WITH RETAKE ASSESSMENT
import React, { useState, useEffect } from 'react';
import { X, Users, Clock, TrendingUp, Code, Target, Calendar, Lock, Sparkles, User, RefreshCw, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import ExpandableMatchSummary from './ExpandableMatchSummary';
import PostAssessmentModal from './PostAssessmentModal';
import PostAssessmentResultModal from './PostAssessmentResultModal';

const ProjectDetailModal = ({ project, isOpen, onClose, onJoin, isLocked, userProfile }) => {
  const [isJoining, setIsJoining] = useState(false);
  const [ownerInfo, setOwnerInfo] = useState(null);
  const [loadingOwner, setLoadingOwner] = useState(false);
  const navigate = useNavigate();

  // Assessment states
  const [showPostAssessmentModal, setShowPostAssessmentModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedLanguageForAssessment, setSelectedLanguageForAssessment] = useState(null);
  const [assessmentResult, setAssessmentResult] = useState(null);

  // Fetch owner information when modal opens
  useEffect(() => {
    const fetchOwnerInfo = async () => {
      const ownerId = project?.owner_id || 
                      project?.project?.owner_id || 
                      project?.ownerId;
      
      if (!ownerId && !project?.owner) {
        console.log('No owner_id found in project data');
        return;
      }
      
      if (project.owner?.username || project.owner?.email) {
        setOwnerInfo(project.owner);
        return;
      }

      if (project.users?.username || project.users?.email) {
        setOwnerInfo(project.users);
        return;
      }

      if (ownerId) {
        setLoadingOwner(true);
        try {
          console.log('Fetching owner info for ID:', ownerId);
          const response = await api.get(`/users/${ownerId}`);
          
          if (response.data.success) {
            setOwnerInfo(response.data.user);
            console.log('✅ Owner info fetched:', response.data.user);
          }
        } catch (error) {
          console.error('Error fetching owner info:', error);
          setOwnerInfo({ id: ownerId });
        } finally {
          setLoadingOwner(false);
        }
      }
    };

    if (isOpen) {
      fetchOwnerInfo();
    }
  }, [isOpen, project]);

  // Handle retake assessment for a specific language
  const handleRetakeAssessment = (languageName) => {
    console.log('🔄 Retaking assessment for:', languageName);
    
    // Find the user's language data
    const userLanguage = userProfile?.programming_languages?.find(
      lang => (lang.programming_languages?.name || lang.name) === languageName
    );

    if (!userLanguage) {
      console.error('Language not found in user profile:', languageName);
      return;
    }

    setSelectedLanguageForAssessment({
      id: userLanguage.language_id || userLanguage.programming_languages?.id,
      name: userLanguage.programming_languages?.name || userLanguage.name,
      currentProficiency: userLanguage.proficiency_level,
      userLanguageData: userLanguage
    });
    
    setShowPostAssessmentModal(true);
  };

  // Handle assessment completion
  const handleAssessmentComplete = (result) => {
    console.log('Assessment completed:', result);
    setAssessmentResult(result);
    setShowPostAssessmentModal(false);
    
    setTimeout(() => {
      setShowResultModal(true);
    }, 300);
  };

  // Handle returning from result modal
  const handleReturnFromAssessment = () => {
    setShowResultModal(false);
    setSelectedLanguageForAssessment(null);
    setAssessmentResult(null);
    
    // Optionally refresh the project modal or close it
    // You might want to refresh match score here
    console.log('Assessment flow completed');
  };

  // Handle "Go to Profile" link
  const handleGoToProfile = () => {
    onClose(); // Close modal
    navigate('/profile'); // Navigate to profile
  };

  const handleJoinClick = async (e) => {
    e.stopPropagation();
    
    if (isLocked) {
      return;
    }
    
    setIsJoining(true);
    try {
      await onJoin(project, e);
    } finally {
      setIsJoining(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      easy: '#10b981',
      medium: '#f59e0b',
      hard: '#ef4444',
      beginner: '#10b981',
      intermediate: '#f59e0b',
      advanced: '#ef4444'
    };
    return colors[difficulty?.toLowerCase()] || '#6b7280';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Enhanced suggestion parsing to extract language names
  const parseSuggestions = (suggestions) => {
    if (!suggestions || !Array.isArray(suggestions)) return [];
    
    return suggestions.map(suggestion => {
      // Check if suggestion mentions improving a language
      const improveMatch = suggestion.match(/Improve your (.+?) proficiency/i);
      const addMatch = suggestion.match(/Add (.+?) to your profile/i);
      
      return {
        text: suggestion,
        languageName: improveMatch?.[1] || addMatch?.[1] || null,
        isRetakeable: !!improveMatch // Only "improve" suggestions are retakeable
      };
    });
  };

  if (!isOpen || !project) return null;

  const mf = project.matchFactors || {};
  const score = project.score || 0;
  const parsedSuggestions = parseSuggestions(mf.suggestions);

  return (
    <>
      <div style={styles.overlay} onClick={handleOverlayClick}>
        <div style={styles.modal}>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.headerTop}>
              <div style={styles.titleSection}>
                <h2 style={styles.title}>{project.title}</h2>
                <div style={styles.badges}>
                  <span style={{
                    ...styles.badge,
                    backgroundColor: `${getDifficultyColor(project.difficulty_level)}20`,
                    color: getDifficultyColor(project.difficulty_level),
                    border: `1px solid ${getDifficultyColor(project.difficulty_level)}40`
                  }}>
                    {project.difficulty_level?.toUpperCase()}
                  </span>
                  <span style={styles.badge}>
                    {project.status?.toUpperCase()}
                  </span>
                </div>
              </div>
              <button style={styles.closeButton} onClick={onClose}>
                <X size={24} />
              </button>
            </div>
            
            <ExpandableMatchSummary
              score={score}
              matchFactors={mf}
              project={project}
              userProfile={userProfile}
            />
          </div>

          {/* Content */}
          <div style={styles.content}>
            {/* Description Section */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>
                <Target size={18} />
                Project Description
              </h3>
              <p style={styles.description}>{project.description}</p>
            </div>

            {/* Full Description if available */}
            {project.full_description && project.full_description !== project.description && (
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>
                  <Target size={18} />
                  Detailed Overview
                </h3>
                <div style={styles.fullDescription}>
                  {(project.full_description || '').split('\n').map((paragraph, idx) => (
                    <p key={idx} style={styles.paragraph}>{paragraph}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Project Stats Grid */}
            <div style={styles.statsGrid}>
              {(ownerInfo || project.owner_id || project.project?.owner_id) && (
                <div style={styles.statCard}>
                  <div style={styles.statIcon}>
                    <User size={20} style={{ color: '#8b5cf6' }} />
                  </div>
                  <div style={styles.statContent}>
                    <div style={styles.statLabel}>Project Owner</div>
                    <div style={styles.statValue}>
                      {loadingOwner ? (
                        <span style={{ color: '#9ca3af', fontSize: '13px' }}>Loading...</span>
                      ) : ownerInfo?.username || ownerInfo?.full_name || ownerInfo?.email?.split('@')[0] || 
                        project.owner?.username || project.owner?.full_name || project.users?.username || 
                        'Owner Info Unavailable'}
                    </div>
                  </div>
                </div>
              )}

              <div style={styles.statCard}>
                <div style={styles.statIcon}>
                  <Users size={20} style={{ color: '#10b981' }} />
                </div>
                <div style={styles.statContent}>
                  <div style={styles.statLabel}>Team Size</div>
                  <div style={styles.statValue}>
                    {project.current_members || 0}/{project.maximum_members}
                  </div>
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statIcon}>
                  <TrendingUp size={20} style={{ color: '#f59e0b' }} />
                </div>
                <div style={styles.statContent}>
                  <div style={styles.statLabel}>Difficulty</div>
                  <div style={styles.statValue}>
                    {project.difficulty_level}
                  </div>
                </div>
              </div>

              {project.deadline && (
                <div style={styles.statCard}>
                  <div style={styles.statIcon}>
                    <Calendar size={20} style={{ color: '#ef4444' }} />
                  </div>
                  <div style={styles.statContent}>
                    <div style={styles.statLabel}>Deadline</div>
                    <div style={styles.statValue}>
                      {formatDate(project.deadline)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Technologies Section */}
            {project.project_languages && project.project_languages.length > 0 && (
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>
                  <Code size={18} />
                  Technologies & Languages
                </h3>
                <div style={styles.techGrid}>
                  {(project.project_languages || []).map((lang, index) => (
                    <div key={index} style={styles.techTag}>
                      {lang.programming_languages?.name || lang.name || 'Unknown'}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Topics Section */}
            {project.project_topics && project.project_topics.length > 0 && (
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>
                  <Target size={18} />
                  Project Topics
                </h3>
                <div style={styles.techGrid}>
                  {(project.project_topics || []).map((topic, index) => (
                    <div key={index} style={styles.topicTag}>
                      {topic.topics?.name || topic.name || 'Unknown'}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Match Insights Section */}
            {mf && Object.keys(mf).length > 0 && (
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>
                  <Sparkles size={18} />
                  Why This Matches You
                </h3>
                
                <div style={styles.insightsGrid}>
                  {mf.languageFit && (
                    <div style={styles.insightCard}>
                      <div style={styles.insightHeader}>
                        <Code size={16} />
                        <span>Language Match</span>
                      </div>
                      <div style={styles.insightValue}>
                        {mf.languageFit.coverage}% Compatible
                      </div>
                      <div style={styles.insightDetail}>
                        {(mf.languageFit.matches || []).map(
                          m => m.programming_languages?.name || m.name || 'Unknown'
                        ).join(', ')}
                      </div>
                    </div>
                  )}

                  {mf.topicCoverage && mf.topicCoverage.matches?.length > 0 && (
                    <div style={styles.insightCard}>
                      <div style={styles.insightHeader}>
                        <Target size={16} />
                        <span>Topic Alignment</span>
                      </div>
                      <div style={styles.insightValue}>
                        {mf.topicCoverage.matches.length} Matches
                      </div>
                      <div style={styles.insightDetail}>
                        {(mf.topicCoverage.matches || []).map(
                          topic => topic?.name || topic?.topics?.name || 'Unknown'
                        ).join(', ')}
                      </div>
                    </div>
                  )}

                  {mf.difficultyAlignment && (
                    <div style={styles.insightCard}>
                      <div style={styles.insightHeader}>
                        <TrendingUp size={16} />
                        <span>Skill Level</span>
                      </div>
                      <div style={styles.insightValue}>
                        Good fit for your experience
                      </div>
                      <div style={styles.insightDetail}>
                        Your programming experience: {mf.difficultyAlignment.userExperience || 'Not set'} years
                      </div>
                    </div>
                  )}
                </div>

                {/* Enhanced Suggestions with Retake Buttons */}
                {parsedSuggestions.length > 0 && (
                  <div style={styles.suggestionsBox}>
                    <div style={styles.suggestionsHeader}>
                      <Sparkles size={16} />
                      <span style={styles.suggestionsTitle}>To boost your match score:</span>
                    </div>
                    <div style={styles.suggestionsList}>
                      {parsedSuggestions.map((suggestion, idx) => (
                        <div key={idx} style={styles.suggestionItem}>
                          <div style={styles.suggestionText}>
                            {suggestion.text}
                          </div>
                          {suggestion.isRetakeable && suggestion.languageName && (
                            <button
                              style={styles.retakeButton}
                              onClick={() => handleRetakeAssessment(suggestion.languageName)}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              <RefreshCw size={14} />
                              Retake Now
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {/* Profile Link */}
                    <button
                      style={styles.profileLink}
                      onClick={handleGoToProfile}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#60a5fa';
                        e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#93c5fd';
                        e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                      }}
                    >
                      <User size={14} />
                      Or manage all languages in your profile
                      <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            <button style={styles.cancelButton} onClick={onClose}>
              Close
            </button>
            <button
              style={{
                ...styles.joinButton,
                ...(isLocked ? styles.joinButtonLocked : {}),
                ...(isJoining ? styles.joinButtonDisabled : {})
              }}
              onClick={handleJoinClick}
              disabled={isLocked || isJoining}
            >
              {isLocked ? (
                <>
                  <Lock size={18} />
                  Locked - Improve Match Score
                </>
              ) : isJoining ? (
                <>
                  <div className="spinner" style={styles.spinner} />
                  Joining...
                </>
              ) : (
                <>
                  <Users size={18} />
                  Join Project
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* PostAssessment Modal */}
      {showPostAssessmentModal && selectedLanguageForAssessment && (
        <PostAssessmentModal
          isOpen={showPostAssessmentModal}
          onClose={() => {
            setShowPostAssessmentModal(false);
            setSelectedLanguageForAssessment(null);
          }}
          language={selectedLanguageForAssessment}
          currentProficiency={selectedLanguageForAssessment.currentProficiency}
          onAssessmentComplete={handleAssessmentComplete}
        />
      )}

      {/* Assessment Result Modal */}
      {showResultModal && assessmentResult && selectedLanguageForAssessment && (
        <PostAssessmentResultModal
          isOpen={showResultModal}
          onClose={() => {
            setShowResultModal(false);
            setSelectedLanguageForAssessment(null);
            setAssessmentResult(null);
          }}
          assessmentResult={assessmentResult}
          language={selectedLanguageForAssessment}
          currentProficiency={selectedLanguageForAssessment.currentProficiency}
          onReturnHome={handleReturnFromAssessment}
        />
      )}
    </>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '20px',
    overflowY: 'auto'
  },
  modal: {
    backgroundColor: '#1a1c20',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '900px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    overflow: 'hidden'
  },
  header: {
    padding: '24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.05))'
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px'
  },
  titleSection: {
    flex: 1
  },
  title: {
    margin: '0 0 12px 0',
    fontSize: '24px',
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: '1.3'
  },
  badges: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  badge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#d1d5db',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    transition: 'all 0.2s'
  },
  content: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1
  },
  section: {
    marginBottom: '24px'
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: '12px'
  },
  description: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#d1d5db',
    margin: 0
  },
  fullDescription: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#d1d5db'
  },
  paragraph: {
    marginBottom: '12px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
    marginBottom: '24px'
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  statIcon: {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: '8px'
  },
  statContent: {
    flex: 1
  },
  statLabel: {
    fontSize: '12px',
    color: '#9ca3af',
    marginBottom: '4px'
  },
  statValue: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#ffffff'
  },
  techGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  },
  techTag: {
    padding: '6px 14px',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: '#60a5fa',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '500',
    border: '1px solid rgba(59, 130, 246, 0.3)'
  },
  topicTag: {
    padding: '6px 14px',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    color: '#34d399',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '500',
    border: '1px solid rgba(16, 185, 129, 0.3)'
  },
  insightsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '12px',
    marginBottom: '16px'
  },
  insightCard: {
    padding: '16px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  insightHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#9ca3af',
    fontSize: '13px',
    marginBottom: '8px'
  },
  insightValue: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: '4px'
  },
  insightDetail: {
    fontSize: '12px',
    color: '#6b7280'
  },
  suggestionsBox: {
    padding: '20px',
    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)',
    borderRadius: '12px',
    border: '1px solid rgba(251, 191, 36, 0.3)'
  },
  suggestionsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px'
  },
  suggestionsTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#fbbf24'
  },
  suggestionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '16px'
  },
  suggestionItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '12px',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
    border: '1px solid rgba(251, 191, 36, 0.2)'
  },
  suggestionText: {
    flex: 1,
    fontSize: '13px',
    color: '#d1d5db',
    lineHeight: '1.5'
  },
  retakeButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    background: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '6px',
    color: '#10b981',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    flexShrink: 0
  },
  profileLink: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '10px',
    background: 'transparent',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: '8px',
    color: '#93c5fd',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '4px'
  },
  footer: {
    padding: '20px 24px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    gap: '12px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)'
  },
  cancelButton: {
    flex: 1,
    padding: '12px',
    backgroundColor: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    color: '#d1d5db',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  joinButton: {
    flex: 2,
    padding: '12px',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s'
  },
  joinButtonLocked: {
    backgroundColor: '#6b7280',
    cursor: 'not-allowed',
    opacity: 0.6
  },
  joinButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed'
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  }
};

export default ProjectDetailModal;