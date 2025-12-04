// frontend/src/components/PreAssessmentModal.js
import React, { useState, useEffect } from 'react';
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

      // FIX: Match the backend controller's expected fields
      // Backend expects: challenge_id, submitted_code, and OPTIONAL programming_language_id
      const attemptData = {
        challenge_id: challenge.id,
        submitted_code: submittedCode,
        programming_language_id: language.language_id  // This is correct
      };

      console.log('📝 Submitting assessment:', {
        challenge_id: challenge.id,
        programming_language_id: language.language_id,
        code_length: submittedCode.length
      });

      const response = await ChallengeAPI.submitSimpleChallenge(attemptData);

      console.log('📦 Assessment response:', response);

      if (response.success) {
        // Backend returns: { success, message, attempt, evaluation, award }
        const result = response.attempt || response.data;
        
        // Determine proficiency level based on score
        let proficiencyLevel = 'beginner';
        const score = result.score || (response.evaluation?.score) || 0;
        
        if (score >= 90) proficiencyLevel = 'expert';
        else if (score >= 75) proficiencyLevel = 'advanced';
        else if (score >= 60) proficiencyLevel = 'intermediate';

        onComplete({
          languageId: language.language_id,
          passed: result.status === 'passed' || result.passed || score >= 50,
          score: score,
          proficiencyLevel,
          feedback: result.feedback || response.evaluation?.feedback || 'Assessment complete'
        });
      } else {
        throw new Error(response.message || 'Failed to submit assessment');
      }
    } catch (err) {
      console.error('❌ Error submitting assessment:', err);
      console.error('❌ Error details:', err.response?.data);
      setError(err.response?.data?.message || err.message || 'Failed to submit assessment. Please try again.');
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
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    },
    modal: {
      backgroundColor: '#1a1c20',
      borderRadius: '16px',
      width: '100%',
      maxWidth: '900px',
      maxHeight: '90vh',
      overflow: 'auto',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    },
    header: {
      padding: '1.5rem',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: 'rgba(59, 130, 246, 0.1)'
    },
    headerContent: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem'
    },
    title: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      color: 'white',
      margin: 0
    },
    subtitle: {
      fontSize: '0.875rem',
      color: '#9ca3af',
      margin: '0.25rem 0 0 0'
    },
    closeButton: {
      background: 'transparent',
      border: 'none',
      color: '#9ca3af',
      cursor: 'pointer',
      padding: '0.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '8px',
      transition: 'all 0.2s'
    },
    content: {
      padding: '1.5rem'
    },
    timerSection: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '1rem',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderRadius: '12px',
      marginBottom: '1.5rem',
      border: '1px solid rgba(59, 130, 246, 0.2)'
    },
    timer: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontSize: '1.125rem',
      fontWeight: '600',
      color: '#60a5fa'
    },
    warningBanner: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.75rem 1rem',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      borderRadius: '8px',
      marginBottom: '1rem',
      color: '#fca5a5',
      fontSize: '0.875rem'
    },
    descriptionSection: {
      marginBottom: '1.5rem'
    },
    sectionTitle: {
      fontSize: '1rem',
      fontWeight: '600',
      color: 'white',
      marginBottom: '0.75rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    description: {
      color: '#d1d5db',
      lineHeight: '1.6',
      padding: '1rem',
      backgroundColor: 'rgba(55, 65, 81, 0.3)',
      borderRadius: '8px',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    },
    hintsSection: {
      marginBottom: '1.5rem'
    },
    hintsButton: {
      background: 'transparent',
      border: '1px solid rgba(251, 191, 36, 0.3)',
      color: '#fbbf24',
      padding: '0.5rem 1rem',
      borderRadius: '8px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontSize: '0.875rem',
      fontWeight: '500',
      width: '100%',
      justifyContent: 'space-between',
      transition: 'all 0.2s',
      marginBottom: '0.75rem'
    },
    hintsContent: {
      padding: '1rem',
      backgroundColor: 'rgba(251, 191, 36, 0.1)',
      borderRadius: '8px',
      border: '1px solid rgba(251, 191, 36, 0.2)',
      color: '#fcd34d',
      fontSize: '0.875rem',
      lineHeight: '1.6'
    },
    codeSection: {
      marginBottom: '1.5rem'
    },
    codeEditor: {
      width: '100%',
      minHeight: '300px',
      padding: '1rem',
      backgroundColor: '#0f1116',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '8px',
      color: 'white',
      fontSize: '0.875rem',
      fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
      resize: 'vertical',
      lineHeight: '1.5'
    },
    actionButtons: {
      display: 'flex',
      gap: '1rem',
      justifyContent: 'flex-end'
    },
    button: {
      padding: '0.75rem 2rem',
      borderRadius: '8px',
      border: 'none',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      transition: 'all 0.2s'
    },
    primaryButton: {
      backgroundColor: '#3b82f6',
      color: 'white'
    },
    secondaryButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      color: 'white',
      border: '1px solid rgba(255, 255, 255, 0.2)'
    },
    loadingContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem',
      gap: '1rem'
    },
    loadingText: {
      color: '#9ca3af',
      fontSize: '1.125rem'
    },
    errorBanner: {
      padding: '1rem',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      borderRadius: '8px',
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
          <div style={styles.loadingContainer}>
            <Code2 size={48} color="#3b82f6" />
            <p style={styles.loadingText}>Loading assessment...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <Code2 size={24} color="#3b82f6" />
            <div>
              <h2 style={styles.title}>Pre-Assessment Challenge</h2>
              <p style={styles.subtitle}>{language.name} Assessment</p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeButton}>
            ×
          </button>
        </div>

        <div style={styles.content}>
          {error && (
            <div style={styles.errorBanner}>
              <AlertTriangle size={20} />
              {error}
            </div>
          )}

          {showTabWarning && (
            <div style={styles.warningBanner}>
              <AlertTriangle size={20} />
              Warning: Tab switching detected! ({MAX_TAB_SWITCHES - tabSwitchCount} warnings remaining)
            </div>
          )}

          {startedAt && timeRemaining !== null && (
            <div style={styles.timerSection}>
              <div style={styles.timer}>
                <Clock size={20} />
                Time Remaining: {formatTime(timeRemaining)}
              </div>
              {timeRemaining < 60 && (
                <span style={{ color: '#ef4444', fontSize: '0.875rem', fontWeight: '600' }}>
                  Hurry up!
                </span>
              )}
            </div>
          )}

          <div style={styles.descriptionSection}>
            <h3 style={styles.sectionTitle}>
              <Code2 size={18} />
              Challenge Description
            </h3>
            <div style={styles.description}>
              {challenge?.description || 'No description available'}
            </div>
          </div>

          {challenge?.test_cases && (
            <div style={styles.hintsSection}>
              <button
                onClick={() => setShowHints(!showHints)}
                style={styles.hintsButton}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Lightbulb size={18} />
                  View Hints
                </div>
                {showHints ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              
              {showHints && (
                <div style={styles.hintsContent}>
                  <p><strong>Hint:</strong> Make sure your solution handles edge cases and follows best practices.</p>
                  {challenge.test_cases && typeof challenge.test_cases === 'string' && (
                    <p style={{ marginTop: '0.5rem' }}>Test cases are available to help guide your solution.</p>
                  )}
                </div>
              )}
            </div>
          )}

          <div style={styles.codeSection}>
            <h3 style={styles.sectionTitle}>
              <Code2 size={18} />
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