// frontend/src/components/PreAssessmentModal.js
import React, { useState, useEffect } from 'react';
import ChallengeAPI from '../services/challengeAPI';
import { 
  Code2, 
  Clock, 
  AlertTriangle, 
  Lightbulb, 
  ChevronDown, 
  ChevronUp, 
  Target,
  Shield,
  Zap,
  Play,
  Send,
  X,
  Radio,
  CheckCircle
} from 'lucide-react';

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

      console.log('📝 Submitting assessment:', {
        challenge_id: challenge.id,
        programming_language_id: language.language_id,
        code_length: submittedCode.length
      });

      const response = await ChallengeAPI.submitSimpleChallenge(attemptData);

      console.log('📦 Assessment response:', response);

      if (response.success) {
        const result = response.attempt || response.data;
        
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

  const getTimeColor = () => {
    if (timeRemaining <= 60) return '#ef4444';
    if (timeRemaining <= 180) return '#f59e0b';
    return '#3b82f6';
  };

  const keyframes = `
    @keyframes scanLine {
      0% { transform: translateY(-100%); opacity: 0; }
      50% { opacity: 1; }
      100% { transform: translateY(100%); opacity: 0; }
    }
    
    @keyframes radarPulse {
      0% { transform: scale(0.8); opacity: 0.8; }
      100% { transform: scale(1.5); opacity: 0; }
    }
    
    @keyframes hexPulse {
      0%, 100% { 
        filter: drop-shadow(0 0 15px rgba(59, 130, 246, 0.4));
      }
      50% { 
        filter: drop-shadow(0 0 25px rgba(59, 130, 246, 0.7));
      }
    }
    
    @keyframes borderGlow {
      0%, 100% { 
        box-shadow: inset 0 0 20px rgba(59, 130, 246, 0.05), 
                    0 0 20px rgba(59, 130, 246, 0.1);
      }
      50% { 
        box-shadow: inset 0 0 30px rgba(59, 130, 246, 0.1), 
                    0 0 40px rgba(59, 130, 246, 0.2);
      }
    }
    
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    
    @keyframes pulseDot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.8); }
    }
    
    @keyframes timerPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    
    @keyframes warningShake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;

  const styles = {
   overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '2rem',  // Changed from '1rem' for more breathing room
    backdropFilter: 'blur(4px)'
  },
    modal: {
      position: 'relative',
      backgroundColor: '#0f1116',
      borderRadius: '20px',
      width: '95vw',  // Changed from '100%'
      maxWidth: '950px',
      minWidth: '320px',  // Added minimum width
      maxHeight: '90vh',
      overflow: 'hidden',
      border: '1px solid rgba(59, 130, 246, 0.2)',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)'  // Added for better visibility
    },
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
      backgroundSize: '30px 30px',
      pointerEvents: 'none',
      zIndex: 0
    },
    cornerAccent: {
      position: 'absolute',
      width: '60px',
      height: '60px',
      pointerEvents: 'none',
      zIndex: 1
    },
    scanLine: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '2px',
      background: 'linear-gradient(90deg, transparent, #3b82f6, #8b5cf6, transparent)',
      animation: 'scanLine 3s ease-in-out infinite',
      boxShadow: '0 0 15px #3b82f6',
      zIndex: 2
    },
    header: {
      position: 'relative',
      padding: '1.5rem 2rem',
      borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.1) 0%, transparent 100%)',
      zIndex: 3
    },
    headerContent: {
      display: 'flex',
      alignItems: 'center',
      gap: '1rem'
    },
    hexagonBadge: {
      position: 'relative',
      width: '50px',
      height: '58px',
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
    titleContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    },
    statusBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 10px',
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
      border: '1px solid rgba(16, 185, 129, 0.3)',
      borderRadius: '12px',
      fontSize: '10px',
      fontWeight: '600',
      color: '#10b981',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      width: 'fit-content'
    },
    title: {
      fontSize: '1.5rem',
      fontWeight: '800',
      color: 'white',
      margin: 0,
      background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text'
    },
    subtitle: {
      fontSize: '0.875rem',
      color: '#64748b',
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    languageBadge: {
      padding: '2px 8px',
      backgroundColor: 'rgba(139, 92, 246, 0.2)',
      border: '1px solid rgba(139, 92, 246, 0.3)',
      borderRadius: '6px',
      fontSize: '12px',
      color: '#a78bfa',
      fontWeight: '600'
    },
    closeButton: {
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      color: '#6b7280',
      cursor: 'pointer',
      padding: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '10px',
      transition: 'all 0.3s ease'
    },
    scrollContainer: {
      maxHeight: 'calc(90vh - 100px)',
      overflowY: 'auto',
      position: 'relative',
      zIndex: 3
    },
    content: {
      padding: '1.5rem 2rem',
      position: 'relative'
    },
    timerSection: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '1rem 1.25rem',
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(7, 11, 20, 0.9) 100%)',
      borderRadius: '14px',
      marginBottom: '1.5rem',
      border: '1px solid rgba(59, 130, 246, 0.2)',
      animation: 'borderGlow 4s ease-in-out infinite'
    },
    timerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    timerIconContainer: {
      width: '44px',
      height: '44px',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid'
    },
    timerText: {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px'
    },
    timerLabel: {
      fontSize: '11px',
      color: '#64748b',
      textTransform: 'uppercase',
      letterSpacing: '1px'
    },
    timerValue: {
      fontSize: '1.5rem',
      fontWeight: '700',
      fontFamily: 'monospace',
      letterSpacing: '2px'
    },
    timerWarning: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 12px',
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      borderRadius: '8px',
      color: '#ef4444',
      fontSize: '12px',
      fontWeight: '600',
      animation: 'timerPulse 1s ease-in-out infinite'
    },
    warningBanner: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '1rem 1.25rem',
      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(185, 28, 28, 0.05) 100%)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      borderRadius: '12px',
      marginBottom: '1.5rem',
      animation: 'warningShake 0.5s ease-in-out, fadeIn 0.3s ease-out'
    },
    warningIcon: {
      width: '40px',
      height: '40px',
      borderRadius: '10px',
      backgroundColor: 'rgba(239, 68, 68, 0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    },
    warningContent: {
      flex: 1
    },
    warningTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#fca5a5',
      marginBottom: '2px'
    },
    warningText: {
      fontSize: '12px',
      color: '#f87171'
    },
    errorBanner: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '1rem 1.25rem',
      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(185, 28, 28, 0.05) 100%)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      borderRadius: '12px',
      marginBottom: '1.5rem',
      color: '#fca5a5',
      fontSize: '14px'
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
      letterSpacing: '0.5px'
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
    hintsButton: {
      width: '100%',
      background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)',
      border: '1px solid rgba(251, 191, 36, 0.25)',
      color: '#fbbf24',
      padding: '12px 16px',
      borderRadius: '12px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'all 0.3s ease',
      marginBottom: '10px'
    },
    hintsButtonLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    hintsContent: {
      padding: '1rem 1.25rem',
      background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.08) 0%, rgba(245, 158, 11, 0.03) 100%)',
      borderRadius: '12px',
      border: '1px solid rgba(251, 191, 36, 0.15)',
      color: '#fcd34d',
      fontSize: '13px',
      lineHeight: '1.6',
      animation: 'fadeIn 0.3s ease-out'
    },
    codeEditorContainer: {
      position: 'relative',
      borderRadius: '14px',
      overflow: 'hidden',
      border: '1px solid rgba(59, 130, 246, 0.2)'
    },
    codeEditorHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 16px',
      backgroundColor: 'rgba(15, 23, 42, 0.8)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
    },
    codeEditorDots: {
      display: 'flex',
      gap: '6px'
    },
    codeEditorDot: {
      width: '10px',
      height: '10px',
      borderRadius: '50%'
    },
    codeEditorTitle: {
      fontSize: '12px',
      color: '#64748b',
      fontFamily: 'monospace'
    },
    codeEditor: {
      width: '100%',
      minHeight: '320px',
      padding: '1.25rem',
      backgroundColor: '#080a0f',
      border: 'none',
      color: '#e2e8f0',
      fontSize: '14px',
      fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
      resize: 'vertical',
      lineHeight: '1.6',
      outline: 'none'
    },
    actionButtons: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      paddingTop: '8px'
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
      color: '#94a3b8',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    },
    startButton: {
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      color: 'white',
      boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)'
    },
    buttonGlow: {
      position: 'absolute',
      top: 0,
      left: '-100%',
      width: '100%',
      height: '100%',
      background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
      animation: 'shimmer 2s ease-in-out infinite'
    },
    
    // Loading State Styles
    loadingContainer: {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4rem 2rem',
      minHeight: '400px'
    },
    radarContainer: {
      position: 'relative',
      width: '120px',
      height: '120px',
      marginBottom: '28px'
    },
    radarRing: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: '100%',
      height: '100%',
      transform: 'translate(-50%, -50%)',
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
      transform: 'translate(-50%, -50%)',
      borderRadius: '50%',
      border: '2px solid rgba(59, 130, 246, 0.3)',
      animation: 'radarPulse 2s ease-out infinite',
      animationDelay: '1s'
    },
    radarCenter: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '60px',
      height: '60px',
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '2px solid rgba(59, 130, 246, 0.5)'
    },
    loadingBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      backgroundColor: 'rgba(59, 130, 246, 0.15)',
      border: '1px solid rgba(59, 130, 246, 0.3)',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
      color: '#3b82f6',
      textTransform: 'uppercase',
      letterSpacing: '2px',
      marginBottom: '12px'
    },
    pulseDot: {
      width: '8px',
      height: '8px',
      backgroundColor: '#3b82f6',
      borderRadius: '50%',
      animation: 'pulseDot 1s ease-in-out infinite'
    },
    loadingTitle: {
      fontSize: '24px',
      fontWeight: '700',
      color: 'white',
      marginBottom: '8px'
    },
    loadingText: {
      color: '#64748b',
      fontSize: '14px'
    }
  };

  if (loading) {
    return (
      <>
        <style>{keyframes}</style>
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.gridOverlay} />
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
            
            <div style={styles.loadingContainer}>
              <div style={styles.radarContainer}>
                <div style={styles.radarRing} />
                <div style={styles.radarRing2} />
                <div style={styles.radarCenter}>
                  <Code2 size={28} color="#3b82f6" />
                </div>
              </div>
              <div style={styles.loadingBadge}>
                <div style={styles.pulseDot} />
                LOADING
              </div>
              <h3 style={styles.loadingTitle}>Preparing Assessment</h3>
              <p style={styles.loadingText}>Initializing challenge parameters...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{keyframes}</style>
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div style={styles.gridOverlay} />
          {startedAt && <div style={styles.scanLine} />}
          
          {/* Corner Accents */}
          <svg style={{...styles.cornerAccent, top: 0, left: 0}} viewBox="0 0 100 100">
            <path d="M0 40 L0 0 L40 0" fill="none" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="2"/>
            <circle cx="0" cy="0" r="3" fill="#3b82f6" opacity="0.6"/>
          </svg>
          <svg style={{...styles.cornerAccent, top: 0, right: 0, transform: 'scaleX(-1)'}} viewBox="0 0 100 100">
            <path d="M0 40 L0 0 L40 0" fill="none" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="2"/>
            <circle cx="0" cy="0" r="3" fill="#3b82f6" opacity="0.6"/>
          </svg>
          <svg style={{...styles.cornerAccent, bottom: 0, left: 0, transform: 'scaleY(-1)'}} viewBox="0 0 100 100">
            <path d="M0 40 L0 0 L40 0" fill="none" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="2"/>
            <circle cx="0" cy="0" r="3" fill="#3b82f6" opacity="0.6"/>
          </svg>
          <svg style={{...styles.cornerAccent, bottom: 0, right: 0, transform: 'scale(-1)'}} viewBox="0 0 100 100">
            <path d="M0 40 L0 0 L40 0" fill="none" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="2"/>
            <circle cx="0" cy="0" r="3" fill="#3b82f6" opacity="0.6"/>
          </svg>

          {/* Header */}
          <div style={styles.header}>
            <div style={styles.headerContent}>
              {/* Hexagon Badge */}
              <div style={styles.hexagonBadge}>
                <svg style={styles.hexagonSvg} viewBox="0 0 50 58">
                  <defs>
                    <linearGradient id="preAssessHexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8"/>
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8"/>
                    </linearGradient>
                  </defs>
                  <polygon 
                    points="25,1 48,15 48,43 25,57 2,43 2,15" 
                    fill="rgba(15, 23, 42, 0.9)"
                    stroke="url(#preAssessHexGrad)"
                    strokeWidth="2"
                  />
                </svg>
                <div style={styles.hexagonContent}>
                  <Target size={22} color="#3b82f6" />
                </div>
              </div>
              
              <div style={styles.titleContainer}>
                <div style={styles.statusBadge}>
                  <Radio size={10} />
                  {startedAt ? 'IN PROGRESS' : 'READY'}
                </div>
                <h2 style={styles.title}>Pre-Assessment Challenge</h2>
                <p style={styles.subtitle}>
                  <span style={styles.languageBadge}>{language.name}</span>
                  Skill Evaluation
                </p>
              </div>
            </div>
            
            <button 
              onClick={onClose} 
              style={styles.closeButton}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                e.currentTarget.style.color = '#ef4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = '#6b7280';
              }}
            >
              <X size={20} />
            </button>
          </div>

          <div style={styles.scrollContainer}>
            <div style={styles.content}>
              {/* Error Banner */}
              {error && (
                <div style={styles.errorBanner}>
                  <AlertTriangle size={20} />
                  {error}
                </div>
              )}

              {/* Tab Switch Warning */}
              {showTabWarning && (
                <div style={styles.warningBanner}>
                  <div style={styles.warningIcon}>
                    <AlertTriangle size={20} color="#ef4444" />
                  </div>
                  <div style={styles.warningContent}>
                    <div style={styles.warningTitle}>Tab Switch Detected!</div>
                    <div style={styles.warningText}>
                      {MAX_TAB_SWITCHES - tabSwitchCount} warning(s) remaining before auto-fail
                    </div>
                  </div>
                </div>
              )}

              {/* Timer Section */}
              {startedAt && timeRemaining !== null && (
                <div style={styles.timerSection}>
                  <div style={styles.timerLeft}>
                    <div style={{
                      ...styles.timerIconContainer,
                      backgroundColor: `${getTimeColor()}15`,
                      borderColor: `${getTimeColor()}40`
                    }}>
                      <Clock size={22} color={getTimeColor()} />
                    </div>
                    <div style={styles.timerText}>
                      <span style={styles.timerLabel}>Time Remaining</span>
                      <span style={{
                        ...styles.timerValue,
                        color: getTimeColor()
                      }}>
                        {formatTime(timeRemaining)}
                      </span>
                    </div>
                  </div>
                  {timeRemaining <= 60 && (
                    <div style={styles.timerWarning}>
                      <Zap size={14} />
                      Hurry up!
                    </div>
                  )}
                </div>
              )}

              {/* Challenge Description */}
              <div style={styles.section}>
                <div style={styles.sectionHeader}>
                  <div style={styles.sectionIcon}>
                    <Code2 size={16} color="#3b82f6" />
                  </div>
                  <h3 style={styles.sectionTitle}>Challenge Description</h3>
                </div>
                <div style={styles.description}>
                  {challenge?.description || 'No description available'}
                </div>
              </div>

              {/* Hints Section */}
              {challenge?.test_cases && (
                <div style={styles.section}>
                  <button
                    onClick={() => setShowHints(!showHints)}
                    style={styles.hintsButton}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.1) 100%)';
                      e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)';
                      e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.25)';
                    }}
                  >
                    <div style={styles.hintsButtonLeft}>
                      <Lightbulb size={18} />
                      View Hints
                    </div>
                    {showHints ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  
                  {showHints && (
                    <div style={styles.hintsContent}>
                      <p><strong>💡 Hint:</strong> Make sure your solution handles edge cases and follows best practices.</p>
                      {challenge.test_cases && typeof challenge.test_cases === 'string' && (
                        <p style={{ marginTop: '8px' }}>Test cases are available to help guide your solution.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Code Editor */}
              <div style={styles.section}>
                <div style={styles.sectionHeader}>
                  <div style={styles.sectionIcon}>
                    <Code2 size={16} color="#3b82f6" />
                  </div>
                  <h3 style={styles.sectionTitle}>Your Solution</h3>
                </div>
                <div style={styles.codeEditorContainer}>
                  <div style={styles.codeEditorHeader}>
                    <div style={styles.codeEditorDots}>
                      <div style={{...styles.codeEditorDot, backgroundColor: '#ef4444'}} />
                      <div style={{...styles.codeEditorDot, backgroundColor: '#f59e0b'}} />
                      <div style={{...styles.codeEditorDot, backgroundColor: '#22c55e'}} />
                    </div>
                    <span style={styles.codeEditorTitle}>{language.name.toLowerCase()}_solution.{language.name === 'Python' ? 'py' : language.name === 'JavaScript' ? 'js' : 'txt'}</span>
                  </div>
                  <textarea
                    value={submittedCode}
                    onChange={(e) => setSubmittedCode(e.target.value)}
                    style={{
                      ...styles.codeEditor,
                      cursor: !startedAt || isSubmitting ? 'not-allowed' : 'text',
                      opacity: !startedAt || isSubmitting ? 0.5 : 1
                    }}
                    placeholder={!startedAt ? "Click 'Start Assessment' to begin coding..." : "Write your solution here..."}
                    disabled={!startedAt || isSubmitting}
                    spellCheck={false}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={styles.actionButtons}>
                {!startedAt ? (
                  <button
                    onClick={handleStartChallenge}
                    style={{ ...styles.button, ...styles.startButton }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 30px rgba(16, 185, 129, 0.4)';
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
                      disabled={isSubmitting}
                      style={{ 
                        ...styles.button, 
                        ...styles.primaryButton,
                        opacity: isSubmitting ? 0.7 : 1,
                        cursor: isSubmitting ? 'not-allowed' : 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSubmitting) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 8px 30px rgba(59, 130, 246, 0.5)';
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
                          <div style={styles.pulseDot} />
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
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PreAssessmentModal;