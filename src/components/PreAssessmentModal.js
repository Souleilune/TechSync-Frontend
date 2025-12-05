// frontend/src/components/PreAssessmentModal.jsx - ENHANCED WITH PROJECT CHALLENGE LOGIC
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ChallengeAPI from '../services/challengeAPI';
import TestResultsPanel from './TestResultsPanel';
import ChallengeHints from './ChallengeHints';
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
  CheckCircle,
  XCircle,
  FileText,
  TestTube2,
  Lock
} from 'lucide-react';

const PreAssessmentModal = ({ language, onComplete, onClose }) => {
  // Core states
  const [challenge, setChallenge] = useState(null);
  const [submittedCode, setSubmittedCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showHints, setShowHints] = useState(false);
  const [codeValidation, setCodeValidation] = useState(null);

  // Tab switching security
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [tabWarningMessage, setTabWarningMessage] = useState('');
  const [isFocused, setIsFocused] = useState(true);
  const MAX_TAB_SWITCHES = 3;

  // Paste detection
  const [showPasteModal, setShowPasteModal] = useState(false);

  // Use ref to avoid stale closure issues
  const handleSubmitRef = useRef();

  // Load challenge on mount
  useEffect(() => {
    loadChallenge();
  }, [language]);

  const loadChallenge = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Loading challenge for language:', language);

      const response = await ChallengeAPI.getNextChallenge({ 
        programming_language_id: language.language_id 
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

  // Start challenge timer
  const handleStartChallenge = useCallback(() => {
    const now = new Date();
    setStartedAt(now.toISOString());
    if (challenge?.time_limit_minutes) {
      setTimeRemaining(challenge.time_limit_minutes * 60);
    }
  }, [challenge]);

  // Timer countdown effect (migrated from ProjectChallengeInterface)
  useEffect(() => {
    if (!startedAt || !challenge?.time_limit_minutes || result) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 0) {
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [startedAt, challenge, result]);

  useEffect(() => {
    console.log('🔄 Language changed to:', language.name);
    
    // Reset all assessment state
    setResult(null);
    setSubmittedCode('');
    setStartedAt(null);
    setTimeRemaining(null);
    setError(null);
    setShowHints(false);
    setCodeValidation(null);
    setTabSwitchCount(0);
    setShowTabWarning(false);
    setTabWarningMessage('');
    setIsFocused(true);
    
    // Reload challenge for new language
    loadChallenge();
  }, [language.language_id]);

  // Tab switching detection (migrated from ProjectChallengeInterface)
  useEffect(() => {
    if (!startedAt) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => {
          const newCount = prev + 1;
          
          if (newCount >= MAX_TAB_SWITCHES) {
            setTabWarningMessage(`⛔ Maximum tab switches exceeded! Assessment will auto-fail.`);
            setShowTabWarning(true);
            setTimeout(() => handleAutoFail(), 2000);
          } else {
            setTabWarningMessage(
              `⚠️ Tab Switch Warning ${newCount}/${MAX_TAB_SWITCHES} - ${MAX_TAB_SWITCHES - newCount} remaining before auto-fail!`
            );
            setShowTabWarning(true);
            setTimeout(() => setShowTabWarning(false), 5000);
          }
          
          return newCount;
        });
      }
    };

    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [startedAt]);

  // Code validation (migrated from ProjectChallengeInterface)
  const validateCode = useCallback((code) => {
    const validation = {
      isEmpty: !code || code.trim().length === 0,
      isTooShort: code && code.trim().length < 20,
      hasFunction: false,
      hasLogic: false,
      hasComments: false,
      complexity: 0,
      estimatedScore: 0
    };

    if (validation.isEmpty || validation.isTooShort) {
      validation.estimatedScore = 0;
      setCodeValidation(validation);
      return;
    }

    const trimmed = code.trim();
    const lower = trimmed.toLowerCase();
    let score = 0;

    // Check for functions
    const functionClues = ['function ', 'def ', '=>', 'class ', 'static void main', 'fn '];
    validation.hasFunction = functionClues.some(t => lower.includes(t));
    if (validation.hasFunction) score += 25;

    // Check for logic
    const logicClues = ['if(', 'for(', 'while(', 'switch(', 'elif:', 'else:', 'return '];
    validation.hasLogic = logicClues.some(t => lower.includes(t));
    if (validation.hasLogic) score += 20;

    // Check for comments
    validation.hasComments = code.includes('//') || 
                            (code.includes('/*') && code.includes('*/')) || 
                            code.includes('#');
    if (validation.hasComments) score += 10;

    // Check complexity
    if (code.includes('{') && code.includes('}')) validation.complexity++;
    if (code.includes('[') && code.includes(']')) validation.complexity++;
    score += Math.min(validation.complexity * 3, 15);

    // Structure check
    const lines = code.split('\n');
    const nonEmpty = lines.filter(l => l.trim().length > 0);
    const indented = lines.filter(l => /^\s+/.test(l));
    const properStructure = nonEmpty.length >= 3 && (indented.length / Math.max(1, nonEmpty.length)) > 0.3;
    if (properStructure) score += 10;

    if (trimmed.length > 100) score = Math.min(score, 20);

    validation.estimatedScore = Math.min(100, score);
    setCodeValidation(validation);
  }, []);

  // Handle code change
  const handleCodeChange = (e) => {
    const newCode = e.target.value;
    setSubmittedCode(newCode);
    if (startedAt && !isSubmitting && !result) {
      validateCode(newCode);
    }
  };

  // Handle paste detection (migrated from ProjectChallengeInterface)
  const handlePaste = (e) => {
    if (!startedAt || result) return;
    
    e.preventDefault();
    setShowPasteModal(true);
    
    setTimeout(() => {
      setShowPasteModal(false);
    }, 4000);

    console.warn('⚠️ Paste detected during assessment');
  };

  // Handle copy/cut prevention (migrated from ProjectChallengeInterface)
  const handleCopy = (e) => {
    if (!startedAt || result) return;
    console.log('📋 Copy detected (allowed for user convenience)');
  };

  const handleCut = (e) => {
    if (!startedAt || result) return;
    console.log('✂️ Cut detected (allowed for user convenience)');
  };

  // Auto-submit on time up
  const handleAutoSubmit = () => {
    if (!isSubmitting && startedAt && !result) {
      console.log('⏰ Time is up! Auto-submitting...');
      handleSubmitChallenge();
    }
  };

  // Auto-fail on tab violations
  const handleAutoFail = useCallback(async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError(null);

      console.log('⛔ Auto-failing due to tab switching violations');

      // Call onComplete with failure result
      onComplete({
        languageId: language.language_id,
        passed: false,
        score: 0,
        proficiencyLevel: 'beginner',
        feedback: 'Assessment automatically failed due to excessive tab switching. This is considered a violation of assessment integrity rules.'
      });

    } catch (err) {
      console.error('❌ Error during auto-fail:', err);
      setError(err.message || 'Failed to process assessment');
    } finally {
      setIsSubmitting(false);
    }
  }, [language, onComplete, isSubmitting]);

  // Submit challenge (migrated from ProjectChallengeInterface)
  const handleSubmitChallenge = useCallback(async () => {
    if (!submittedCode.trim()) {
      setError('Please write your solution before submitting.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const attemptData = {
        challenge_id: challenge.id,
        submitted_code: submittedCode.trim(),
        programming_language_id: language.language_id,
        started_at: startedAt
      };

      console.log('📝 Submitting assessment:', {
        challenge_id: challenge.id,
        programming_language_id: language.language_id,
        code_length: submittedCode.length
      });

      const response = await ChallengeAPI.submitSimpleChallenge(attemptData);

      console.log('📦 Assessment response:', response);

      if (response.success) {
        const attemptResult = response.attempt || response.data;
        const evaluation = response.evaluation || {};
        
        // Store result for display
        setResult({
          ...attemptResult,
          evaluation,
          passed: attemptResult.status === 'passed' || attemptResult.passed,
          score: attemptResult.score || evaluation.score || 0
        });

        // Determine proficiency level based on score
        let proficiencyLevel = 'beginner';
        const score = attemptResult.score || evaluation.score || 0;
        
        if (score >= 90) proficiencyLevel = 'expert';
        else if (score >= 75) proficiencyLevel = 'advanced';
        else if (score >= 60) proficiencyLevel = 'intermediate';

        // Only call onComplete after user sees results (don't auto-close)
        // The user will see the results and can then proceed
        
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
  }, [submittedCode, challenge, language, startedAt]);

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

  // Continue to next language or complete
  const handleContinueAfterResult = () => {
    if (!result) return;

    const proficiencyLevel = 
      result.score >= 90 ? 'expert' :
      result.score >= 75 ? 'advanced' :
      result.score >= 60 ? 'intermediate' : 'beginner';

    onComplete({
      languageId: language.language_id,
      passed: result.passed || result.score >= 50,
      score: result.score,
      proficiencyLevel,
      feedback: result.evaluation?.feedback || result.feedback || 'Assessment complete'
    });
  };

  if (loading) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div style={styles.loadingContainer}>
            <div style={styles.spinner} />
            <p style={styles.loadingText}>Loading your assessment...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !challenge) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div style={styles.errorContainer}>
            <AlertTriangle size={48} color="#ef4444" />
            <p style={styles.errorText}>{error}</p>
            <button onClick={onClose} style={{ ...styles.button, ...styles.secondaryButton }}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes borderGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3), inset 0 0 20px rgba(59, 130, 246, 0.05); }
          50% { box-shadow: 0 0 40px rgba(139, 92, 246, 0.4), inset 0 0 30px rgba(139, 92, 246, 0.08); }
        }
        @keyframes scanLine {
          0% { transform: translateY(0); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(600px); opacity: 0; }
        }
        @keyframes hexPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes timerPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes warningShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      <div style={styles.overlay}>
        <div style={styles.modal}>
          {/* Decorative elements */}
          <div style={styles.borderGlow} />
          <div style={styles.gridOverlay} />
          <div style={styles.scanLine} />

          {/* Paste Detection Modal */}
          {showPasteModal && (
            <div style={styles.pasteWarning}>
              <AlertTriangle size={20} color="#ef4444" />
              <span>⚠️ Pasting code is discouraged. Please type your solution.</span>
            </div>
          )}

          {/* Header */}
          <div style={styles.header}>
            <div style={styles.headerContent}>
              <div style={styles.hexagonBadge}>
                <svg style={styles.hexagonSvg} viewBox="0 0 50 58">
                  <path
                    d="M25 0 L50 14.5 L50 43.5 L25 58 L0 43.5 L0 14.5 Z"
                    fill="rgba(59, 130, 246, 0.1)"
                    stroke="url(#hexGradient)"
                    strokeWidth="2"
                  />
                  <defs>
                    <linearGradient id="hexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div style={styles.hexagonContent}>
                  <Code2 size={24} color="#3b82f6" />
                </div>
              </div>

              <div style={styles.titleContainer}>
                <div style={styles.statusBadge}>
                  <Radio size={8} />
                  {startedAt ? 'IN PROGRESS' : 'READY TO START'}
                </div>
                <h2 style={styles.title}>
                  {language.name} Pre-Assessment
                </h2>
              </div>
            </div>

            <button onClick={onClose} style={styles.closeButton} disabled={isSubmitting}>
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div style={styles.content}>
            {/* Tab Switch Warning */}
            {showTabWarning && (
              <div style={styles.warningBanner}>
                <div style={styles.warningIcon}>
                  <AlertTriangle size={20} color="#ef4444" />
                </div>
                <div style={styles.warningContent}>
                  <div style={styles.warningTitle}>Tab Switch Detected</div>
                  <div style={styles.warningText}>{tabWarningMessage}</div>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div style={styles.errorBanner}>
                <AlertTriangle size={18} />
                {error}
              </div>
            )}

            {/* Challenge Info Cards */}
            {challenge && !result && (
              <div style={styles.infoGrid}>
                <div style={styles.infoCard}>
                  <div style={styles.infoLabel}>
                    <Target size={14} />
                    Difficulty
                  </div>
                  <div style={{ 
                    ...styles.infoValue, 
                    color: getDifficultyColor(challenge.difficulty_level) 
                  }}>
                    {challenge.difficulty_level || 'Medium'}
                  </div>
                </div>

                <div style={styles.infoCard}>
                  <div style={styles.infoLabel}>
                    <Code2 size={14} />
                    Language
                  </div>
                  <div style={styles.infoValue}>
                    {challenge.programming_languages?.name || language.name}
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
            {startedAt && timeRemaining !== null && !result && (
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
            {challenge && !result && (
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
            )}

            {/* Hints Component */}
            {challenge && !result && (
              <ChallengeHints
                rawTestCases={challenge.test_cases}
                failedAttempts={0}
              />
            )}

            {/* Test Cases */}
            {challenge && challenge.test_cases && !result && (
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

            {/* Code Editor */}
            {!result && (
              <div style={styles.section}>
                <div style={styles.sectionHeader}>
                  <div style={styles.sectionIcon}>
                    <Code2 size={16} color="#3b82f6" />
                  </div>
                  <h3 style={styles.sectionTitle}>Your Solution</h3>
                </div>

                {/* Code Validation Feedback */}
                {startedAt && codeValidation && !isSubmitting && (
                  <div style={{
                    ...styles.validationFeedback,
                    borderColor: codeValidation.estimatedScore >= 70 
                      ? 'rgba(16, 185, 129, 0.3)' 
                      : 'rgba(239, 68, 68, 0.3)'
                  }}>
                    <div style={styles.validationHeader}>
                      <Shield size={16} />
                      <span>Code Analysis</span>
                      <span style={{
                        color: codeValidation.estimatedScore >= 70 ? '#10b981' : '#ef4444',
                        fontWeight: '700'
                      }}>
                        ~{codeValidation.estimatedScore}%
                      </span>
                    </div>
                    <div style={styles.validationItems}>
                      <div style={styles.validationItem}>
                        {codeValidation.hasFunction ? <CheckCircle size={14} color="#10b981" /> : <XCircle size={14} color="#ef4444" />}
                        <span>Function Definitions</span>
                      </div>
                      <div style={styles.validationItem}>
                        {codeValidation.hasLogic ? <CheckCircle size={14} color="#10b981" /> : <XCircle size={14} color="#ef4444" />}
                        <span>Control Structures</span>
                      </div>
                      <div style={styles.validationItem}>
                        {codeValidation.hasComments ? <CheckCircle size={14} color="#10b981" /> : <XCircle size={14} color="#ef4444" />}
                        <span>Code Comments</span>
                      </div>
                      <div style={styles.validationItem}>
                        {codeValidation.complexity > 0 ? <CheckCircle size={14} color="#10b981" /> : <XCircle size={14} color="#ef4444" />}
                        <span>Code Complexity</span>
                      </div>
                    </div>
                  </div>
                )}

                <div style={styles.codeEditorContainer}>
                  <div style={styles.codeEditorHeader}>
                    <div style={styles.codeEditorDots}>
                      <div style={{ ...styles.codeEditorDot, backgroundColor: '#ef4444' }} />
                      <div style={{ ...styles.codeEditorDot, backgroundColor: '#f59e0b' }} />
                      <div style={{ ...styles.codeEditorDot, backgroundColor: '#10b981' }} />
                    </div>
                    <div style={styles.codeEditorTitle}>
                      {language.name.toLowerCase()}.{
                        language.name.toLowerCase() === 'python' ? 'py' :
                        language.name.toLowerCase() === 'java' ? 'java' :
                        language.name.toLowerCase() === 'javascript' ? 'js' : 'txt'
                      }
                    </div>
                  </div>
                  <textarea
                    value={submittedCode}
                    onChange={handleCodeChange}
                    onPaste={handlePaste}
                    onCopy={handleCopy}
                    onCut={handleCut}
                    style={{
                      ...styles.codeEditor,
                      ...((!startedAt || isSubmitting) ? {
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        cursor: 'not-allowed',
                        color: '#6b7280'
                      } : {}),
                      ...(startedAt && !isSubmitting ? {
                        borderColor: 'rgba(59, 130, 246, 0.4)',
                      } : {})
                    }}
                    placeholder={!startedAt ? "Click 'Start Assessment' to begin coding..." : "Write your solution here..."}
                    disabled={!startedAt || isSubmitting}
                    spellCheck={false}
                  />
                </div>
              </div>
            )}

            {/* Results Display */}
            {result && (
              <div style={styles.resultsContainer}>
                <div style={{
                  ...styles.resultCard,
                  borderColor: result.passed ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)',
                  background: result.passed 
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)'
                    : 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)'
                }}>
                  <div style={styles.resultHeader}>
                    {result.passed ? (
                      <CheckCircle size={48} color="#10b981" />
                    ) : (
                      <Target size={48} color="#3b82f6" />
                    )}
                    <div>
                      <h3 style={{
                        ...styles.resultTitle,
                        color: result.passed ? '#10b981' : '#3b82f6'
                      }}>
                        Assessment Complete
                      </h3>
                      <p style={styles.resultScore}>Score: {result.score}%</p>
                    </div>
                  </div>

                  <div style={styles.resultFeedback}>
                    {result.evaluation?.feedback || result.feedback || 'Great effort! Keep practicing to improve your skills.'}
                  </div>

                  {/* Evaluation Details */}
                  {result.evaluation && result.evaluation.details && (
                    <div style={styles.evaluationDetails}>
                      <h4 style={styles.evaluationTitle}>Evaluation Breakdown:</h4>
                      <ul style={styles.evaluationList}>
                        <li style={styles.evaluationItem}>
                          {result.evaluation.details.hasFunction ? '✅' : '❌'} Function Definition (25 pts)
                        </li>
                        <li style={styles.evaluationItem}>
                          {result.evaluation.details.hasLogic ? '✅' : '❌'} Control Structures & Logic (20 pts)
                        </li>
                        <li style={styles.evaluationItem}>
                          {result.evaluation.details.languageMatch ? '✅' : '❌'} Language Syntax Match (20 pts)
                        </li>
                        <li style={styles.evaluationItem}>
                          {result.evaluation.details.properStructure ? '✅' : '❌'} Code Structure (10 pts)
                        </li>
                        <li style={styles.evaluationItem}>
                          {result.evaluation.details.hasComments ? '✅' : '❌'} Comments & Documentation (10 pts)
                        </li>
                        <li style={styles.evaluationItem}>
                          📈 Complexity Score: {result.evaluation.details.complexity * 3}/15 pts
                        </li>
                      </ul>
                    </div>
                  )}

                  {/* Test Results */}
                  {result.evaluation && 
                    Array.isArray(result.evaluation.testResults) && 
                    result.evaluation.testResults.length > 0 && (
                      <TestResultsPanel tests={result.evaluation.testResults} />
                  )}

                  {/* Action Button */}
                  <button
                    onClick={handleContinueAfterResult}
                    style={{
                      ...styles.button,
                      ...(result.passed ? styles.successButton : styles.retryButton),
                      marginTop: '20px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = result.passed 
                        ? '0 8px 30px rgba(16, 185, 129, 0.4)'
                        : '0 8px 30px rgba(59, 130, 246, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = result.passed
                        ? '0 4px 20px rgba(16, 185, 129, 0.3)'
                        : '0 4px 20px rgba(59, 130, 246, 0.3)';
                    }}
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons (when challenge not submitted) */}
            {!result && (
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
      </div>
    </>
  );
};

// Styles (matching ProjectChallengeInterface styling)
const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
    overflow: 'auto'
  },
  modal: {
    position: 'relative',
    backgroundColor: '#0a0e1a',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '900px',
    maxHeight: '90vh',
    overflow: 'hidden',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column'
  },
  borderGlow: {
    position: 'absolute',
    inset: 0,
    borderRadius: '20px',
    padding: '1px',
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.5), rgba(139, 92, 246, 0.3))',
    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    WebkitMaskComposite: 'xor',
    maskComposite: 'exclude',
    pointerEvents: 'none',
    animation: 'borderGlow 4s ease-in-out infinite'
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
  pasteWarning: {
    position: 'absolute',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 24px',
    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(185, 28, 28, 0.95) 100%)',
    border: '1px solid rgba(239, 68, 68, 0.5)',
    borderRadius: '12px',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    zIndex: 10,
    animation: 'fadeIn 0.3s ease-out',
    boxShadow: '0 10px 30px rgba(239, 68, 68, 0.3)'
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
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
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
    gap: '8px'
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
    fontWeight: '700',
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
  validationFeedback: {
    padding: '1rem',
    background: 'rgba(59, 130, 246, 0.05)',
    border: '1px solid',
    borderRadius: '12px',
    marginBottom: '1rem'
  },
  validationHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: '10px'
  },
  validationItems: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px'
  },
  validationItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#94a3b8'
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
  resultsContainer: {
    marginTop: '1.5rem'
  },
  resultCard: {
    padding: '2rem',
    borderRadius: '16px',
    border: '2px solid'
  },
  resultHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '16px'
  },
  resultTitle: {
    fontSize: '24px',
    fontWeight: '800',
    margin: '0 0 4px 0'
  },
  resultScore: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#94a3b8',
    margin: 0
  },
  resultFeedback: {
    padding: '16px',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '12px',
    color: '#e2e8f0',
    lineHeight: '1.6',
    marginBottom: '16px'
  },
  evaluationDetails: {
    padding: '16px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    marginBottom: '16px'
  },
  evaluationTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'white',
    margin: '0 0 12px 0'
  },
  evaluationList: {
    margin: 0,
    paddingLeft: '20px',
    listStyle: 'none'
  },
  evaluationItem: {
    fontSize: '14px',
    margin: '6px 0',
    color: '#e2e8f0',
    paddingLeft: 0
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
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#94a3b8'
  },
  startButton: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)'
  },
  successButton: {
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

export default PreAssessmentModal;