// src/pages/Onboarding.js
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { onboardingService } from '../services/onboardingService';
import { 
  ArrowLeft, 
  Target, 
  Code2, 
  BookOpen, 
  Clock, 
  CheckCircle, 
  Sparkles,
  Shield,
  Zap,
  Radio,
  ChevronRight,
  Trophy
} from 'lucide-react';
import PreAssessmentModal from '../components/PreAssessmentModal';
import AssessmentResultModal from '../components/AssessmentResultModal';

// Isolated background styles - never changes
const backgroundStyles = {
  backgroundLayer: {
    position: 'fixed',
    inset: 0,
    zIndex: 1
  },
  figmaBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    overflow: 'hidden'
  },
  codeSymbol: {
    position: 'absolute',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontStyle: 'normal',
    fontWeight: 900,
    fontSize: '24px',
    lineHeight: '29px',
    userSelect: 'none',
    pointerEvents: 'none'
  }
};

// Completely isolated background component
const IsolatedAnimatedBackground = React.memo(() => (
  <div style={backgroundStyles.backgroundLayer}>
    <div style={backgroundStyles.figmaBackground}>
      <div className="floating-symbol" style={{...backgroundStyles.codeSymbol, left: '52.81%', top: '48.12%', color: '#2E3344', transform: 'rotate(-10.79deg)'}}>&#60;/&#62;</div>
      <div className="floating-symbol" style={{...backgroundStyles.codeSymbol, left: '28.19%', top: '71.22%', color: '#292A2E', transform: 'rotate(-37.99deg)'}}>&#60;/&#62;</div>
      <div className="floating-symbol" style={{...backgroundStyles.codeSymbol, left: '95.09%', top: '48.12%', color: '#ABB5CE', transform: 'rotate(34.77deg)'}}>&#60;/&#62;</div>
      <div className="floating-symbol" style={{...backgroundStyles.codeSymbol, left: '86.46%', top: '15.33%', color: '#2E3344', transform: 'rotate(28.16deg)'}}>&#60;/&#62;</div>
      <div className="floating-symbol" style={{...backgroundStyles.codeSymbol, left: '7.11%', top: '80.91%', color: '#ABB5CE', transform: 'rotate(24.5deg)'}}>&#60;/&#62;</div>
      <div className="floating-symbol" style={{...backgroundStyles.codeSymbol, left: '48.06%', top: '8.5%', color: '#ABB5CE', transform: 'rotate(25.29deg)'}}>&#60;/&#62;</div>
      <div className="floating-symbol" style={{...backgroundStyles.codeSymbol, left: '72.84%', top: '4.42%', color: '#2E3344', transform: 'rotate(-19.68deg)'}}>&#60;/&#62;</div>
      <div className="floating-symbol" style={{...backgroundStyles.codeSymbol, left: '9.6%', top: '0%', color: '#1F232E', transform: 'rotate(-6.83deg)'}}>&#60;/&#62;</div>
      <div className="floating-symbol" style={{...backgroundStyles.codeSymbol, left: '31.54%', top: '54.31%', color: '#6C758E', transform: 'rotate(25.29deg)'}}>&#60;/&#62;</div>
      <div className="floating-symbol" style={{...backgroundStyles.codeSymbol, left: '25.28%', top: '15.89%', color: '#1F232E', transform: 'rotate(-6.83deg)'}}>&#60;/&#62;</div>
      <div className="floating-symbol" style={{...backgroundStyles.codeSymbol, left: '48.55%', top: '82.45%', color: '#292A2E', transform: 'rotate(-10.79deg)'}}>&#60;/&#62;</div>
      <div className="floating-symbol" style={{...backgroundStyles.codeSymbol, left: '24.41%', top: '92.02%', color: '#2E3344', transform: 'rotate(18.2deg)'}}>&#60;/&#62;</div>
      <div className="floating-symbol" style={{...backgroundStyles.codeSymbol, left: '0%', top: '12.8%', color: '#ABB5CE', transform: 'rotate(37.85deg)'}}>&#60;/&#62;</div>
      <div className="floating-symbol" style={{...backgroundStyles.codeSymbol, left: '81.02%', top: '94.27%', color: '#6C758E', transform: 'rotate(-37.99deg)'}}>&#60;/&#62;</div>
      <div className="floating-symbol" style={{...backgroundStyles.codeSymbol, left: '96.02%', top: '0%', color: '#2E3344', transform: 'rotate(-37.99deg)'}}>&#60;/&#62;</div>
      <div className="floating-symbol" style={{...backgroundStyles.codeSymbol, left: '0.07%', top: '41.2%', color: '#6C758E', transform: 'rotate(-10.79deg)'}}>&#60;/&#62;</div>
      <div className="floating-symbol" style={{...backgroundStyles.codeSymbol, left: '15%', top: '35%', color: '#3A4158', transform: 'rotate(15deg)'}}>&#60;/&#62;</div>
      <div className="floating-symbol" style={{...backgroundStyles.codeSymbol, left: '65%', top: '25%', color: '#5A6B8C', transform: 'rotate(-45deg)'}}>&#60;/&#62;</div>
      <div className="floating-symbol" style={{...backgroundStyles.codeSymbol, left: '85%', top: '65%', color: '#2B2F3E', transform: 'rotate(30deg)'}}>&#60;/&#62;</div>
      <div className="floating-symbol" style={{...backgroundStyles.codeSymbol, left: '42%', top: '35%', color: '#4F5A7A', transform: 'rotate(-20deg)'}}>&#60;/&#62;</div>
      <div className="floating-symbol" style={{...backgroundStyles.codeSymbol, left: '12%', top: '60%', color: '#8A94B8', transform: 'rotate(40deg)'}}>&#60;/&#62;</div>
      <div className="floating-symbol" style={{...backgroundStyles.codeSymbol, left: '78%', top: '85%', color: '#3E4A6B', transform: 'rotate(-25deg)'}}>&#60;/&#62;</div>
      <div className="floating-symbol" style={{...backgroundStyles.codeSymbol, left: '58%', top: '75%', color: '#6D798F', transform: 'rotate(10deg)'}}>&#60;/&#62;</div>
      <div className="floating-symbol" style={{...backgroundStyles.codeSymbol, left: '35%', top: '5%', color: '#454B68', transform: 'rotate(-35deg)'}}>&#60;/&#62;</div>
    </div>
  </div>
));

// Step icons mapping
const stepIcons = {
  1: Code2,
  2: BookOpen,
  3: Clock,
  4: Target
};

const stepLabels = {
  1: 'Languages',
  2: 'Topics',
  3: 'Experience',
  4: 'Assessment'
};

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

  // Handle language selection
  const handleLanguageToggle = (language) => {
    const isSelected = selectedLanguages.find(l => l.language_id === language.id);
    
    if (isSelected) {
      setSelectedLanguages(selectedLanguages.filter(l => l.language_id !== language.id));
    } else {
      setSelectedLanguages([...selectedLanguages, {
        language_id: language.id,
        name: language.name,
        proficiency_level: 'beginner'
      }]);
    }
  };

  // Handle topic selection
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

  const getExperienceLevel = (years) => {
    if (years === 0) return { label: 'Newcomer', color: '#10b981', icon: '🌱' };
    if (years <= 2) return { label: 'Junior', color: '#3b82f6', icon: '⚡' };
    if (years <= 5) return { label: 'Intermediate', color: '#8b5cf6', icon: '🔥' };
    if (years <= 10) return { label: 'Senior', color: '#f59e0b', icon: '⭐' };
    return { label: 'Expert', color: '#ef4444', icon: '👑' };
  };

  const styles = useMemo(() => ({
    pageContainer: {
      minHeight: '100vh',
      backgroundColor: '#0F1116',
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    gridOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundImage: `
        linear-gradient(rgba(59, 130, 246, 0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(59, 130, 246, 0.02) 1px, transparent 1px)
      `,
      backgroundSize: '50px 50px',
      pointerEvents: 'none',
      zIndex: 2
    },
    cornerAccent: {
      position: 'fixed',
      width: '100px',
      height: '100px',
      pointerEvents: 'none',
      zIndex: 3
    },
    container: {
      position: 'relative',
      zIndex: 10,
      maxWidth: '900px',
      width: '100%',
      padding: '1rem'
    },
    mainCard: {
      position: 'relative',
      background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, rgba(7, 11, 20, 0.9) 100%)',
      borderRadius: '24px',
      border: '1px solid rgba(59, 130, 246, 0.15)',
      padding: '2.5rem',
      overflow: 'hidden'
    },
    cardGridOverlay: {
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
      borderRadius: '24px'
    },
    scanLine: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '2px',
      background: 'linear-gradient(90deg, transparent, #3b82f6, #8b5cf6, transparent)',
      boxShadow: '0 0 15px #3b82f6',
      zIndex: 2
    },
    header: {
      textAlign: 'center',
      marginBottom: '2rem',
      position: 'relative',
      zIndex: 3
    },
    hexagonContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '1.5rem'
    },
    hexagonBadge: {
      position: 'relative',
      width: '70px',
      height: '80px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
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
    statusBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 14px',
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
      border: '1px solid rgba(16, 185, 129, 0.3)',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: '600',
      color: '#10b981',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      marginBottom: '1rem'
    },
    title: {
      fontSize: '2rem',
      fontWeight: '800',
      color: 'white',
      marginBottom: '0.75rem',
      letterSpacing: '-0.025em',
      background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text'
    },
    subtitle: {
      fontSize: '1rem',
      color: '#64748b',
      marginBottom: '0',
      fontWeight: '400'
    },
    progressContainer: {
      marginBottom: '2rem',
      position: 'relative',
      zIndex: 3
    },
    progressBar: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '0',
      marginBottom: '1rem',
      position: 'relative'
    },
    progressLine: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '280px',
      height: '2px',
      background: 'rgba(255, 255, 255, 0.1)',
      zIndex: 0
    },
    progressLineFill: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      height: '2px',
      background: 'linear-gradient(90deg, #10b981, #3b82f6)',
      zIndex: 1,
      transition: 'width 0.5s ease'
    },
    progressStepContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      zIndex: 2,
      padding: '0 20px'
    },
    progressStep: {
      width: '48px',
      height: '48px',
      borderRadius: '14px',
      background: 'rgba(15, 23, 42, 0.9)',
      border: '2px solid rgba(255, 255, 255, 0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#64748b',
      fontWeight: 'bold',
      fontSize: '0.875rem',
      transition: 'all 0.3s ease',
      position: 'relative'
    },
    progressStepActive: {
      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.1))',
      border: '2px solid #3b82f6',
      color: '#3b82f6',
      boxShadow: '0 0 25px rgba(59, 130, 246, 0.3)'
    },
    progressStepComplete: {
      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.1))',
      border: '2px solid #10b981',
      color: '#10b981'
    },
    progressStepLabel: {
      fontSize: '11px',
      color: '#64748b',
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    progressStepLabelActive: {
      color: '#3b82f6'
    },
    progressStepLabelComplete: {
      color: '#10b981'
    },
    stepContainer: {
      marginBottom: '2rem',
      textAlign: 'center',
      position: 'relative',
      zIndex: 3
    },
    stepHeader: {
      marginBottom: '1.5rem'
    },
    stepBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      border: '1px solid rgba(59, 130, 246, 0.2)',
      borderRadius: '12px',
      marginBottom: '1rem'
    },
    stepBadgeText: {
      fontSize: '12px',
      fontWeight: '600',
      color: '#3b82f6',
      textTransform: 'uppercase',
      letterSpacing: '1px'
    },
    stepTitle: {
      fontSize: '1.5rem',
      fontWeight: '700',
      color: 'white',
      marginBottom: '0.75rem',
      lineHeight: '1.3'
    },
    stepSubtitle: {
      fontSize: '0.95rem',
      color: '#64748b',
      marginBottom: '0'
    },
    buttonGrid: {
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: '10px',
      marginBottom: '1.5rem',
      width: '100%',
      margin: '0 auto 1.5rem auto'
    },
    pillButton: {
      padding: '12px 20px',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '12px',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      color: '#94a3b8',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      fontSize: '14px',
      fontWeight: '600',
      textAlign: 'center',
      flex: '0 0 auto',
      whiteSpace: 'nowrap',
      backdropFilter: 'blur(8px)'
    },
    selectedPillButton: {
      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.15))',
      border: '1px solid rgba(59, 130, 246, 0.5)',
      color: '#93c5fd',
      boxShadow: '0 0 20px rgba(59, 130, 246, 0.2)',
      transform: 'scale(1.02)'
    },
    selectionCount: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      textAlign: 'center',
      color: '#3b82f6',
      fontSize: '14px',
      fontWeight: '600',
      padding: '12px 24px',
      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.05))',
      borderRadius: '12px',
      border: '1px solid rgba(59, 130, 246, 0.2)',
      marginTop: '1rem'
    },
    experienceContainer: {
      maxWidth: '450px',
      margin: '2rem auto',
      padding: '2rem',
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(7, 11, 20, 0.9) 100%)',
      border: '1px solid rgba(59, 130, 246, 0.2)',
      borderRadius: '20px',
      position: 'relative',
      overflow: 'hidden'
    },
    experienceHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      marginBottom: '1.5rem'
    },
    experienceIconContainer: {
      width: '48px',
      height: '48px',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid'
    },
    experienceInputContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1rem'
    },
    experienceInputWrapper: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    experienceButton: {
      width: '44px',
      height: '44px',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      background: 'rgba(255, 255, 255, 0.05)',
      color: '#94a3b8',
      fontSize: '20px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s ease'
    },
    experienceInput: {
      fontSize: '2.5rem',
      padding: '0.5rem 1rem',
      background: 'transparent',
      border: 'none',
      borderBottom: '2px solid rgba(59, 130, 246, 0.3)',
      textAlign: 'center',
      width: '120px',
      color: 'white',
      fontWeight: '800',
      fontFamily: 'monospace',
      transition: 'all 0.3s ease',
      outline: 'none'
    },
    experienceLevelBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 20px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '600',
      marginTop: '0.5rem',
      border: '1px solid'
    },
    experienceText: {
      fontSize: '14px',
      color: '#64748b',
      fontWeight: '500',
      marginTop: '0.5rem'
    },
    navigationButtons: {
      display: 'flex',
      justifyContent: 'center',
      gap: '1rem',
      marginTop: '2rem',
      position: 'relative',
      zIndex: 3
    },
    navButton: {
      padding: '14px 32px',
      border: 'none',
      borderRadius: '14px',
      cursor: 'pointer',
      fontSize: '15px',
      fontWeight: '700',
      transition: 'all 0.3s ease',
      minWidth: '160px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      position: 'relative',
      overflow: 'hidden'
    },
    primaryButton: {
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      color: 'white',
      boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)'
    },
    secondaryButton: {
      background: 'rgba(255, 255, 255, 0.05)',
      color: '#94a3b8',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    },
    buttonGlow: {
      position: 'absolute',
      top: 0,
      left: '-100%',
      width: '100%',
      height: '100%',
      background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)'
    },
    buttonDisabled: {
      background: 'rgba(107, 114, 128, 0.3)',
      color: '#64748b',
      cursor: 'not-allowed',
      boxShadow: 'none'
    },
    error: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      color: '#fca5a5',
      textAlign: 'center',
      marginBottom: '1.5rem',
      padding: '1rem 1.5rem',
      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(185, 28, 28, 0.05))',
      border: '1px solid rgba(239, 68, 68, 0.2)',
      borderRadius: '14px',
      fontSize: '14px',
      fontWeight: '500',
      position: 'relative',
      zIndex: 3
    },
    success: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      color: '#86efac',
      textAlign: 'center',
      marginBottom: '1.5rem',
      padding: '1rem 1.5rem',
      background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(5, 150, 105, 0.05))',
      border: '1px solid rgba(34, 197, 94, 0.2)',
      borderRadius: '14px',
      fontSize: '14px',
      fontWeight: '500',
      position: 'relative',
      zIndex: 3
    },
    challengeContainer: {
      position: 'relative',
      zIndex: 20
    },
    backButton: {
      position: 'fixed',
      top: '2rem',
      left: '2rem',
      zIndex: 50,
      padding: '12px 20px',
      background: 'rgba(15, 17, 22, 0.95)',
      backdropFilter: 'blur(24px)',
      color: '#94a3b8',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '14px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
    },
    // Loading state styles
    loadingContainer: {
      position: 'relative',
      zIndex: 10,
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    },
    loadingCard: {
      background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, rgba(7, 11, 20, 0.9) 100%)',
      borderRadius: '24px',
      border: '1px solid rgba(59, 130, 246, 0.15)',
      padding: '3rem',
      position: 'relative',
      overflow: 'hidden'
    },
    radarContainer: {
      position: 'relative',
      width: '100px',
      height: '100px',
      marginBottom: '24px'
    },
    radarRing: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: '100%',
      height: '100%',
      transform: 'translate(-50%, -50%)',
      borderRadius: '50%',
      border: '2px solid rgba(59, 130, 246, 0.3)'
    },
    radarCenter: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '50px',
      height: '50px',
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
      borderRadius: '50%'
    },
    loadingTitle: {
      fontSize: '24px',
      fontWeight: '700',
      color: 'white',
      marginBottom: '8px'
    },
    loadingText: {
      color: '#64748b',
      fontSize: '14px',
      marginBottom: '24px'
    },
    loadingProgress: {
      width: '200px',
      height: '4px',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '2px',
      overflow: 'hidden'
    },
    loadingProgressFill: {
      width: '60px',
      height: '100%',
      background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
      borderRadius: '2px'
    }
  }), []);

  const hoverStyles = `
    /* GLOBAL SYNCHRONIZED LOGO ROTATION */
    @keyframes globalLogoRotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .global-loading-spinner {
      animation: globalLogoRotate 2s linear infinite;
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
    
    @keyframes scanLine {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    
    @keyframes radarPulse {
      0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.8; }
      100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
    }
    
    @keyframes pulseDot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.8); }
    }
    
    @keyframes slideProgress {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(400%); }
    }

    /* FLOATING BACKGROUND SYMBOLS */
    @keyframes floatAround1 {
      0%, 100% { transform: translate(0, 0) rotate(-10.79deg); }
      25% { transform: translate(30px, -20px) rotate(-5deg); }
      50% { transform: translate(-15px, 25px) rotate(-15deg); }
      75% { transform: translate(20px, 10px) rotate(-8deg); }
    }

    @keyframes floatAround2 {
      0%, 100% { transform: translate(0, 0) rotate(-37.99deg); }
      33% { transform: translate(-25px, 15px) rotate(-30deg); }
      66% { transform: translate(35px, -10px) rotate(-45deg); }
    }

    @keyframes floatAround3 {
      0%, 100% { transform: translate(0, 0) rotate(34.77deg); }
      20% { transform: translate(-20px, -30px) rotate(40deg); }
      40% { transform: translate(25px, 20px) rotate(28deg); }
      60% { transform: translate(-10px, -15px) rotate(38deg); }
      80% { transform: translate(15px, 25px) rotate(30deg); }
    }

    @keyframes floatAround4 {
      0%, 100% { transform: translate(0, 0) rotate(28.16deg); }
      50% { transform: translate(-40px, 30px) rotate(35deg); }
    }

    @keyframes floatAround5 {
      0%, 100% { transform: translate(0, 0) rotate(24.5deg); }
      25% { transform: translate(20px, -25px) rotate(30deg); }
      50% { transform: translate(-30px, 20px) rotate(18deg); }
      75% { transform: translate(25px, 15px) rotate(28deg); }
    }

    @keyframes floatAround6 {
      0%, 100% { transform: translate(0, 0) rotate(25.29deg); }
      33% { transform: translate(-15px, -20px) rotate(30deg); }
      66% { transform: translate(30px, 25px) rotate(20deg); }
    }

    @keyframes driftSlow {
      0%, 100% { transform: translate(0, 0) rotate(-19.68deg); }
      25% { transform: translate(-35px, 20px) rotate(-25deg); }
      50% { transform: translate(20px, -30px) rotate(-15deg); }
      75% { transform: translate(-10px, 35px) rotate(-22deg); }
    }

    @keyframes gentleDrift {
      0%, 100% { transform: translate(0, 0) rotate(-6.83deg); }
      50% { transform: translate(25px, -40px) rotate(-2deg); }
    }

    @keyframes spiralFloat {
      0%, 100% { transform: translate(0, 0) rotate(0deg); }
      25% { transform: translate(20px, -20px) rotate(5deg); }
      50% { transform: translate(0px, -40px) rotate(10deg); }
      75% { transform: translate(-20px, -20px) rotate(5deg); }
    }

    @keyframes waveMotion {
      0%, 100% { transform: translate(0, 0) rotate(15deg); }
      25% { transform: translate(30px, 10px) rotate(20deg); }
      50% { transform: translate(15px, -25px) rotate(10deg); }
      75% { transform: translate(-15px, 10px) rotate(18deg); }
    }

    @keyframes circularDrift {
      0%, 100% { transform: translate(0, 0) rotate(-45deg); }
      25% { transform: translate(25px, 0px) rotate(-40deg); }
      50% { transform: translate(25px, 25px) rotate(-50deg); }
      75% { transform: translate(0px, 25px) rotate(-42deg); }
    }

    .floating-symbol {
      animation-timing-function: ease-in-out;
      animation-iteration-count: infinite;
    }

    .floating-symbol:nth-child(1) { animation: floatAround1 15s infinite; }
    .floating-symbol:nth-child(2) { animation: floatAround2 18s infinite; animation-delay: -2s; }
    .floating-symbol:nth-child(3) { animation: floatAround3 12s infinite; animation-delay: -5s; }
    .floating-symbol:nth-child(4) { animation: floatAround4 20s infinite; animation-delay: -8s; }
    .floating-symbol:nth-child(5) { animation: floatAround5 16s infinite; animation-delay: -3s; }
    .floating-symbol:nth-child(6) { animation: floatAround6 14s infinite; animation-delay: -7s; }
    .floating-symbol:nth-child(7) { animation: driftSlow 22s infinite; animation-delay: -10s; }
    .floating-symbol:nth-child(8) { animation: gentleDrift 19s infinite; animation-delay: -1s; }
    .floating-symbol:nth-child(9) { animation: spiralFloat 17s infinite; animation-delay: -6s; }
    .floating-symbol:nth-child(10) { animation: waveMotion 13s infinite; animation-delay: -4s; }
    .floating-symbol:nth-child(11) { animation: circularDrift 21s infinite; animation-delay: -9s; }
    .floating-symbol:nth-child(12) { animation: floatAround1 16s infinite; animation-delay: -2s; }
    .floating-symbol:nth-child(13) { animation: floatAround2 18s infinite; animation-delay: -11s; }
    .floating-symbol:nth-child(14) { animation: floatAround3 14s infinite; animation-delay: -5s; }
    .floating-symbol:nth-child(15) { animation: floatAround4 19s infinite; animation-delay: -7s; }
    .floating-symbol:nth-child(16) { animation: floatAround5 23s infinite; animation-delay: -3s; }
    .floating-symbol:nth-child(17) { animation: driftSlow 15s infinite; animation-delay: -8s; }
    .floating-symbol:nth-child(18) { animation: gentleDrift 17s infinite; animation-delay: -1s; }
    .floating-symbol:nth-child(19) { animation: spiralFloat 20s infinite; animation-delay: -12s; }
    .floating-symbol:nth-child(20) { animation: waveMotion 18s infinite; animation-delay: -6s; }
    .floating-symbol:nth-child(21) { animation: circularDrift 16s infinite; animation-delay: -4s; }
    .floating-symbol:nth-child(22) { animation: floatAround1 14s infinite; animation-delay: -9s; }
    .floating-symbol:nth-child(23) { animation: floatAround2 16s infinite; animation-delay: -3s; }
    .floating-symbol:nth-child(24) { animation: driftSlow 18s infinite; animation-delay: -7s; }

    .main-card {
      animation: borderGlow 4s ease-in-out infinite;
    }
    
    .hexagon-badge {
      animation: hexPulse 3s ease-in-out infinite;
    }
    
    .scan-line {
      animation: scanLine 3s ease-in-out infinite;
    }
    
    .button-glow {
      animation: shimmer 2s ease-in-out infinite;
    }
    
    .radar-ring {
      animation: radarPulse 2s ease-out infinite;
    }
    
    .radar-ring-delayed {
      animation: radarPulse 2s ease-out infinite;
      animation-delay: 1s;
    }
    
    .pulse-dot {
      animation: pulseDot 1s ease-in-out infinite;
    }
    
    .loading-progress-fill {
      animation: slideProgress 1.5s ease-in-out infinite;
    }
    
    .loading-text {
      animation: pulseDot 1.5s ease-in-out infinite;
    }

    .pill-button:hover:not(.selected) {
      background: rgba(255, 255, 255, 0.1) !important;
      border-color: rgba(255, 255, 255, 0.25) !important;
      color: #e2e8f0 !important;
      transform: translateY(-2px) !important;
    }
    
    .pill-button.selected:hover {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(139, 92, 246, 0.2)) !important;
      transform: scale(1.05) translateY(-2px) !important;
    }
    
    .nav-button:hover:not(:disabled) {
      transform: translateY(-2px) !important;
    }
    
    .primary-button:hover:not(:disabled) {
      box-shadow: 0 8px 30px rgba(16, 185, 129, 0.4) !important;
    }
    
    .secondary-button:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.1) !important;
      border-color: rgba(255, 255, 255, 0.2) !important;
      color: #e2e8f0 !important;
    }
    
    .back-button:hover {
      background: rgba(15, 17, 22, 1) !important;
      border-color: rgba(59, 130, 246, 0.4) !important;
      color: #e2e8f0 !important;
      transform: translateY(-2px) !important;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5) !important;
    }
    
    .experience-input:focus {
      border-color: #3b82f6 !important;
    }
    
    .experience-button:hover {
      background: rgba(59, 130, 246, 0.15) !important;
      border-color: rgba(59, 130, 246, 0.4) !important;
      color: #3b82f6 !important;
    }

    .progress-step {
      transition: all 0.3s ease;
    }
  `;

  if (initialLoading) {
    return (
      <div style={styles.pageContainer}>
        <style>{hoverStyles}</style>
        <div style={styles.gridOverlay} />
        <IsolatedAnimatedBackground />
        
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
          <div style={styles.loadingCard} className="main-card">
            <div style={styles.cardGridOverlay} />
            
            <div style={styles.radarContainer}>
              <div style={styles.radarRing} className="radar-ring" />
              <div style={styles.radarRing} className="radar-ring-delayed" />
              <div style={styles.radarCenter}>
                <Sparkles size={24} color="#3b82f6" />
              </div>
            </div>
            
            <div style={styles.loadingBadge}>
              <div style={styles.pulseDot} className="pulse-dot" />
              INITIALIZING
            </div>
            
            <h2 style={styles.loadingTitle}>Preparing Onboarding</h2>
            <p style={styles.loadingText}>Loading your personalized setup...</p>
            
            <div style={styles.loadingProgress}>
              <div style={styles.loadingProgressFill} className="loading-progress-fill" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.pageContainer}>
      <style>{hoverStyles}</style>
      
      {/* Grid Overlay */}
      <div style={styles.gridOverlay} />
      
      {/* Corner Accents */}
      <svg style={{...styles.cornerAccent, top: 0, left: 0}} viewBox="0 0 100 100">
        <path d="M0 40 L0 0 L40 0" fill="none" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="2"/>
        <circle cx="0" cy="0" r="4" fill="#3b82f6" opacity="0.6"/>
      </svg>
      <svg style={{...styles.cornerAccent, top: 0, right: 0, transform: 'scaleX(-1)'}} viewBox="0 0 100 100">
        <path d="M0 40 L0 0 L40 0" fill="none" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="2"/>
        <circle cx="0" cy="0" r="4" fill="#3b82f6" opacity="0.6"/>
      </svg>
      <svg style={{...styles.cornerAccent, bottom: 0, left: 0, transform: 'scaleY(-1)'}} viewBox="0 0 100 100">
        <path d="M0 40 L0 0 L40 0" fill="none" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="2"/>
        <circle cx="0" cy="0" r="4" fill="#3b82f6" opacity="0.6"/>
      </svg>
      <svg style={{...styles.cornerAccent, bottom: 0, right: 0, transform: 'scale(-1)'}} viewBox="0 0 100 100">
        <path d="M0 40 L0 0 L40 0" fill="none" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="2"/>
        <circle cx="0" cy="0" r="4" fill="#3b82f6" opacity="0.6"/>
      </svg>
      
      {/* Back to Login Button */}
      <button
        onClick={() => {
          if (window.confirm('Are you sure you want to go back to login?')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }
        }}
        style={styles.backButton}
        className="back-button"
      >
        <ArrowLeft size={18} strokeWidth={2.5} />
        Back to Login
      </button>
      
      <IsolatedAnimatedBackground />

      <div style={styles.container}>
        <div style={styles.mainCard} className="main-card">
          <div style={styles.cardGridOverlay} />
          <div style={styles.scanLine} className="scan-line" />
          
          {/* Header - Show on Step 1 */}
          {currentStep === 1 && (
            <div style={styles.header}>
              <div style={styles.hexagonContainer}>
                <div style={styles.hexagonBadge} className="hexagon-badge">
                  <svg style={styles.hexagonSvg} viewBox="0 0 70 80">
                    <defs>
                      <linearGradient id="onboardHexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8"/>
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8"/>
                      </linearGradient>
                    </defs>
                    <polygon 
                      points="35,2 67,20 67,60 35,78 3,60 3,20" 
                      fill="rgba(15, 23, 42, 0.9)"
                      stroke="url(#onboardHexGrad)"
                      strokeWidth="2"
                    />
                  </svg>
                  <div style={styles.hexagonContent}>
                    <Sparkles size={28} color="#3b82f6" />
                  </div>
                </div>
              </div>
              <div style={styles.statusBadge}>
                <Radio size={12} />
                SYSTEM READY
              </div>
              <h1 style={styles.title}>Welcome, {user?.full_name}!</h1>
              <p style={styles.subtitle}>Let's personalize your TechSync experience</p>
            </div>
          )}

          {/* Progress Indicator */}
          <div style={styles.progressContainer}>
            <div style={styles.progressBar}>
              <div style={styles.progressLine} />
              <div style={{
                ...styles.progressLineFill,
                width: `${((currentStep - 1) / 3) * 280}px`
              }} />
              
              {[1, 2, 3, 4].map((step) => {
                const StepIcon = stepIcons[step];
                const isActive = step === currentStep;
                const isComplete = step < currentStep;
                
                return (
                  <div key={step} style={styles.progressStepContainer}>
                    <div
                      className="progress-step"
                      style={{
                        ...styles.progressStep,
                        ...(isActive ? styles.progressStepActive : {}),
                        ...(isComplete ? styles.progressStepComplete : {})
                      }}
                    >
                      {isComplete ? (
                        <CheckCircle size={20} />
                      ) : (
                        <StepIcon size={20} />
                      )}
                    </div>
                    <span style={{
                      ...styles.progressStepLabel,
                      ...(isActive ? styles.progressStepLabelActive : {}),
                      ...(isComplete ? styles.progressStepLabelComplete : {})
                    }}>
                      {stepLabels[step]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Error/Success messages */}
          {error && (
            <div style={styles.error}>
              <Shield size={18} />
              {error}
            </div>
          )}
          {successMessage && (
            <div style={styles.success}>
              <CheckCircle size={18} />
              {successMessage}
            </div>
          )}

          {/* Step 1: Select Programming Languages */}
          {currentStep === 1 && (
            <div style={styles.stepContainer}>
              <div style={styles.stepHeader}>
                <div style={styles.stepBadge}>
                  <Code2 size={16} color="#3b82f6" />
                  <span style={styles.stepBadgeText}>Step 1 of 4</span>
                </div>
                <h2 style={styles.stepTitle}>What Programming Languages are you skilled at?</h2>
                <p style={styles.stepSubtitle}>Select your primary languages. We recommend choosing 3 for better recommendations.</p>
              </div>
              
              <div style={styles.buttonGrid}>
                {programmingLanguages.map(language => {
                  const isSelected = selectedLanguages.find(l => l.language_id === language.id);
                  return (
                    <button
                      key={language.id}
                      onClick={() => handleLanguageToggle(language)}
                      className={`pill-button ${isSelected ? 'selected' : ''}`}
                      style={{
                        ...styles.pillButton,
                        ...(isSelected ? styles.selectedPillButton : {})
                      }}
                    >
                      {language.name}
                    </button>
                  );
                })}
              </div>

              {selectedLanguages.length > 0 && (
                <div style={styles.selectionCount}>
                  <CheckCircle size={16} />
                  {selectedLanguages.length} language{selectedLanguages.length !== 1 ? 's' : ''} selected
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select Topics */}
          {currentStep === 2 && (
            <div style={styles.stepContainer}>
              <div style={styles.stepHeader}>
                <div style={styles.stepBadge}>
                  <BookOpen size={16} color="#3b82f6" />
                  <span style={styles.stepBadgeText}>Step 2 of 4</span>
                </div>
                <h2 style={styles.stepTitle}>What topics interest you most?</h2>
                <p style={styles.stepSubtitle}>Choose areas you'd like to learn or work with.</p>
              </div>
              
              <div style={styles.buttonGrid}>
                {topics.map(topic => {
                  const isSelected = selectedTopics.find(t => t.topic_id === topic.id);
                  return (
                    <button
                      key={topic.id}
                      onClick={() => handleTopicToggle(topic)}
                      className={`pill-button ${isSelected ? 'selected' : ''}`}
                      style={{
                        ...styles.pillButton,
                        ...(isSelected ? styles.selectedPillButton : {})
                      }}
                    >
                      {topic.name}
                    </button>
                  );
                })}
              </div>

              {selectedTopics.length > 0 && (
                <div style={styles.selectionCount}>
                  <CheckCircle size={16} />
                  {selectedTopics.length} topic{selectedTopics.length !== 1 ? 's' : ''} selected
                </div>
              )}
            </div>
          )}

          {/* Step 3: Years of Experience */}
          {currentStep === 3 && (
            <div style={styles.stepContainer}>
              <div style={styles.stepHeader}>
                <div style={styles.stepBadge}>
                  <Clock size={16} color="#3b82f6" />
                  <span style={styles.stepBadgeText}>Step 3 of 4</span>
                </div>
                <h2 style={styles.stepTitle}>How many years of programming experience?</h2>
                <p style={styles.stepSubtitle}>This helps us find projects suited to your level.</p>
              </div>
              
              <div style={styles.experienceContainer}>
                <div style={styles.experienceInputContainer}>
                  <div style={styles.experienceInputWrapper}>
                    <button
                      onClick={() => setYearsExperience(Math.max(0, yearsExperience - 1))}
                      style={styles.experienceButton}
                      className="experience-button"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={yearsExperience}
                      onChange={(e) => setYearsExperience(parseInt(e.target.value) || 0)}
                      style={styles.experienceInput}
                      className="experience-input"
                    />
                    <button
                      onClick={() => setYearsExperience(Math.min(50, yearsExperience + 1))}
                      style={styles.experienceButton}
                      className="experience-button"
                    >
                      +
                    </button>
                  </div>
                  
                  {(() => {
                    const level = getExperienceLevel(yearsExperience);
                    return (
                      <div style={{
                        ...styles.experienceLevelBadge,
                        backgroundColor: `${level.color}15`,
                        borderColor: `${level.color}40`,
                        color: level.color
                      }}>
                        <span>{level.icon}</span>
                        <span>{level.label}</span>
                      </div>
                    );
                  })()}
                  
                  <p style={styles.experienceText}>
                    {yearsExperience === 0 ? 'Just getting started - no worries!' : 
                     yearsExperience === 1 ? '1 year of coding experience' : 
                     `${yearsExperience} years of coding experience`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Pre-Assessment Challenges */}
          {currentStep === 4 && !allChallengesComplete && (
            <div style={styles.challengeContainer}>
              <PreAssessmentModal
                language={selectedLanguages[currentChallengeIndex]}
                onComplete={handleChallengeComplete}
                onClose={() => setCurrentStep(3)}
              />
            </div>
          )}

          {/* Navigation Buttons - Hide on Step 4 */}
          {currentStep !== 4 && (
            <div style={styles.navigationButtons}>
              {currentStep > 1 && (
                <button
                  onClick={handlePrevStep}
                  className="nav-button secondary-button"
                  style={{
                    ...styles.navButton,
                    ...styles.secondaryButton
                  }}
                >
                  <ArrowLeft size={18} />
                  Previous
                </button>
              )}

              <button
                onClick={handleNextStep}
                className="nav-button primary-button"
                style={{
                  ...styles.navButton,
                  ...styles.primaryButton
                }}
              >
                <span style={styles.buttonGlow} className="button-glow" />
                Continue
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

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

export default Onboarding;