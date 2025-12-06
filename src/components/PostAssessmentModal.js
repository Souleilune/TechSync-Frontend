// frontend/src/components/PostAssessmentModal.js
// VERSION WITHOUT MONACO EDITOR - Uses simple textarea instead
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  X, Clock, FileText, Code, Send, Loader, AlertTriangle, 
  Play, TestTube2, CheckCircle, XCircle 
} from 'lucide-react';
import ChallengeAPI from '../services/challengeAPI';

const PostAssessmentModal = ({ 
  isOpen, 
  onClose, 
  language, 
  currentProficiency,
  onAssessmentComplete 
}) => {
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submittedCode, setSubmittedCode] = useState('');
  const [startedAt, setStartedAt] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitRef = useRef(null);
  const textareaRef = useRef(null);

  // Load challenge on mount
  useEffect(() => {
    if (isOpen && language) {
      loadChallenge();
    }
  }, [isOpen, language]);

  // Timer effect
  useEffect(() => {
    if (!startedAt || !challenge?.time_limit_minutes) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const limit = challenge.time_limit_minutes * 60;
      const remaining = Math.max(0, limit - elapsed);
      
      setTimeRemaining(remaining);

      if (remaining === 0 && handleSubmitRef.current) {
        handleSubmitRef.current();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt, challenge]);

 const loadChallenge = async () => {
  try {
    setLoading(true);
    setError('');

    console.log('🔍 Loading challenge for language:', language);

    // ✅ CORRECT - Use getNextChallenge like PreAssessmentModal:
    const response = await ChallengeAPI.getNextChallenge({ 
      programming_language_id: language.id 
    });
    
    console.log('📦 Challenge response:', response);

    // Backend returns: { success: true, data: { challenge: {...}, userRating: ... } }
    if (response.success && response.data && response.data.challenge) {
      const challengeData = response.data.challenge;
      console.log('✅ Challenge loaded:', challengeData);
      
      setChallenge(challengeData);
      setSubmittedCode(challengeData.starter_code || '');
    } else {
      throw new Error('No challenge available for this language');
    }
  } catch (err) {
    console.error('❌ Error loading challenge:', err);
    setError(err.response?.data?.message || err.message || 'Failed to load challenge. Please try again.');
  } finally {
    setLoading(false);
  }
};
  const handleStartChallenge = () => {
    setStartedAt(Date.now());
    if (challenge?.time_limit_minutes) {
      setTimeRemaining(challenge.time_limit_minutes * 60);
    }
    // Focus on textarea after starting
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 100);
  };

  const handleSubmitChallenge = useCallback(async () => {
    if (!submittedCode.trim()) {
      setError('Please enter your solution code');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const timeTaken = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;

      const payload = {
        challenge_id: challenge.id,
        submitted_code: submittedCode,
        language: language.name,
        time_taken: timeTaken
      };

      const response = await ChallengeAPI.submitSimpleChallenge(payload);

      if (response && response.success && response.attempt) {
        // Pass the complete response to parent
        onAssessmentComplete(response);
      } else {
        setError(response?.message || 'Failed to submit solution');
      }
    } catch (err) {
      console.error('Error submitting challenge:', err);
      setError(err.response?.data?.message || 'Failed to submit solution. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [submittedCode, challenge, language, startedAt, onAssessmentComplete]);

  // Keep ref updated
  handleSubmitRef.current = handleSubmitChallenge;

  // Helper function to format time
  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper function for difficulty color
  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'hard': return '#ef4444';
      case 'expert': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  // Handle tab key in textarea
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const value = e.target.value;
      
      // Insert 2 spaces for tab
      e.target.value = value.substring(0, start) + '  ' + value.substring(end);
      e.target.selectionStart = e.target.selectionEnd = start + 2;
      
      // Update state
      setSubmittedCode(e.target.value);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Animated Background Elements */}
        <div style={styles.bgDecor1} />
        <div style={styles.bgDecor2} />

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.headerIcon}>
              <Code size={24} color="#3b82f6" />
            </div>
            <div>
              <h2 style={styles.title}>Skill Assessment</h2>
              <p style={styles.subtitle}>
                {language?.name} • Current Level: {currentProficiency}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              ...styles.closeButton,
              opacity: isSubmitting ? 0.5 : 1,
              cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {loading ? (
            <div style={styles.loadingContainer}>
              <div className="global-loading-spinner" style={{ width: '48px', height: '48px' }}>
                <Loader size={48} />
              </div>
              <p style={styles.loadingText}>Loading your challenge...</p>
            </div>
          ) : error && !challenge ? (
            <div style={styles.errorContainer}>
              <AlertTriangle size={48} color="#fca5a5" />
              <p style={styles.errorText}>{error}</p>
              <button
                onClick={loadChallenge}
                style={{ ...styles.button, ...styles.retryButton }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(59, 130, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(59, 130, 246, 0.3)';
                }}
              >
                Try Again
              </button>
            </div>
          ) : challenge ? (
            <>
              {/* Challenge Info */}
              {!startedAt && (
                <div style={styles.infoGrid}>
                  <div style={styles.infoCard}>
                    <div style={styles.infoLabel}>
                      <FileText size={14} />
                      Difficulty
                    </div>
                    <div style={{ 
                      ...styles.infoValue, 
                      color: getDifficultyColor(challenge.difficulty_level) 
                    }}>
                      {challenge.difficulty_level || 'N/A'}
                    </div>
                  </div>
                  <div style={styles.infoCard}>
                    <div style={styles.infoLabel}>
                      <CheckCircle size={14} />
                      Test Cases
                    </div>
                    <div style={styles.infoValue}>
                      {Array.isArray(challenge.test_cases) 
                        ? challenge.test_cases.length 
                        : JSON.parse(challenge.test_cases || '[]').length}
                    </div>
                  </div>
                  <div style={styles.infoCard}>
                    <div style={styles.infoLabel}>
                      <Clock size={14} />
                      Time Limit
                    </div>
                    <div style={styles.infoValue}>
                      {challenge.time_limit_minutes ? `${challenge.time_limit_minutes} min` : 'No limit'}
                    </div>
                  </div>
                </div>
              )}

              {/* Timer */}
              {startedAt && timeRemaining !== null && (
                <div style={styles.timerContainer}>
                  <div style={styles.timerContent}>
                    <Clock size={18} />
                    <span style={styles.timerLabel}>Time Remaining:</span>
                    <span style={{ 
                      ...styles.timerValue, 
                      color: timeRemaining <= 300 ? '#ef4444' : '#10b981' 
                    }}>
                      {formatTime(timeRemaining)}
                    </span>
                  </div>
                </div>
              )}

              {/* Challenge Description */}
              <div style={styles.section}>
                <div style={styles.sectionHeader}>
                  <div style={styles.sectionIcon}>
                    <FileText size={16} color="#3b82f6" />
                  </div>
                  <h3 style={styles.sectionTitle}>Challenge Description</h3>
                </div>
                <div style={styles.description}>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                    {challenge.description || 'No description available.'}
                  </pre>
                </div>
              </div>

              {/* Test Cases */}
              {challenge.test_cases && (
                <div style={styles.section}>
                  <div style={styles.sectionHeader}>
                    <div style={styles.sectionIcon}>
                      <TestTube2 size={16} color="#3b82f6" />
                    </div>
                    <h3 style={styles.sectionTitle}>Test Cases</h3>
                  </div>
                  <div style={styles.testCasesBox}>
                    <pre style={{ margin: 0, fontSize: '13px', fontFamily: 'Monaco, Consolas, monospace' }}>
                      {typeof challenge.test_cases === 'string'
                        ? challenge.test_cases
                        : JSON.stringify(challenge.test_cases, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Code Editor (Textarea) */}
              {startedAt && (
                <div style={styles.section}>
                  <div style={styles.sectionHeader}>
                    <div style={styles.sectionIcon}>
                      <Code size={16} color="#3b82f6" />
                    </div>
                    <h3 style={styles.sectionTitle}>Your Solution</h3>
                  </div>
                  <div style={styles.editorContainer}>
                    <textarea
                      ref={textareaRef}
                      value={submittedCode}
                      onChange={(e) => setSubmittedCode(e.target.value)}
                      onKeyDown={handleKeyDown}
                      style={styles.textarea}
                      placeholder="Write your code here..."
                      spellCheck="false"
                    />
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div style={styles.errorBanner}>
                  <AlertTriangle size={20} />
                  {error}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Action Buttons */}
        {challenge && (
          <div style={styles.actionButtons}>
            {!startedAt ? (
              <button
                onClick={handleStartChallenge}
                disabled={loading || isSubmitting}
                style={{
                  ...styles.button,
                  ...styles.startButton,
                  ...(loading || isSubmitting ? { opacity: 0.5, cursor: 'not-allowed' } : {})
                }}
                onMouseEnter={(e) => {
                  if (!loading && !isSubmitting) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(16, 185, 129, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(16, 185, 129, 0.3)';
                }}
              >
                <div style={styles.buttonGlow} />
                <Play size={18} />
                Start Assessment
              </button>
            ) : (
              <>
                <button
                  onClick={onClose}
                  disabled={isSubmitting}
                  style={{ 
                    ...styles.button, 
                    ...styles.secondaryButton,
                    opacity: isSubmitting ? 0.5 : 1,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitChallenge}
                  disabled={isSubmitting || !submittedCode.trim()}
                  style={{ 
                    ...styles.button, 
                    ...styles.primaryButton,
                    opacity: (isSubmitting || !submittedCode.trim()) ? 0.5 : 1,
                    cursor: (isSubmitting || !submittedCode.trim()) ? 'not-allowed' : 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting && submittedCode.trim()) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 30px rgba(59, 130, 246, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(59, 130, 246, 0.3)';
                  }}
                >
                  <div style={styles.buttonGlow} />
                  {isSubmitting ? (
                    <>
                      <div style={styles.spinner} />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      Submit Solution
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Styles matching PreAssessmentModal exactly
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    backdropFilter: 'blur(8px)',
    padding: '20px'
  },
  modal: {
    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(7, 11, 20, 0.98) 100%)',
    borderRadius: '24px',
    maxWidth: '900px',
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    overflow: 'hidden',
    position: 'relative',
    zIndex: 2
  },
  bgDecor1: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
    top: '-200px',
    right: '-200px',
    zIndex: 1,
    pointerEvents: 'none'
  },
  bgDecor2: {
    position: 'absolute',
    width: '300px',
    height: '300px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
    bottom: '-150px',
    left: '-150px',
    zIndex: 1,
    pointerEvents: 'none'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '2rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    position: 'relative',
    zIndex: 3
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  headerIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.15) 100%)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: 'white',
    margin: 0,
    letterSpacing: '-0.5px'
  },
  subtitle: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: '4px 0 0 0'
  },
  closeButton: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#94a3b8',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease'
  },
  content: {
    padding: '2rem',
    overflowY: 'auto',
    flex: 1,
    position: 'relative',
    zIndex: 3
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginBottom: '1.5rem'
  },
  infoCard: {
    padding: '1rem',
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(139, 92, 246, 0.05) 100%)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    color: 'white',
  },
  infoLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  infoValue: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#e2e8f0'
  },
  timerContainer: {
    padding: '1rem 1.25rem',
    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.03) 100%)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: '12px',
    marginBottom: '1.5rem'
  },
  timerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '16px',
    color: '#e2e8f0'
  },
  timerLabel: {
    fontWeight: '600'
  },
  timerValue: {
    fontSize: '18px',
    fontWeight: '700'
  },
  section: {
    marginBottom: '1.5rem'
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '12px'
  },
  sectionIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: 0
  },
  description: {
    color: '#94a3b8',
    lineHeight: '1.7',
    padding: '1.25rem',
    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.6) 0%, rgba(7, 11, 20, 0.8) 100%)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    fontSize: '14px'
  },
  testCasesBox: {
    padding: '1rem',
    background: '#0f0f0f',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    overflowX: 'auto'
  },
  editorContainer: {
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  textarea: {
    width: '100%',
    height: '400px',
    padding: '1rem',
    background: '#0f0f0f',
    border: 'none',
    color: '#e2e8f0',
    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
    fontSize: '14px',
    lineHeight: '1.6',
    resize: 'vertical',
    outline: 'none'
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '1rem 1.25rem',
    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(185, 28, 28, 0.05) 100%)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '12px',
    marginTop: '1rem',
    color: '#fca5a5',
    fontSize: '14px'
  },
  actionButtons: {
    display: 'flex',
    gap: '12px',
    padding: '1.5rem 2rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    justifyContent: 'flex-end',
    position: 'relative',
    zIndex: 3
  },
  button: {
    padding: '14px 28px',
    borderRadius: '12px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    transition: 'all 0.3s ease',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    position: 'relative',
    overflow: 'hidden'
  },
  primaryButton: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    color: 'white',
    boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)'
  },
  secondaryButton: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#94a3b8'
  },
  startButton: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)'
  },
  retryButton: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    color: 'white',
    boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)'
  },
  buttonGlow: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 100%)',
    opacity: 0,
    transition: 'opacity 0.3s ease',
    pointerEvents: 'none'
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
    animation: 'spin 0.6s linear infinite'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    padding: '60px'
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: '16px'
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    padding: '60px'
  },
  errorText: {
    color: '#fca5a5',
    fontSize: '16px',
    textAlign: 'center',
    maxWidth: '400px'
  }
};

export default PostAssessmentModal;