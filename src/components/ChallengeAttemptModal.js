// frontend/src/components/ChallengeAttemptModal.js
// FIXED - Correct response structure handling
import React, { useState } from 'react';
import { X, Code, Send, CheckCircle, XCircle, Loader, AlertCircle } from 'lucide-react';
import ChallengeAPI from '../services/challengeAPI';

const ChallengeAttemptModal = ({ isOpen, onClose, challenge, onComplete }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!code.trim()) {
      setError('Please enter your solution code');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setResult(null);

      console.log('📝 Challenge data:', challenge);
      console.log('📝 Programming language:', challenge.programming_languages);

      // Get the language name from the challenge object
      const languageName = challenge.programming_languages?.name || 
                          challenge.language?.name ||
                          'JavaScript';

      console.log('📝 Submitting with language:', languageName);

      // ✅ CORRECT - Uses language-based evaluator with proper field names
      const payload = {
        challenge_id: challenge.id,
        submitted_code: code,
        language: languageName
      };

      const response = await ChallengeAPI.submitSimpleChallenge(payload);

      console.log('📦 Full response:', response);

      // ✅ FIXED - Backend returns { success, message, attempt, evaluation, award }
      // NOT { success, data: { attempt, evaluation, award } }
      if (response && response.success) {
        if (response.attempt) {
          console.log('✅ Challenge completed!', response.attempt);
          setResult(response);
          
          // Notify parent component
          if (onComplete) {
            onComplete(response.attempt.id, response.attempt.status);
          }

          // Auto-close on success after 2 seconds
          if (response.attempt.status === 'passed') {
            setTimeout(() => {
              onClose();
            }, 2000);
          }
        } else {
          console.error('❌ Invalid response structure - missing attempt');
          setError('Invalid response from server');
        }
      } else {
        console.error('❌ Response not successful');
        setError(response?.message || 'Failed to submit solution');
      }
    } catch (err) {
      console.error('❌ Error submitting challenge:', err);
      console.error('❌ Error response:', err.response?.data);
      setError(err.response?.data?.message || err.message || 'Failed to submit solution. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <Code size={24} style={{ color: '#3b82f6' }} />
            <div>
              <h2 style={styles.title}>{challenge.title}</h2>
              <p style={styles.subtitle}>
                {challenge.difficulty_level} • Verify your proficiency
              </p>
            </div>
          </div>
          <button style={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Challenge Description */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Challenge</h3>
            <p style={styles.description}>{challenge.description}</p>
          </div>

          {/* Test Cases (if available) */}
          {challenge.test_cases && challenge.test_cases.length > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Test Cases</h3>
              <div style={styles.testCases}>
                {challenge.test_cases.slice(0, 2).map((testCase, index) => (
                  <div key={index} style={styles.testCase}>
                    <div style={styles.testCaseLabel}>Test Case {index + 1}</div>
                    <div style={styles.testCaseContent}>
                      <div>
                        <strong>Input:</strong> {JSON.stringify(testCase.input)}
                      </div>
                      <div>
                        <strong>Expected:</strong> {JSON.stringify(testCase.expected_output)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Code Editor */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Your Solution</h3>
            <textarea
              style={styles.codeEditor}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Write your solution here..."
              disabled={loading || result?.attempt?.status === 'passed'}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div style={styles.errorMessage}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Result */}
          {result && result.attempt && (
            <div style={result.attempt.status === 'passed' ? styles.successResult : styles.failedResult}>
              {result.attempt.status === 'passed' ? (
                <CheckCircle size={20} />
              ) : (
                <XCircle size={20} />
              )}
              <div>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                  Score: {result.attempt.score}/100
                </div>
                {result.attempt.feedback && (
                  <div style={styles.feedback}>{result.attempt.feedback}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button
            style={styles.cancelButton}
            onClick={onClose}
            disabled={loading}
          >
            {result?.attempt?.status === 'passed' ? 'Close' : 'Cancel'}
          </button>
          {(!result || result.attempt.status !== 'passed') && (
            <button
              style={{
                ...styles.submitButton,
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Submit Solution
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modal: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    maxWidth: '800px',
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '16px'
  },
  headerContent: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    flex: 1
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: '1.4'
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: '14px',
    color: '#94a3b8',
    textTransform: 'capitalize'
  },
  closeButton: {
    padding: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    color: '#94a3b8',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s'
  },
  content: {
    padding: '24px',
    flex: 1,
    overflowY: 'auto'
  },
  section: {
    marginBottom: '24px'
  },
  sectionTitle: {
    margin: '0 0 12px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#f1f5f9',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  description: {
    margin: 0,
    fontSize: '14px',
    color: '#cbd5e1',
    lineHeight: '1.6'
  },
  testCases: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  testCase: {
    padding: '12px',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px'
  },
  testCaseLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  testCaseContent: {
    fontSize: '13px',
    color: '#cbd5e1',
    fontFamily: 'monospace',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  codeEditor: {
    width: '100%',
    minHeight: '200px',
    padding: '12px',
    backgroundColor: '#0f172a',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '14px',
    fontFamily: 'monospace',
    resize: 'vertical',
    outline: 'none'
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '12px'
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
  submitButton: {
    flex: 2,
    padding: '12px',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s'
  },
  errorMessage: {
    padding: '12px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px',
    color: '#ef4444',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '12px'
  },
  successResult: {
    padding: '16px',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '8px',
    color: '#10b981',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '16px'
  },
  failedResult: {
    padding: '16px',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px',
    color: '#ef4444',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginTop: '16px'
  },
  feedback: {
    marginTop: '8px',
    fontSize: '13px',
    opacity: 0.9,
    whiteSpace: 'pre-line'
  }
};

export default ChallengeAttemptModal;