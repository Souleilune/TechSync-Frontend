// src/components/onboarding/AssessmentResultModal.js
import React, { useState, useEffect } from 'react';
import { Trophy, Target, TrendingUp, Award, CheckCircle2, XCircle } from 'lucide-react';

const AssessmentResultModal = ({ 
  results, 
  selectedLanguages, 
  onComplete, 
  loading, 
  determineProficiencyLevel 
}) => {
  const [animationPhase, setAnimationPhase] = useState('scanning');

  useEffect(() => {
    const phaseTimeline = [
      { phase: 'scanning', duration: 1500 },
      { phase: 'analyzing', duration: 1500 },
      { phase: 'complete', duration: 0 }
    ];

    let currentIndex = 0;
    const runPhase = () => {
      if (currentIndex < phaseTimeline.length) {
        const current = phaseTimeline[currentIndex];
        setAnimationPhase(current.phase);
        if (current.duration > 0) {
          setTimeout(() => {
            currentIndex++;
            runPhase();
          }, current.duration);
        }
      }
    };

    runPhase();
  }, []);

  const calculateAssessment = () => {
    console.log('📊 Calculating assessment from results:', results);
    
    if (!results || results.length === 0) {
      console.warn('⚠️ No results provided to AssessmentResultModal');
      return {
        averageScore: 0,
        passedChallenges: 0,
        totalChallenges: 0,
        results: []
      };
    }

    const totalScore = results.reduce((sum, r) => sum + (r.score || 0), 0);
    const averageScore = Math.round(totalScore / results.length);
    const passedChallenges = results.filter(r => r.passed).length;

    const processedResults = results.map(r => ({
      languageName: r.languageName,
      score: r.score || 0,
      passed: r.passed || false,
      proficiencyLevel: r.proficiencyLevel || determineProficiencyLevel(r.score || 0)
    }));

    const assessment = {
      averageScore,
      passedChallenges,
      totalChallenges: results.length,
      results: processedResults
    };

    console.log('✅ Calculated assessment:', assessment);
    return assessment;
  };

  const assessment = calculateAssessment();


  const getOverallRank = (score) => {
    if (score >= 90) return { level: 'Expert', color: '#8b5cf6', icon: '👑', glow: 'rgba(139, 92, 246, 0.4)' };
    if (score >= 75) return { level: 'Advanced', color: '#3b82f6', icon: '🚀', glow: 'rgba(59, 130, 246, 0.4)' };
    if (score >= 60) return { level: 'Intermediate', color: '#10b981', icon: '⭐', glow: 'rgba(16, 185, 129, 0.4)' };
    return { level: 'Beginner', color: '#f59e0b', icon: '🌱', glow: 'rgba(245, 158, 11, 0.4)' };
  };

  const rank = getOverallRank(assessment.averageScore);

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        {/* Animated Badge */}
        <div style={{
          ...styles.badgeContainer,
          opacity: animationPhase !== 'entering' ? 1 : 0,
          transform: animationPhase !== 'entering' ? 'scale(1)' : 'scale(0.5)'
        }}>
          <div style={{
            ...styles.hexagonBadge,
            animation: animationPhase === 'scanning' ? 'hexPulse 1s ease-in-out infinite' : 'none'
          }}>
            <svg style={styles.hexagonSvg} viewBox="0 0 100 115">
              <defs>
                <linearGradient id="hexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: rank.color, stopOpacity: 0.6 }} />
                  <stop offset="100%" style={{ stopColor: rank.color, stopOpacity: 0.2 }} />
                </linearGradient>
              </defs>
              <polygon
                points="50,5 95,30 95,75 50,100 5,75 5,30"
                fill="url(#hexGradient)"
                stroke={rank.color}
                strokeWidth="2"
              />
            </svg>
            <div style={styles.hexagonContent}>
              <div style={{ fontSize: '48px' }}>{rank.icon}</div>
            </div>
          </div>
        </div>

        {/* Header Text */}
        <div style={{
          ...styles.headerSection,
          opacity: animationPhase !== 'entering' ? 1 : 0,
          transform: animationPhase !== 'entering' ? 'translateY(0)' : 'translateY(-20px)'
        }}>
          {animationPhase === 'scanning' && (
            <div style={styles.statusText}>Evaluating your performance...</div>
          )}
          {animationPhase === 'analyzing' && (
            <div style={styles.statusText}>Analyzing skill level...</div>
          )}
          {animationPhase === 'complete' && (
            <>
              <div style={styles.completeText}>Assessment Complete</div>
              <h2 style={styles.mainTitle}>Your Skill Level</h2>
              <p style={styles.subtitle}>{rank.level} Developer</p>
            </>
          )}
        </div>

        {/* Stats Container */}
        {animationPhase === 'complete' && (
          <div style={styles.statsContainer}>
            <div style={styles.statItem}>
              <span style={{ ...styles.statValue, color: rank.color }}>
                {assessment.averageScore}%
              </span>
              <span style={styles.statLabel}>Avg Score</span>
            </div>
            <div style={styles.statDivider} />
            <div style={styles.statItem}>
              <span style={{ ...styles.statValue, color: '#22c55e' }}>
                {assessment.passedChallenges}
              </span>
              <span style={styles.statLabel}>Passed</span>
            </div>
            <div style={styles.statDivider} />
            <div style={styles.statItem}>
              <span style={{ ...styles.statValue, color: '#3b82f6' }}>
                {assessment.totalChallenges}
              </span>
              <span style={styles.statLabel}>Total</span>
            </div>
          </div>
        )}

        {/* Results Cards */}
        {animationPhase === 'complete' && (
          <div style={styles.resultsGrid}>
            {assessment.results.map((result, index) => (
              <div
                key={index}
                style={{
                  ...styles.resultCard,
                  animationDelay: `${0.1 + index * 0.15}s`
                }}
              >
                <div style={styles.cardHeader}>
                  <div style={styles.languageName}>{result.languageName}</div>
                  <div style={{
                    ...styles.passIndicator,
                    backgroundColor: result.passed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: result.passed ? '#10b981' : '#ef4444'
                  }}>
                    {result.passed ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  </div>
                </div>

                <div style={styles.cardBody}>
                  <div style={styles.scoreCircle}>
                    <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
                      <circle
                        cx="40"
                        cy="40"
                        r="35"
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.1)"
                        strokeWidth="6"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r="35"
                        fill="none"
                        stroke={result.passed ? '#10b981' : '#ef4444'}
                        strokeWidth="6"
                        strokeDasharray={`${2 * Math.PI * 35 * (result.score / 100)} ${2 * Math.PI * 35}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div style={styles.scoreText}>{result.score}%</div>
                  </div>

                  <div style={styles.proficiencyLevel}>
                    <Award size={16} color={rank.color} />
                    <span style={{ color: rank.color }}>{result.proficiencyLevel}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Performance Summary */}
        {animationPhase === 'complete' && (
          <div style={styles.summaryContainer}>
            <h3 style={styles.summaryTitle}>What This Means</h3>
            <div style={styles.summaryContent}>
              {assessment.averageScore >= 90 && (
                <p>
                  <strong>Excellent work!</strong> Your performance shows expert-level understanding. 
                  You'll be matched with advanced projects that challenge your skills.
                </p>
              )}
              {assessment.averageScore >= 75 && assessment.averageScore < 90 && (
                <p>
                  <strong>Great job!</strong> You have advanced knowledge in your chosen languages. 
                  You're ready for intermediate to advanced projects.
                </p>
              )}
              {assessment.averageScore >= 60 && assessment.averageScore < 75 && (
                <p>
                  <strong>Good start!</strong> You have a solid foundation. 
                  We'll recommend projects that match your intermediate skill level and help you grow.
                </p>
              )}
              {assessment.averageScore < 60 && (
                <p>
                  <strong>Welcome!</strong> Everyone starts somewhere. 
                  We'll recommend beginner-friendly projects and learning resources to help you improve.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Continue Button */}
        {animationPhase === 'complete' && (
          <button
            onClick={onComplete}
            disabled={loading}
            style={{
              ...styles.continueButton,
              ...(loading ? styles.buttonDisabled : {})
            }}
          >
            {loading ? 'Setting up your profile...' : 'Continue to Dashboard'}
          </button>
        )}
      </div>

      <style>
        {`
          @keyframes hexPulse {
            0%, 100% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.05);
              opacity: 0.8;
            }
          }

          @keyframes cardReveal {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes borderGlow {
            0%, 100% {
              box-shadow: 0 0 20px rgba(59, 130, 246, 0.2);
            }
            50% {
              box-shadow: 0 0 30px rgba(59, 130, 246, 0.4);
            }
          }
        `}
      </style>
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
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)'
  },
  container: {
    maxWidth: '900px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: '24px',
    padding: '48px 32px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
  },
  badgeContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '32px',
    transition: 'all 0.5s ease-out'
  },
  hexagonBadge: {
    position: 'relative',
    width: '100px',
    height: '115px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  hexagonSvg: {
    position: 'absolute',
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
  headerSection: {
    textAlign: 'center',
    marginBottom: '36px',
    transition: 'all 0.5s ease-out'
  },
  statusText: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#3b82f6',
    textTransform: 'uppercase',
    letterSpacing: '3px',
    animation: 'pulse 2s ease-in-out infinite'
  },
  completeText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#10b981',
    textTransform: 'uppercase',
    letterSpacing: '4px',
    marginBottom: '12px'
  },
  mainTitle: {
    fontSize: '42px',
    fontWeight: '800',
    color: '#fff',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '2px'
  },
  subtitle: {
    fontSize: '18px',
    color: '#64748b',
    letterSpacing: '1px'
  },
  statsContainer: {
    display: 'flex',
    gap: '32px',
    justifyContent: 'center',
    marginBottom: '40px',
    padding: '24px 40px',
    background: 'rgba(15, 23, 42, 0.8)',
    borderRadius: '16px',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    animation: 'borderGlow 3s ease-in-out infinite'
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px'
  },
  statValue: {
    fontSize: '36px',
    fontWeight: '700',
    fontFamily: 'monospace'
  },
  statLabel: {
    fontSize: '12px',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
  statDivider: {
    width: '1px',
    height: '50px',
    background: 'linear-gradient(180deg, transparent, rgba(59, 130, 246, 0.3), transparent)',
    alignSelf: 'center'
  },
  resultsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '32px'
  },
  resultCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    animation: 'cardReveal 0.6s ease-out forwards',
    opacity: 0
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  languageName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff'
  },
  passIndicator: {
    padding: '6px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px'
  },
  scoreCircle: {
    position: 'relative',
    width: '80px',
    height: '80px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  scoreText: {
    position: 'absolute',
    fontSize: '18px',
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'monospace'
  },
  proficiencyLevel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600',
    textTransform: 'capitalize'
  },
  summaryContainer: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '32px'
  },
  summaryTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#fff',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  summaryContent: {
    color: '#d1d5db',
    lineHeight: '1.6',
    fontSize: '15px'
  },
  continueButton: {
    width: '100%',
    padding: '16px 32px',
    fontSize: '18px',
    fontWeight: '700',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed'
  }
};

export default AssessmentResultModal;