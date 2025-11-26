// frontend/src/components/ChallengeAttemptModal.js
// PRODUCTION-READY VERSION - Bulletproof error handling
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

      console.log('📝 Submitting challenge with languageBasedCodeEvaluator:', {
        challenge_id: challenge.id,
        language: challenge.programming_languages?.name || 'JavaScript',
        code_length: code.length
      });

      // ✅ Call the API
      const response = await ChallengeAPI.submitSimpleChallenge({
        challenge_id: challenge.id,
        submitted_code: code,
        language: challenge.programming_languages?.name || 'JavaScript',
        project_id: null
      });

      console.log('✅ Raw API response:', response);
      console.log('✅ Response type:', typeof response);
      console.log('✅ Response.success:', response?.success);
      console.log('✅ Response.data:', response?.data);
      console.log('✅ Response.data type:', typeof response?.data);
      
      // ✅ Validate response structure
      if (!response) {
        throw new Error('No response from server');
      }

      // Backend returns: { success: true, data: { attempt: {...}, evaluation: {...} } }
      if (response.success === false) {
        throw new Error(response.message || 'Server returned unsuccessful response');
      }

      // Check if we have the data object
      if (!response.data) {
        console.error('❌ Response structure:', JSON.stringify(response, null, 2));
        throw new Error('No data in response');
      }

      // Check if we have attempt data
      if (!response.data.attempt) {
        console.error('❌ Data structure:', JSON.stringify(response.data, null, 2));
        throw new Error('No attempt data in response. Got: ' + Object.keys(response.data).join(', '));
      }

      console.log('✅ Challenge submission successful:', {
        attemptId: response.data.attempt.id,
        status: response.data.attempt.status,
        score: response.data.attempt.score
      });

      // ✅ Set result for display
      setResult(response.data);

      // ✅ Notify parent component
      if (onComplete) {
        const attemptId = response.data.attempt.id;
        const status = response.data.attempt.status;

        console.log('🎯 Calling onComplete with:', { attemptId, status });

        if (attemptId && status) {
          onComplete(attemptId, status);
        } else {
          console.error('⚠️ Missing attempt ID or status');
        }
      }

      // ✅ Auto-close on success after 2 seconds
      if (response.data.attempt.status === 'passed') {
        setTimeout(() => {
          onClose();
        }, 2000);
      }

    } catch (err) {
      console.error('❌ Challenge submission error:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        stack: err.stack
      });

      // ✅ Set user-friendly error message
      let errorMessage = 'Failed to submit solution. Please try again.';

      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
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
                <>
                  <CheckCircle size={20} />
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>Challenge Passed!</div>
                    <div style={styles.feedback}>Score: {result.attempt.score}/100</div>
                    {result.evaluation?.feedback && (
                      <div style={styles.feedback}>{result.evaluation.feedback}</div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <XCircle size={20} />
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>Challenge Failed</div>
                    <div style={styles.feedback}>Score: {result.attempt.score}/100</div>
                    {result.evaluation?.feedback && (
                      <div style={styles.feedback}>{result.evaluation.feedback}</div>
                    )}
                    <div style={{ ...styles.feedback, marginTop: '8px' }}>
                      Try again with a more complete solution!
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Actions */}
          <div style={styles.actions}>
            <button
              style={styles.cancelButton}
              onClick={onClose}
              disabled={loading}
            >
              {result?.attempt?.status === 'passed' ? 'Close' : 'Cancel'}
            </button>
            {!result || result.attempt?.status !== 'passed' ? (
              <button
                style={styles.submitButton}
                onClick={handleSubmit}
                disabled={loading || !code.trim()}
              >
                {loading ? (
                  <>
                    <Loader size={16} className="spinner" />
                    Evaluating...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Submit Solution
                  </>
                )}
              </button>
            ) : null}
          </div>
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
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: '20px'
  },
  modal: {
    backgroundColor: '#0d1117',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '700px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  header: {
    padding: '24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between'
  },
  headerContent: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    flex: 1
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#ffffff',
    margin: 0,
    marginBottom: '4px'
  },
  subtitle: {
    fontSize: '13px',
    color: '#9ca3af',
    margin: 0
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s'
  },
  content: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1
  },
  section: {
    marginBottom: '20px'
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  description: {
    fontSize: '14px',
    color: '#d1d5db',
    lineHeight: '1.6',
    margin: 0
  },
  testCases: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  testCase: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '12px'
  },
  testCaseLabel: {
    fontSize: '12px',
    color: '#9ca3af',
    fontWeight: '500',
    marginBottom: '6px'
  },
  testCaseContent: {
    fontSize: '13px',
    color: '#d1d5db',
    fontFamily: 'monospace',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  codeEditor: {
    width: '100%',
    minHeight: '200px',
    padding: '16px',
    backgroundColor: '#0f1116',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    fontFamily: 'monospace',
    lineHeight: '1.6',
    outline: 'none',
    resize: 'vertical',
    transition: 'all 0.2s'
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px'
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
    opacity: 0.9
  }
};

export default ChallengeAttemptModal;