// src/pages/Onboarding.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { onboardingService } from '../services/onboardingService';
import { Code, BookOpen, Calendar, Check } from 'lucide-react';
import CodingChallengeStep from '../components/PreAssessmentModal';
import AssessmentResultModal from '../components/AssessmentResultModal';

// Background decorative component
const BackgroundDecorations = React.memo(() => {
  const backgroundStyles = {
    geometricShape: {
      position: 'absolute',
      width: '300px',
      height: '300px',
      border: '2px solid rgba(59, 130, 246, 0.1)',
      borderRadius: '50%',
      pointerEvents: 'none',
      opacity: 0.3
    },
    codeSymbol: {
      position: 'absolute',
      fontSize: '120px',
      opacity: 0.04,
      pointerEvents: 'none',
      fontFamily: 'monospace',
      fontWeight: 'bold'
    }
  };

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div className="floating-shape" style={{...backgroundStyles.geometricShape, right: '10%', top: '15%', animationDelay: '0s'}} />
      <div className="floating-shape" style={{...backgroundStyles.geometricShape, left: '5%', bottom: '20%', animationDelay: '2s', width: '200px', height: '200px'}} />
      <div className="floating-symbol" style={{...backgroundStyles.codeSymbol, right: '15%', bottom: '10%', color: '#3b82f6', transform: 'rotate(15deg)'}}>&#123;&#125;</div>
      <div className="floating-symbol" style={{...backgroundStyles.codeSymbol, left: '10%', top: '10%', color: '#8b5cf6', transform: 'rotate(-20deg)'}}>&#60;&#62;</div>
      <div className="floating-symbol" style={{...backgroundStyles.codeSymbol, left: '35%', top: '5%', color: '#454B68', transform: 'rotate(-35deg)'}}>&#60;/&#62;</div>
    </div>
  );
});

