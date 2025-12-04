// frontend/src/components/PreAssessmentModal.js
import React, { useState, useEffect, useRef } from 'react';
import ChallengeAPI from '../services/challengeAPI';
import { Code2, Clock, AlertTriangle, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';

const PreAssessmentModal = ({ language, onComplete, onClose }) => {
  const [challenge, setChallenge] = useState(null);
  const [submittedCode, setSubmittedCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showHints, setShowHints] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const MAX_TAB_SWITCHES = 3;

  useEffect(() => {
    loadChallenge();
  }, [language]);

  const loadChallenge = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get adaptive challenge for this language
      const response = await ChallengeAPI.getNextChallenge({ programming_language_id: language.language_id });
      
      if (response.success && response.data) {
        setChallenge(response.data);
        setSubmittedCode(response.data.starter_code || '');
      } else {
        throw new Error('No challenge available for this language');
      }
    } catch (err) {
      console.error('Error loading challenge:', err);
      setError('Failed to load challenge. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartChallenge = () => {
    const now = new Date();
    setStartedAt(now);
    if (challenge?.time_limit_minutes) {
      setTimeRemaining(challenge.time_limit_minutes * 60);
    }
  };

  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || !startedAt) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, startedAt]);

  // Tab switch detection
  useEffect(() => {
    if (!startedAt) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => {
          const newCount = prev + 1;
          if (newCount >= MAX_TAB_SWITCHES) {
            handleAutoFail();
          } else {
            setShowTabWarning(true);
            setTimeout(() => setShowTabWarning(false), 5000);
          }
          return newCount;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [startedAt]);

  const handleAutoFail = () => {
    onComplete({
      languageId: language.language_id,
      passed: false,
      score: 0,
      proficiencyLevel: 'beginner',
      feedback: 'Assessment failed due to excessive tab switching.'
    });
  };

  const handleAutoSubmit = () => {
    if (!isSubmitting) {
      handleSubmitChallenge();
    }
  };

  const handleSubmitChallenge = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const attemptData = {
        challenge_id: challenge.id,
        submitted_code: submittedCode,
        programming_language_id: language.language_id
      };

      const response = await ChallengeAPI.submitSimpleChallenge(attemptData);

      if (response.success) {
        const result = response.data;
        
        // Determine proficiency level based on score
        let proficiencyLevel = 'beginner';
        if (result.score >= 90) proficiencyLevel = 'expert';
        else if (result.score >= 75) proficiencyLevel = 'advanced';
        else if (result.score >= 60) proficiencyLevel = 'intermediate';

        onComplete({
          languageId: language.language_id,
          passed: result.passed || result.score >= 50,
          score: result.score,
          proficiencyLevel,
          feedback: result.feedback || 'Assessment complete'
        });
      } else {
        throw new Error(response.message || 'Failed to submit assessment');
      }
    } catch (err) {
      console.error('Error submitting assessment:', err);
      setError('Failed to submit assessment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    },
    modal: {
      backgroundColor: '#1a1d29',
      borderRadius: '12px',
      maxWidth: '900px',
      width: '100%',
      maxHeight: '90vh',
      overflow: 'auto',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    },
    header: {
      padding: '2rem',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    title: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      color: 'white',
      marginBottom: '0.5rem'
    },
    subtitle: {
      color: '#9ca3af',
      fontSize: '0.875rem'
    },
    closeButton: {
      background: 'rgba(255, 255, 255, 0.1)',
      border: 'none',
      color: 'white',
      fontSize: '1.5rem',
      width: '36px',
      height: '36px',
      borderRadius: '6px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s'
    },
    content: {
      padding: '2rem'
    },
    infoGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '1rem',
      marginBottom: '2rem'
    },
    infoCard: {
      padding: '1rem',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '8px',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    },
    infoLabel: {
      fontSize: '0.75rem',
      color: '#9ca3af',
      textTransform: 'uppercase',
      marginBottom: '0.25rem'
    },
    infoValue: {
      fontSize: '1.25rem',
      fontWeight: 'bold',
      color: 'white'
    },
    section: {
      marginBottom: '2rem'
    },
    sectionTitle: {
      fontSize: '1.125rem',
      fontWeight: '600',
      color: 'white',
      marginBottom: '1rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    description: {
      color: '#d1d5db',
      lineHeight: '1.6',
      marginBottom: '1rem'
    },
    codeEditor: {
      width: '100%',
      minHeight: '300px',
      padding: '1rem',
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '8px',
      color: 'white',
      fontFamily: 'monospace',
      fontSize: '0.875rem',
      resize: 'vertical'
    },
    hintSection: {
      marginBottom: '2rem'
    },
    hintToggle: {
      background: 'transparent',
      border: 'none',
      color: '#60a5fa',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontSize: '0.875rem',
      fontWeight: '600',
      marginBottom: '1rem'
    },
    hintContent: {
      padding: '1rem',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      border: '1px solid rgba(59, 130, 246, 0.2)',
      borderRadius: '8px',
      color: '#d1d5db'
    },
    actionButtons: {
      display: 'flex',
      gap: '1rem',
      justifyContent: 'flex-end'
    },
    button: {
      padding: '0.75rem 2rem',
      borderRadius: '8px',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
      border: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    primaryButton: {
      background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
      color: 'white'
    },
    secondaryButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      color: 'white'
    },
    warningBanner: {
      backgroundColor: 'rgba(239, 68, 68, 0.2)',
      border: '1px solid rgba(239, 68, 68, 0.4)',
      borderRadius: '8px',
      padding: '1rem',
      marginBottom: '1rem',
      color: '#fca5a5',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    }
  };

  if (loading) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div style={{ ...styles.content, textAlign: 'center', padding: '3rem' }}>
            <div className="global-loading-spinner" style={{ margin: '0 auto 1rem' }} />
            <p style={{ color: '#9ca3af' }}>Loading challenge...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div style={{ ...styles.content, textAlign: 'center', padding: '3rem' }}>
            <AlertTriangle size={48} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ color: 'white', marginBottom: '1rem' }}>Error Loading Challenge</h3>
            <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>{error || 'Challenge not available'}</p>
            <button onClick={onClose} style={{ ...styles.button, ...styles.secondaryButton }}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getDifficultyColor = (level) => {
    const colors = {
      easy: '#10b981',
      medium: '#f59e0b',
      hard: '#ef4444',
      expert: '#8b5cf6'
    };
    return colors[level] || '#9ca3af';
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Pre-Assessment: {language.name}</h2>
            <p style={styles.subtitle}>Complete this challenge to assess your skill level</p>
          </div>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>

        <div style={styles.content}>
          {/* Tab Warning */}
          {showTabWarning && (
            <div style={styles.warningBanner}>
              <AlertTriangle size={20} />
              <div>
                <strong>Warning:</strong> Tab switching detected! ({tabSwitchCount}/{MAX_TAB_SWITCHES})
                <br />
                <small>Further tab switches will result in automatic failure.</small>
              </div>
            </div>
          )}

          {/* Info Cards */}
          <div style={styles.infoGrid}>
            <div style={styles.infoCard}>
              <div style={styles.infoLabel}>Difficulty</div>
              <div style={{ ...styles.infoValue, color: getDifficultyColor(challenge.difficulty_level) }}>
                {challenge.difficulty_level?.toUpperCase()}
              </div>
            </div>
            <div style={styles.infoCard}>
              <div style={styles.infoLabel}>Time Limit</div>
              <div style={styles.infoValue}>
                {startedAt ? (
                  <span style={{ color: timeRemaining < 60 ? '#ef4444' : '#60a5fa' }}>
                    <Clock size={20} style={{ display: 'inline', marginRight: '0.5rem' }} />
                    {formatTime(timeRemaining)}
                  </span>
                ) : (
                  `${challenge.time_limit_minutes} min`
                )}
              </div>
            </div>
            <div style={styles.infoCard}>
              <div style={styles.infoLabel}>Language</div>
              <div style={styles.infoValue}>{language.name}</div>
            </div>
          </div>

          {/* Challenge Description */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              <Code2 size={20} />
              Challenge: {challenge.title}
            </h3>
            <p style={styles.description}>{challenge.description}</p>
          </div>

          {/* Hints */}
          <div style={styles.hintSection}>
            <button onClick={() => setShowHints(!showHints)} style={styles.hintToggle}>
              <Lightbulb size={16} />
              {showHints ? 'Hide' : 'Show'} Hints
              {showHints ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showHints && (
              <div style={styles.hintContent}>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li>Read the requirements carefully</li>
                  <li>Test your solution with the provided examples</li>
                  <li>Use appropriate variable names</li>
                  <li>Add comments to explain your approach</li>
                  <li>Make sure your code handles all edge cases</li>
                </ul>
              </div>
            )}
          </div>

          {/* Code Editor */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              <Code2 size={20} />
              Your Solution
            </h3>
            <textarea
              value={submittedCode}
              onChange={(e) => setSubmittedCode(e.target.value)}
              style={{
                ...styles.codeEditor,
                cursor: !startedAt || isSubmitting ? 'not-allowed' : 'text',
                opacity: !startedAt || isSubmitting ? 0.6 : 1
              }}
              placeholder={!startedAt ? "Click 'Start Assessment' to begin coding..." : "Write your solution here..."}
              disabled={!startedAt || isSubmitting}
            />
          </div>

          {/* Action Buttons */}
          <div style={styles.actionButtons}>
            {!startedAt ? (
              <button
                onClick={handleStartChallenge}
                style={{ ...styles.button, ...styles.primaryButton }}
              >
                Start Assessment
                <Code2 size={20} />
              </button>
            ) : (
              <>
                <button
                  onClick={onClose}
                  disabled={isSubmitting}
                  style={{ 
                    ...styles.button, 
                    ...styles.secondaryButton,
                    opacity: isSubmitting ? 0.5 : 1
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitChallenge}
                  disabled={isSubmitting}
                  style={{ 
                    ...styles.button, 
                    ...styles.primaryButton,
                    opacity: isSubmitting ? 0.5 : 1
                  }}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Solution'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreAssessmentModal;