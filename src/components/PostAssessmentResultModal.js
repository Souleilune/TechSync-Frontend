// frontend/src/components/AssessmentResultModal.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, Trophy, TrendingUp, TrendingDown, AlertCircle, 
  CheckCircle, XCircle, Award, Target, Home 
} from 'lucide-react';

const PostAssessmentResultModal = ({ 
  isOpen, 
  onClose, 
  assessmentResult,
  language,
  currentProficiency,
  onReturnHome
}) => {
  const navigate = useNavigate();

  if (!isOpen || !assessmentResult) return null;

  const { attempt, evaluation } = assessmentResult;
  const score = attempt?.score || evaluation?.score || 0;
  const passed = attempt?.status === 'passed' || score >= 70;

  // Determine new proficiency level based on score
  const determineNewProficiency = (score) => {
    if (score >= 90) return 'expert';
    if (score >= 75) return 'advanced';
    if (score >= 60) return 'intermediate';
    return 'beginner';
  };

  const newProficiency = determineNewProficiency(score);
  const hasAdvanced = getProficiencyRank(newProficiency) > getProficiencyRank(currentProficiency);

  // Helper function to rank proficiency levels
  function getProficiencyRank(level) {
    const ranks = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
    return ranks[level?.toLowerCase()] || 0;
  }

  const handleContinue = () => {
    if (onReturnHome) {
      onReturnHome();
    } else {
      navigate('/dashboard');
    }
    onClose();
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Animated Background Elements */}
        <div style={{
          ...styles.bgDecor1,
          background: passed 
            ? 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(239, 68, 68, 0.15) 0%, transparent 70%)'
        }} />
        <div style={styles.bgDecor2} />

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <div style={{
              ...styles.headerIcon,
              background: passed
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.15) 100%)'
                : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(185, 28, 28, 0.15) 100%)',
              border: passed
                ? '1px solid rgba(16, 185, 129, 0.3)'
                : '1px solid rgba(239, 68, 68, 0.3)'
            }}>
              {passed ? <Trophy size={24} color="#10b981" /> : <Target size={24} color="#ef4444" />}
            </div>
            <div>
              <h2 style={styles.title}>Assessment Complete</h2>
              <p style={styles.subtitle}>
                {language?.name} • Score: {score}/100
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={styles.closeButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
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
          {/* Score Display */}
          <div style={{
            ...styles.scoreCard,
            background: passed
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.08) 100%)'
              : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(185, 28, 28, 0.08) 100%)',
            border: passed
              ? '1px solid rgba(16, 185, 129, 0.3)'
              : '1px solid rgba(239, 68, 68, 0.3)'
          }}>
            <div style={styles.scoreCircle}>
              <div style={{
                ...styles.scoreValue,
                color: passed ? '#10b981' : '#ef4444'
              }}>
                {score}
              </div>
              <div style={styles.scoreLabel}>/ 100</div>
            </div>
            <div style={styles.scoreStatus}>
              {passed ? (
                <>
                  <CheckCircle size={20} color="#10b981" />
                  <span style={{ color: '#10b981' }}>Assessment Passed!</span>
                </>
              ) : (
                <>
                  <XCircle size={20} color="#ef4444" />
                  <span style={{ color: '#ef4444' }}>Score Below Threshold</span>
                </>
              )}
            </div>
          </div>

          {/* Proficiency Result */}
          {hasAdvanced ? (
            <div style={styles.resultCard}>
              <div style={styles.resultHeader}>
                <div style={styles.resultIconSuccess}>
                  <TrendingUp size={24} color="#10b981" />
                </div>
                <h3 style={styles.resultTitle}>Congratulations! 🎉</h3>
              </div>
              <div style={styles.resultBody}>
                <p style={styles.resultMessage}>
                  You've demonstrated advanced skills in {language?.name}!
                </p>
                <div style={styles.proficiencyChange}>
                  <div style={styles.proficiencyBadge}>
                    <div style={styles.proficiencyLabel}>Previous Level</div>
                    <div style={{
                      ...styles.proficiencyValue,
                      color: '#94a3b8'
                    }}>
                      {currentProficiency}
                    </div>
                  </div>
                  <div style={styles.proficiencyArrow}>
                    <TrendingUp size={24} color="#10b981" />
                  </div>
                  <div style={styles.proficiencyBadge}>
                    <div style={styles.proficiencyLabel}>New Level</div>
                    <div style={{
                      ...styles.proficiencyValue,
                      color: '#10b981'
                    }}>
                      {newProficiency}
                    </div>
                  </div>
                </div>
                <div style={styles.achievementBanner}>
                  <Award size={20} color="#f59e0b" />
                  <span>Your skill level has been upgraded!</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={styles.resultCard}>
              <div style={styles.resultHeader}>
                <div style={styles.resultIconInfo}>
                  <AlertCircle size={24} color="#3b82f6" />
                </div>
                <h3 style={styles.resultTitle}>
                  {passed ? 'Good Work!' : 'Keep Practicing'}
                </h3>
              </div>
              <div style={styles.resultBody}>
                {passed ? (
                  <>
                    <p style={styles.resultMessage}>
                      You've maintained your current skill level in {language?.name}.
                    </p>
                    <div style={styles.proficiencyStay}>
                      <div style={styles.proficiencyBadge}>
                        <div style={styles.proficiencyLabel}>Your Level</div>
                        <div style={{
                          ...styles.proficiencyValue,
                          color: '#3b82f6'
                        }}>
                          {currentProficiency}
                        </div>
                      </div>
                    </div>
                    <div style={styles.infoBanner}>
                      <AlertCircle size={18} />
                      <span>Score higher to advance to the next level!</span>
                    </div>
                  </>
                ) : (
                  <>
                    <p style={styles.resultMessage}>
                      Your score didn't meet the minimum requirement to advance.
                    </p>
                    <div style={styles.proficiencyStay}>
                      <div style={styles.proficiencyBadge}>
                        <div style={styles.proficiencyLabel}>Current Level</div>
                        <div style={{
                          ...styles.proficiencyValue,
                          color: '#94a3b8'
                        }}>
                          {currentProficiency}
                        </div>
                      </div>
                    </div>
                    <div style={styles.encouragementBanner}>
                      <Target size={18} />
                      <span>Keep learning and try again to improve your skills!</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Evaluation Details */}
          {evaluation?.details && (
            <div style={styles.detailsSection}>
              <h4 style={styles.detailsTitle}>Performance Breakdown</h4>
              <div style={styles.detailsGrid}>
                <div style={styles.detailItem}>
                  <div style={styles.detailIcon}>
                    {evaluation.details.basicRequirements ? 
                      <CheckCircle size={16} color="#10b981" /> : 
                      <XCircle size={16} color="#ef4444" />
                    }
                  </div>
                  <div style={styles.detailText}>
                    <div style={styles.detailLabel}>Basic Requirements</div>
                    <div style={styles.detailValue}>
                      {evaluation.details.basicRequirements ? '✓ Met' : '✗ Not Met'}
                    </div>
                  </div>
                </div>
                <div style={styles.detailItem}>
                  <div style={styles.detailIcon}>
                    {evaluation.details.controlFlow ? 
                      <CheckCircle size={16} color="#10b981" /> : 
                      <XCircle size={16} color="#ef4444" />
                    }
                  </div>
                  <div style={styles.detailText}>
                    <div style={styles.detailLabel}>Control Structures</div>
                    <div style={styles.detailValue}>
                      {evaluation.details.controlFlow ? '✓ Good' : '✗ Needs Work'}
                    </div>
                  </div>
                </div>
                <div style={styles.detailItem}>
                  <div style={styles.detailIcon}>
                    {evaluation.details.languageMatch ? 
                      <CheckCircle size={16} color="#10b981" /> : 
                      <XCircle size={16} color="#ef4444" />
                    }
                  </div>
                  <div style={styles.detailText}>
                    <div style={styles.detailLabel}>Language Syntax</div>
                    <div style={styles.detailValue}>
                      {evaluation.details.languageMatch ? '✓ Correct' : '✗ Issues Found'}
                    </div>
                  </div>
                </div>
                <div style={styles.detailItem}>
                  <div style={styles.detailIcon}>
                    {evaluation.details.properStructure ? 
                      <CheckCircle size={16} color="#10b981" /> : 
                      <XCircle size={16} color="#ef4444" />
                    }
                  </div>
                  <div style={styles.detailText}>
                    <div style={styles.detailLabel}>Code Structure</div>
                    <div style={styles.detailValue}>
                      {evaluation.details.properStructure ? '✓ Well Organized' : '✗ Needs Improvement'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div style={styles.actionButtons}>
          <button
            onClick={handleContinue}
            style={{
              ...styles.button,
              ...styles.primaryButton
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(59, 130, 246, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(59, 130, 246, 0.3)';
            }}
          >
            <Home size={18} />
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

// Styles matching PreAssessmentModal theme
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
    maxWidth: '700px',
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
  scoreCard: {
    padding: '2rem',
    borderRadius: '16px',
    marginBottom: '2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.5rem'
  },
  scoreCircle: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem'
  },
  scoreValue: {
    fontSize: '64px',
    fontWeight: '800',
    lineHeight: 1
  },
  scoreLabel: {
    fontSize: '20px',
    color: '#94a3b8',
    fontWeight: '600'
  },
  scoreStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '16px',
    fontWeight: '600'
  },
  resultCard: {
    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.6) 0%, rgba(7, 11, 20, 0.8) 100%)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '2rem',
    marginBottom: '1.5rem'
  },
  resultHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '1.5rem'
  },
  resultIconSuccess: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.15) 100%)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  resultIconInfo: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.15) 100%)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  resultTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'white',
    margin: 0
  },
  resultBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  resultMessage: {
    fontSize: '15px',
    color: '#cbd5e1',
    lineHeight: '1.6',
    margin: 0
  },
  proficiencyChange: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    padding: '1.5rem',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.05)'
  },
  proficiencyStay: {
    display: 'flex',
    justifyContent: 'center',
    padding: '1.5rem',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.05)'
  },
  proficiencyBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem'
  },
  proficiencyLabel: {
    fontSize: '12px',
    color: '#64748b',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: '0.5px'
  },
  proficiencyValue: {
    fontSize: '24px',
    fontWeight: '700',
    textTransform: 'capitalize'
  },
  proficiencyArrow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  achievementBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '1rem 1.25rem',
    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.08) 100%)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '12px',
    color: '#10b981',
    fontSize: '14px',
    fontWeight: '600'
  },
  infoBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '1rem 1.25rem',
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(37, 99, 235, 0.08) 100%)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: '12px',
    color: '#3b82f6',
    fontSize: '14px',
    fontWeight: '600'
  },
  encouragementBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '1rem 1.25rem',
    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.08) 100%)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    borderRadius: '12px',
    color: '#f59e0b',
    fontSize: '14px',
    fontWeight: '600'
  },
  detailsSection: {
    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.4) 0%, rgba(7, 11, 20, 0.6) 100%)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '1.5rem'
  },
  detailsTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '1rem'
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1rem'
  },
  detailItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '0.75rem',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.05)'
  },
  detailIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  detailText: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  detailLabel: {
    fontSize: '11px',
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.3px'
  },
  detailValue: {
    fontSize: '13px',
    color: '#cbd5e1',
    fontWeight: '500'
  },
  actionButtons: {
    display: 'flex',
    gap: '12px',
    padding: '1.5rem 2rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 3
  },
  button: {
    padding: '14px 32px',
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
    letterSpacing: '0.5px'
  },
  primaryButton: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    color: 'white',
    boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)'
  }
};

export default PostAssessmentResultModal;