function Onboarding() {
  const { user, token, updateUser, refreshUser } = useAuth();
  const navigate = useNavigate();

  // State management
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Data states
  const [programmingLanguages, setProgrammingLanguages] = useState([]);
  const [topics, setTopics] = useState([]);
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [yearsExperience, setYearsExperience] = useState(0);

  // Challenge states
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [challengeResults, setChallengeResults] = useState([]);
  const [showResultModal, setShowResultModal] = useState(false);
  const [allChallengesComplete, setAllChallengesComplete] = useState(false);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setInitialLoading(true);
        setError('');

        const [languagesResponse, topicsResponse] = await Promise.all([
          onboardingService.getProgrammingLanguages(),
          onboardingService.getTopics()
        ]);

        if (languagesResponse.success) {
          setProgrammingLanguages(languagesResponse.data);
        } else {
          throw new Error('Failed to load programming languages');
        }

        if (topicsResponse.success) {
          setTopics(topicsResponse.data);
        } else {
          throw new Error('Failed to load topics');
        }

      } catch (error) {
        console.error('Error loading onboarding data:', error);
        setError('Failed to load onboarding data. Please refresh the page.');
      } finally {
        setInitialLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Handle language selection (no minimum required but recommend 3)
  const handleLanguageToggle = (language) => {
    const isSelected = selectedLanguages.find(l => l.language_id === language.id);
    
    if (isSelected) {
      setSelectedLanguages(selectedLanguages.filter(l => l.language_id !== language.id));
    } else {
      setSelectedLanguages([...selectedLanguages, {
        language_id: language.id,
        name: language.name,
        proficiency_level: 'beginner' // Will be determined by assessment
      }]);
    }
  };

  // Handle topic selection (no minimum required)
  const handleTopicToggle = (topic) => {
    const isSelected = selectedTopics.find(t => t.topic_id === topic.id);
    
    if (isSelected) {
      setSelectedTopics(selectedTopics.filter(t => t.topic_id !== topic.id));
    } else {
      setSelectedTopics([...selectedTopics, {
        topic_id: topic.id,
        name: topic.name,
        interest_level: 'high',
        experience_level: 'beginner'
      }]);
    }
  };

  // Handle challenge completion
  const handleChallengeComplete = (result) => {
    const updatedResults = [...challengeResults, {
      languageId: selectedLanguages[currentChallengeIndex].language_id,
      languageName: selectedLanguages[currentChallengeIndex].name,
      ...result
    }];
    
    setChallengeResults(updatedResults);

    // Check if all challenges are complete
    if (currentChallengeIndex < selectedLanguages.length - 1) {
      setCurrentChallengeIndex(currentChallengeIndex + 1);
    } else {
      setAllChallengesComplete(true);
      setShowResultModal(true);
    }
  };

  // Determine proficiency level based on score
  const determineProficiencyLevel = (score) => {
    if (score >= 90) return 'expert';
    if (score >= 75) return 'advanced';
    if (score >= 60) return 'intermediate';
    return 'beginner';
  };

  // Complete onboarding with assessment results
  const handleCompleteOnboarding = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');

      // Build languages array with assessed proficiency levels
      const languagesWithProficiency = selectedLanguages.map((lang) => {
        const result = challengeResults.find(r => r.languageId === lang.language_id);
        const proficiencyLevel = result 
          ? determineProficiencyLevel(result.score)
          : 'beginner';

        return {
          language_id: lang.language_id,
          proficiency_level: proficiencyLevel,
          years_experience: yearsExperience || 0
        };
      });

      const result = await onboardingService.completeOnboarding({
        languages: languagesWithProficiency,
        topics: selectedTopics,
        years_experience: yearsExperience
      }, token);

      if (result.success) {
        setSuccessMessage('Onboarding completed successfully!');
        
        if (result.data?.user) {
          await updateUser(result.data.user, true);
        } else {
          await refreshUser();
        }
        
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        const errorMsg = result.message || 'Failed to complete onboarding. Please try again.';
        setError(errorMsg);
      }

    } catch (error) {
      const errorMessage = error.message || 'Failed to complete onboarding. Please try again.';
      console.error('Complete onboarding error:', error);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle step navigation
  const handleNextStep = () => {
    setError('');
    
    if (currentStep === 1 && selectedLanguages.length === 0) {
      setError('Please select at least one programming language.');
      return;
    }
    
    if (currentStep === 2 && selectedTopics.length === 0) {
      setError('Please select at least one topic.');
      return;
    }

    setCurrentStep(currentStep + 1);
  };

  const handlePrevStep = () => {
    setCurrentStep(Math.max(1, currentStep - 1));
  };

  if (initialLoading) {
    return (
      <div style={styles.container}>
        <BackgroundDecorations />
        <div style={styles.loadingContainer}>
          <div className="spinner" />
          <p style={styles.loadingText}>Loading onboarding...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <BackgroundDecorations />
      
      <div style={styles.content}>
        {/* Progress indicator */}
        <div style={styles.progressContainer}>
          <div style={styles.progressBar}>
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                style={{
                  ...styles.progressStep,
                  ...(step <= currentStep ? styles.progressStepActive : {}),
                  ...(step < currentStep ? styles.progressStepComplete : {})
                }}
              >
                {step < currentStep ? <Check size={16} /> : step}
              </div>
            ))}
          </div>
          <div style={styles.progressLabel}>
            Step {currentStep} of 4
          </div>
        </div>

        {/* Error/Success messages */}
        {error && <div style={styles.error}>{error}</div>}
        {successMessage && <div style={styles.success}>{successMessage}</div>}

        {/* Step 1: Select Programming Languages */}
        {currentStep === 1 && (
          <div style={styles.stepContainer}>
            <div style={styles.stepHeader}>
              <Code size={32} style={{ color: '#3b82f6' }} />
              <h2 style={styles.stepTitle}>Select Your Programming Languages</h2>
              <p style={styles.stepSubtitle}>
                Choose at least 1 language. We recommend selecting 3 for better project recommendations.
              </p>
            </div>

            <div style={styles.grid}>
              {programmingLanguages.map((language) => {
                const isSelected = selectedLanguages.find(l => l.language_id === language.id);
                return (
                  <div
                    key={language.id}
                    onClick={() => handleLanguageToggle(language)}
                    style={{
                      ...styles.card,
                      ...(isSelected ? styles.cardSelected : {})
                    }}
                    className="selectable-card"
                  >
                    <div style={styles.cardHeader}>
                      <h3 style={styles.cardTitle}>{language.name}</h3>
                      {isSelected && (
                        <Check size={20} style={{ color: '#3b82f6' }} />
                      )}
                    </div>
                    {language.description && (
                      <p style={styles.cardDescription}>{language.description}</p>
                    )}
                  </div>
                );
              })}
            </div>

            {selectedLanguages.length > 0 && (
              <div style={styles.selectionCount}>
                Selected: {selectedLanguages.length} language{selectedLanguages.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Topics */}
        {currentStep === 2 && (
          <div style={styles.stepContainer}>
            <div style={styles.stepHeader}>
              <BookOpen size={32} style={{ color: '#8b5cf6' }} />
              <h2 style={styles.stepTitle}>Select Your Interests</h2>
              <p style={styles.stepSubtitle}>
                Choose topics you're interested in learning or working with.
              </p>
            </div>

            <div style={styles.grid}>
              {topics.map((topic) => {
                const isSelected = selectedTopics.find(t => t.topic_id === topic.id);
                return (
                  <div
                    key={topic.id}
                    onClick={() => handleTopicToggle(topic)}
                    style={{
                      ...styles.card,
                      ...(isSelected ? styles.cardSelected : {})
                    }}
                    className="selectable-card"
                  >
                    <div style={styles.cardHeader}>
                      <h3 style={styles.cardTitle}>{topic.name}</h3>
                      {isSelected && (
                        <Check size={20} style={{ color: '#8b5cf6' }} />
                      )}
                    </div>
                    {topic.category && (
                      <p style={styles.cardCategory}>{topic.category}</p>
                    )}
                  </div>
                );
              })}
            </div>

            {selectedTopics.length > 0 && (
              <div style={styles.selectionCount}>
                Selected: {selectedTopics.length} topic{selectedTopics.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Years of Experience */}
        {currentStep === 3 && (
          <div style={styles.stepContainer}>
            <div style={styles.stepHeader}>
              <Calendar size={32} style={{ color: '#10b981' }} />
              <h2 style={styles.stepTitle}>Programming Experience</h2>
              <p style={styles.stepSubtitle}>
                How many years have you been programming?
              </p>
            </div>

            <div style={styles.experienceContainer}>
              <div style={styles.experienceSlider}>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(parseInt(e.target.value))}
                  style={styles.slider}
                />
                <div style={styles.experienceValue}>
                  {yearsExperience} {yearsExperience === 1 ? 'year' : 'years'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Pre-Assessment Challenges */}
        {currentStep === 4 && !allChallengesComplete && (
          <CodingChallengeStep
            language={selectedLanguages[currentChallengeIndex]}
            challengeIndex={currentChallengeIndex}
            totalChallenges={selectedLanguages.length}
            onComplete={handleChallengeComplete}
            userId={user?.id}
            token={token}
          />
        )}

        {/* Navigation Buttons */}
        {currentStep !== 4 && (
          <div style={styles.navigationButtons}>
            {currentStep > 1 && (
              <button
                onClick={handlePrevStep}
                style={{
                  ...styles.navButton,
                  ...styles.secondaryButton
                }}
                className="nav-button secondary-button"
              >
                Previous
              </button>
            )}

            <button
              onClick={handleNextStep}
              style={{
                ...styles.navButton,
                ...styles.primaryButton
              }}
              className="nav-button primary-button"
            >
              Continue
            </button>
          </div>
        )}

        {/* Result Modal */}
        {showResultModal && (
          <AssessmentResultModal
            results={challengeResults}
            selectedLanguages={selectedLanguages}
            onComplete={handleCompleteOnboarding}
            loading={loading}
            determineProficiencyLevel={determineProficiencyLevel}
          />
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    position: 'relative',
    overflow: 'hidden'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: '1rem'
  },
  loadingText: {
    color: '#e5e7eb',
    fontSize: '1.1rem'
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '3rem 2rem',
    position: 'relative',
    zIndex: 1
  },
  progressContainer: {
    marginBottom: '3rem',
    textAlign: 'center'
  },
  progressBar: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
    marginBottom: '1rem'
  },
  progressStep: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '2px solid rgba(255, 255, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9ca3af',
    fontWeight: 'bold',
    transition: 'all 0.3s ease'
  },
  progressStepActive: {
    background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
    border: '2px solid #3b82f6',
    color: 'white',
    boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)'
  },
  progressStepComplete: {
    background: 'linear-gradient(135deg, #10b981, #34d399)',
    border: '2px solid #10b981',
    color: 'white'
  },
  progressLabel: {
    color: '#e5e7eb',
    fontSize: '0.9rem',
    fontWeight: '500'
  },
  error: {
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: '2rem',
    padding: '1rem 2rem',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '500'
  },
  success: {
    color: '#22c55e',
    textAlign: 'center',
    marginBottom: '2rem',
    padding: '1rem 2rem',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.2)',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '500'
  },
  stepContainer: {
    animation: 'fadeIn 0.5s ease-in-out'
  },
  stepHeader: {
    textAlign: 'center',
    marginBottom: '3rem'
  },
  stepTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: 'white',
    marginTop: '1rem',
    marginBottom: '0.5rem'
  },
  stepSubtitle: {
    fontSize: '1.1rem',
    color: '#94a3b8',
    maxWidth: '600px',
    margin: '0 auto'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  card: {
    padding: '1.5rem',
    background: 'rgba(26, 28, 32, 0.8)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  cardSelected: {
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(96, 165, 250, 0.1))',
    border: '2px solid #3b82f6',
    boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem'
  },
  cardTitle: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: 'white',
    margin: 0
  },
  cardDescription: {
    fontSize: '0.9rem',
    color: '#94a3b8',
    margin: 0
  },
  cardCategory: {
    fontSize: '0.85rem',
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: '0.5rem'
  },
  selectionCount: {
    textAlign: 'center',
    color: '#3b82f6',
    fontSize: '1rem',
    fontWeight: '600',
    padding: '1rem',
    background: 'rgba(59, 130, 246, 0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(59, 130, 246, 0.2)'
  },
  experienceContainer: {
    maxWidth: '500px',
    margin: '3rem auto'
  },
  experienceSlider: {
    padding: '2rem',
    background: 'rgba(26, 28, 32, 0.8)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px'
  },
  slider: {
    width: '100%',
    height: '8px',
    borderRadius: '4px',
    outline: 'none',
    background: 'linear-gradient(90deg, #3b82f6, #10b981)',
    cursor: 'pointer'
  },
  experienceValue: {
    textAlign: 'center',
    fontSize: '2rem',
    fontWeight: 'bold',
    color: 'white',
    marginTop: '1.5rem'
  },
  navigationButtons: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
    marginTop: '3rem'
  },
  navButton: {
    padding: '0.875rem 2rem',
    fontSize: '1rem',
    fontWeight: '600',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  primaryButton: {
    background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
    color: 'white',
    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
  },
  secondaryButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    color: '#e5e7eb',
    border: '1px solid rgba(255, 255, 255, 0.2)'
  }
};

export default Onboarding;