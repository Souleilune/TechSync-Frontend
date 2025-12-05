// src/pages/Onboarding.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { onboardingService } from '../services/onboardingService';
import CourseRecommendationModal from '../components/CourseRecommendationModal';
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
  Trophy,
  Star,
  Award,
  Flame,
  Crown,
  Rocket,
  Heart,
  Coffee
} from 'lucide-react';
import PreAssessmentModal from '../components/PreAssessmentModal';
import AssessmentResultModal from '../components/AssessmentResultModal';

// Isolated background styles
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

// Floating Particles Component
const FloatingParticles = React.memo(() => {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: Math.random() * 4 + 2,
    delay: Math.random() * 5,
    duration: Math.random() * 10 + 10,
    color: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'][Math.floor(Math.random() * 4)]
  }));

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 2 }}>
      {particles.map(p => (
        <div
          key={p.id}
          className="floating-particle"
          style={{
            position: 'absolute',
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: '50%',
            opacity: 0.6,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`
          }}
        />
      ))}
    </div>
  );
});

// Animated Background Component
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

// Step icons and labels
const stepIcons = { 1: Code2, 2: BookOpen, 3: Clock, 4: Target };
const stepLabels = { 1: 'Skills', 2: 'Interests', 3: 'Level', 4: 'Challenge' };
const stepEmojis = { 1: '💻', 2: '🎯', 3: '⚡', 4: '🏆' };

// Achievement Toast Component
const AchievementToast = ({ show, message, icon: Icon }) => {
  if (!show) return null;
  
  return (
    <div className="achievement-toast" style={{
      position: 'fixed',
      top: '100px',
      right: '30px',
      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.9))',
      padding: '16px 24px',
      borderRadius: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      boxShadow: '0 10px 40px rgba(16, 185, 129, 0.4), 0 0 60px rgba(16, 185, 129, 0.2)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      zIndex: 1000
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '10px',
        background: 'rgba(255, 255, 255, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Icon size={22} color="white" />
      </div>
      <div>
        <div style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Achievement Unlocked!
        </div>
        <div style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>
          {message}
        </div>
      </div>
    </div>
  );
};

// XP Bar Component
const XPBar = ({ currentStep, totalSteps }) => {
  const xpPerStep = 250;
  const currentXP = (currentStep - 1) * xpPerStep;
  const totalXP = totalSteps * xpPerStep;
  const percentage = (currentXP / totalXP) * 100;
  
  return (
    <div style={{
      position: 'fixed',
      top: '30px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '10px 20px',
      background: 'rgba(15, 17, 22, 0.95)',
      borderRadius: '30px',
      border: '1px solid rgba(59, 130, 246, 0.3)',
      zIndex: 50,
      backdropFilter: 'blur(20px)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <Star size={16} color="#fbbf24" fill="#fbbf24" />
        <span style={{ fontSize: '12px', fontWeight: '700', color: '#fbbf24' }}>
          {currentXP} XP
        </span>
      </div>
      <div style={{
        width: '120px',
        height: '8px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '4px',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <div className="xp-fill" style={{
          width: `${percentage}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
          borderRadius: '4px',
          transition: 'width 0.5s ease',
          boxShadow: '0 0 10px rgba(251, 191, 36, 0.5)'
        }} />
        <div className="xp-shimmer" style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
          backgroundSize: '200% 100%'
        }} />
      </div>
      <span style={{ fontSize: '11px', color: '#64748b' }}>
        Level {currentStep}
      </span>
    </div>
  );
};

// Combo Counter Component
const ComboCounter = ({ count }) => {
  if (count < 2) return null;
  
  return (
    <div className="combo-counter" style={{
      position: 'fixed',
      bottom: '100px',
      right: '30px',
      padding: '12px 20px',
      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.9), rgba(124, 58, 237, 0.85))',
      borderRadius: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      boxShadow: '0 8px 30px rgba(139, 92, 246, 0.4)',
      zIndex: 100,
      border: '1px solid rgba(255, 255, 255, 0.2)'
    }}>
      <Flame size={20} color="#fbbf24" className="flame-icon" />
      <div>
        <div style={{ fontSize: '20px', fontWeight: '800', color: 'white' }}>
          {count}x
        </div>
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Combo!
        </div>
      </div>
    </div>
  );
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
  const [showAchievement, setShowAchievement] = useState(false);
  const [achievementMessage, setAchievementMessage] = useState('');
  const [selectionCombo, setSelectionCombo] = useState(0);
  const [lastSelectionTime, setLastSelectionTime] = useState(0);

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
  const [showCourseRecommendations, setShowCourseRecommendations] = useState(false);
  const [currentRecommendationLanguage, setCurrentRecommendationLanguage] = useState(null);
  const [enrolledCourses, setEnrolledCourses] = useState([]);

  
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

  // Combo system
  const updateCombo = useCallback(() => {
    const now = Date.now();
    if (now - lastSelectionTime < 1500) {
      setSelectionCombo(prev => prev + 1);
    } else {
      setSelectionCombo(1);
    }
    setLastSelectionTime(now);
  }, [lastSelectionTime]);

  // Reset combo after inactivity
  useEffect(() => {
    if (selectionCombo > 0) {
      const timer = setTimeout(() => {
        setSelectionCombo(0);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [selectionCombo, lastSelectionTime]);

  useEffect(() => {
  console.log('🔄 Modal state changed:', {
    showCourseRecommendations,
    showResultModal,
    currentStep,
    allChallengesComplete
  });
}, [showCourseRecommendations, showResultModal, currentStep, allChallengesComplete]);

  // Show achievement
  const triggerAchievement = (message) => {
    setAchievementMessage(message);
    setShowAchievement(true);
    setTimeout(() => setShowAchievement(false), 3000);
  };

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
      updateCombo();
      
      // Achievement triggers
      if (selectedLanguages.length === 2) {
        triggerAchievement('Polyglot: 3 Languages Selected!');
      }
      if (selectedLanguages.length === 4) {
        triggerAchievement('Code Master: 5 Languages!');
      }
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
      updateCombo();
      
      if (selectedTopics.length === 2) {
        triggerAchievement('Curious Mind: 3 Topics!');
      }
    }
  };

  const determineProficiencyLevel = (score) => {
  if (score >= 90) return 'expert';
  if (score >= 75) return 'advanced';
  if (score >= 60) return 'intermediate';
  return 'beginner';
};

  // Handle challenge completion
  const handleChallengeComplete = (result) => {
  console.log('📝 Challenge result:', result);
  
  const updatedResults = [...challengeResults, {
    languageId: selectedLanguages[currentChallengeIndex].language_id,
    languageName: selectedLanguages[currentChallengeIndex].name,
    ...result
  }];
  
  setChallengeResults(updatedResults);

  // Check if this was the last challenge
  if (currentChallengeIndex < selectedLanguages.length - 1) {
    // More challenges remaining - move to next
    setCurrentChallengeIndex(currentChallengeIndex + 1);
  } else {
    // All challenges complete
    setAllChallengesComplete(true);
    
    // Check if any results are for beginners
    const beginnerResults = updatedResults.filter(r => r.proficiencyLevel === 'beginner');
    
    if (beginnerResults.length > 0) {
      // Show course recommendations for the first beginner language
      const firstBeginnerLanguage = selectedLanguages.find(
        lang => beginnerResults.some(r => r.languageId === lang.language_id)
      );
      
      setCurrentRecommendationLanguage({
        ...firstBeginnerLanguage,
        result: beginnerResults.find(r => r.languageId === firstBeginnerLanguage.language_id)
      });
      setShowCourseRecommendations(true);
    } else {
      // No beginners - show final results modal
      setShowResultModal(true);
    }
  }
};

const handleCourseRecommendationComplete = (savedCourseIds) => {
  console.log('💾 Continue clicked - Saved courses:', savedCourseIds);
  console.log('📊 Current state:', {
    currentRecommendationLanguage,
    challengeResults,
    showCourseRecommendations,
    showResultModal
  });
  
  // Save enrolled courses
  setEnrolledCourses([...enrolledCourses, ...savedCourseIds]);
  
  // Get all beginner results
  const beginnerResults = challengeResults.filter(r => r.proficiencyLevel === 'beginner');
  console.log('👶 Beginner results:', beginnerResults);
  
  // Validate current recommendation language
  if (!currentRecommendationLanguage || !currentRecommendationLanguage.language_id) {
    console.warn('⚠️ No current recommendation language, going to final results');
    setShowCourseRecommendations(false);
    setTimeout(() => {
      setShowResultModal(true);
    }, 100);
    return;
  }
  
  // Find current index in beginner results
  const currentIndex = beginnerResults.findIndex(
    r => r.languageId === currentRecommendationLanguage.language_id
  );
  
  console.log('📍 Current index:', currentIndex, '| Total beginners:', beginnerResults.length);
  
  // Check if there are more beginner languages (FIXED CONDITION)
  if (currentIndex >= 0 && currentIndex < beginnerResults.length - 1) {
    console.log('➡️ Moving to next beginner language');
    
    // Get next beginner result
    const nextBeginnerResult = beginnerResults[currentIndex + 1];
    const nextLanguage = selectedLanguages.find(
      lang => lang.language_id === nextBeginnerResult.languageId
    );
    
    if (nextLanguage) {
      console.log('✅ Next language found:', nextLanguage.name);
      setCurrentRecommendationLanguage({
        ...nextLanguage,
        result: nextBeginnerResult
      });
      // Modal stays open for next language
    } else {
      console.error('❌ Next language not found in selectedLanguages');
      setShowCourseRecommendations(false);
      setTimeout(() => {
        setShowResultModal(true);
      }, 100);
    }
  } else {
    console.log('✅ All beginner recommendations complete - showing final results');
    // Close recommendations, show final results
    setShowCourseRecommendations(false);
    setTimeout(() => {
      setShowResultModal(true);
    }, 100);
  }
};

// Add handler for skipping course recommendations:
const handleSkipCourseRecommendations = () => {
  console.log('⏭️ Skip button clicked');
  console.log('📊 Current state before skip:', {
    showCourseRecommendations,
    showResultModal
  });
  
  setShowCourseRecommendations(false);
  
  // Use setTimeout to ensure state updates properly
  setTimeout(() => {
    console.log('⏭️ Setting showResultModal to true');
    setShowResultModal(true);
  }, 100);
};

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
      triggerAchievement('Welcome to TechSync!');
      
      if (result.data?.user) {
        await updateUser(result.data.user, true);
      } else {
        await refreshUser();
      }
      
      // Navigate to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/'); // This goes to Dashboard.js
      }, 2000);
    } else {
      setError(result.message || 'Failed to complete onboarding.');
    }

  } catch (error) {
    console.error('Complete onboarding error:', error);
    setError(error.message || 'Failed to complete onboarding.');
  } finally {
    setLoading(false);
  }
};

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

    triggerAchievement(`Step ${currentStep} Complete!`);
    setCurrentStep(currentStep + 1);
  };

  const handlePrevStep = () => {
    setCurrentStep(Math.max(1, currentStep - 1));
  };

  const getExperienceLevel = (years) => {
    if (years === 0) return { label: 'Newcomer', color: '#10b981', icon: Rocket, emoji: '🌱', rank: 'D' };
    if (years <= 2) return { label: 'Apprentice', color: '#3b82f6', icon: Zap, emoji: '⚡', rank: 'C' };
    if (years <= 5) return { label: 'Developer', color: '#8b5cf6', icon: Flame, emoji: '🔥', rank: 'B' };
    if (years <= 10) return { label: 'Veteran', color: '#f59e0b', icon: Star, emoji: '⭐', rank: 'A' };
    return { label: 'Legend', color: '#ef4444', icon: Crown, emoji: '👑', rank: 'S' };
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
      width: '120px',
      height: '120px',
      pointerEvents: 'none',
      zIndex: 3
    },
    container: {
      position: 'relative',
      zIndex: 10,
      maxWidth: '900px',
      width: '100%',
      padding: '1rem',
      marginTop: '60px'
    },
    mainCard: {
      position: 'relative',
      background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.85) 0%, rgba(7, 11, 20, 0.95) 100%)',
      borderRadius: '28px',
      border: '1px solid rgba(59, 130, 246, 0.2)',
      padding: '2.5rem',
      overflow: 'hidden',
      backdropFilter: 'blur(20px)'
    },
    cardInnerGlow: {
      position: 'absolute',
      top: '-50%',
      left: '-50%',
      width: '200%',
      height: '200%',
      background: 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.08) 0%, transparent 50%)',
      pointerEvents: 'none'
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
      backgroundSize: '25px 25px',
      pointerEvents: 'none',
      borderRadius: '28px',
      opacity: 0.5
    },
    scanLine: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '2px',
      background: 'linear-gradient(90deg, transparent, #3b82f6, #8b5cf6, #3b82f6, transparent)',
      boxShadow: '0 0 20px #3b82f6, 0 0 40px #3b82f6',
      zIndex: 2
    },
    glowOrbs: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none',
      overflow: 'hidden',
      borderRadius: '28px'
    },
    header: {
      textAlign: 'center',
      marginBottom: '2rem',
      position: 'relative',
      zIndex: 3
    },
    hexagonContainer: {
      position: 'relative',
      width: '140px',
      height: '140px',
      margin: '0 auto 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    hexagonBadge: {
      position: 'relative',
      width: '90px',
      height: '104px',
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
    orbitRing: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: '130px',
      height: '130px',
      transform: 'translate(-50%, -50%)',
      borderRadius: '50%',
      border: '1px dashed rgba(59, 130, 246, 0.3)',
      pointerEvents: 'none'
    },
    orbitDot: {
      position: 'absolute',
      width: '8px',
      height: '8px',
      backgroundColor: '#3b82f6',
      borderRadius: '50%',
      top: '50%',
      left: '50%',
      marginTop: '-4px',
      marginLeft: '-4px',
      boxShadow: '0 0 12px #3b82f6'
    },
    statusBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 18px',
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
      border: '1px solid rgba(16, 185, 129, 0.3)',
      borderRadius: '25px',
      fontSize: '11px',
      fontWeight: '700',
      color: '#10b981',
      textTransform: 'uppercase',
      letterSpacing: '2px',
      marginBottom: '1rem',
      boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)'
    },
    pulseDot: {
      width: '8px',
      height: '8px',
      backgroundColor: '#10b981',
      borderRadius: '50%',
      boxShadow: '0 0 8px #10b981'
    },
    title: {
      fontSize: '2.25rem',
      fontWeight: '800',
      color: 'white',
      marginBottom: '0.5rem',
      letterSpacing: '-0.025em'
    },
    titleGradient: {
      background: 'linear-gradient(135deg, #ffffff 0%, #60a5fa 50%, #a78bfa 100%)',
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
      marginBottom: '2.5rem',
      position: 'relative',
      zIndex: 3
    },
    stepperContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      maxWidth: '500px',
      margin: '0 auto',
      padding: '0 20px'
    },
    stepperLine: {
      flex: 1,
      height: '3px',
      background: 'rgba(255, 255, 255, 0.1)',
      position: 'relative',
      margin: '0 -1px',
      borderRadius: '2px'
    },
    stepperLineFilled: {
      background: 'linear-gradient(90deg, #10b981, #3b82f6)',
      boxShadow: '0 0 12px rgba(59, 130, 246, 0.5)'
    },
    stepperNode: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '10px',
      position: 'relative',
      zIndex: 2
    },
    stepperCircle: {
      width: '56px',
      height: '56px',
      borderRadius: '16px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '2px',
      background: 'rgba(15, 23, 42, 0.95)',
      border: '2px solid rgba(255, 255, 255, 0.1)',
      color: '#64748b',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative',
      overflow: 'hidden'
    },
    stepperCircleActive: {
      border: '2px solid #3b82f6',
      color: '#3b82f6',
      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.1))',
      boxShadow: '0 0 30px rgba(59, 130, 246, 0.4), inset 0 0 20px rgba(59, 130, 246, 0.1)',
      transform: 'scale(1.1)'
    },
    stepperCircleComplete: {
      border: '2px solid #10b981',
      color: '#10b981',
      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1))',
      boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)'
    },
    stepEmoji: {
      fontSize: '10px'
    },
    stepperLabel: {
      fontSize: '11px',
      fontWeight: '700',
      color: '#64748b',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      textAlign: 'center'
    },
    stepperLabelActive: {
      color: '#3b82f6'
    },
    stepperLabelComplete: {
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
      gap: '10px',
      padding: '10px 20px',
      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.1))',
      border: '1px solid rgba(59, 130, 246, 0.3)',
      borderRadius: '14px',
      marginBottom: '1rem',
      boxShadow: '0 4px 15px rgba(59, 130, 246, 0.1)'
    },
    stepBadgeIcon: {
      width: '28px',
      height: '28px',
      borderRadius: '8px',
      background: 'rgba(59, 130, 246, 0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    stepBadgeText: {
      fontSize: '12px',
      fontWeight: '700',
      color: '#93c5fd',
      textTransform: 'uppercase',
      letterSpacing: '1px'
    },
    stepTitle: {
      fontSize: '1.6rem',
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
      gap: '12px',
      marginBottom: '1.5rem',
      width: '100%',
      margin: '0 auto 1.5rem auto'
    },
    pillButton: {
      padding: '14px 24px',
      border: '2px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '14px',
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      color: '#94a3b8',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      fontSize: '14px',
      fontWeight: '600',
      textAlign: 'center',
      flex: '0 0 auto',
      whiteSpace: 'nowrap',
      backdropFilter: 'blur(8px)',
      position: 'relative',
      overflow: 'hidden'
    },
    selectedPillButton: {
      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(139, 92, 246, 0.2))',
      border: '2px solid rgba(59, 130, 246, 0.6)',
      color: '#93c5fd',
      boxShadow: '0 0 25px rgba(59, 130, 246, 0.3), inset 0 0 20px rgba(59, 130, 246, 0.1)',
      transform: 'scale(1.05)'
    },
    selectionCount: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '10px',
      textAlign: 'center',
      color: '#3b82f6',
      fontSize: '14px',
      fontWeight: '700',
      padding: '14px 28px',
      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.1))',
      borderRadius: '16px',
      border: '1px solid rgba(59, 130, 246, 0.3)',
      marginTop: '1rem',
      boxShadow: '0 4px 20px rgba(59, 130, 246, 0.15)'
    },
    experienceContainer: {
      maxWidth: '480px',
      margin: '2rem auto',
      padding: '2.5rem',
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(7, 11, 20, 0.95) 100%)',
      border: '1px solid rgba(59, 130, 246, 0.2)',
      borderRadius: '24px',
      position: 'relative',
      overflow: 'hidden'
    },
    experienceInnerGlow: {
      position: 'absolute',
      top: '-100%',
      left: '-100%',
      width: '300%',
      height: '300%',
      background: 'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.1) 0%, transparent 40%)',
      pointerEvents: 'none'
    },
    experienceHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      marginBottom: '1.5rem'
    },
    experienceInputContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1.5rem',
      position: 'relative',
      zIndex: 2
    },
    experienceInputWrapper: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },
    experienceButton: {
      width: '52px',
      height: '52px',
      borderRadius: '14px',
      border: '2px solid rgba(255, 255, 255, 0.15)',
      background: 'rgba(255, 255, 255, 0.05)',
      color: '#94a3b8',
      fontSize: '24px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s ease'
    },
    experienceInput: {
      fontSize: '3.5rem',
      padding: '0.5rem 1rem',
      background: 'transparent',
      border: 'none',
      borderBottom: '3px solid rgba(59, 130, 246, 0.4)',
      textAlign: 'center',
      width: '140px',
      color: 'white',
      fontWeight: '800',
      fontFamily: 'monospace',
      transition: 'all 0.3s ease',
      outline: 'none'
    },
    experienceRankContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px'
    },
    experienceRankBadge: {
      width: '64px',
      height: '64px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '28px',
      fontWeight: '900',
      fontFamily: 'monospace',
      border: '3px solid',
      transition: 'all 0.4s ease',
      position: 'relative'
    },
    experienceLevelBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 20px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '700',
      border: '1px solid',
      transition: 'all 0.3s ease'
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
      padding: '16px 36px',
      border: 'none',
      borderRadius: '16px',
      cursor: 'pointer',
      fontSize: '15px',
      fontWeight: '700',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      minWidth: '180px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      position: 'relative',
      overflow: 'hidden'
    },
    primaryButton: {
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      color: 'white',
      boxShadow: '0 8px 30px rgba(16, 185, 129, 0.4), 0 0 40px rgba(16, 185, 129, 0.1)'
    },
    secondaryButton: {
      background: 'rgba(255, 255, 255, 0.05)',
      color: '#94a3b8',
      border: '2px solid rgba(255, 255, 255, 0.1)'
    },
    buttonGlow: {
      position: 'absolute',
      top: 0,
      left: '-100%',
      width: '100%',
      height: '100%',
      background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)'
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
      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(185, 28, 28, 0.1))',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      borderRadius: '14px',
      fontSize: '14px',
      fontWeight: '500',
      position: 'relative',
      zIndex: 3,
      boxShadow: '0 4px 20px rgba(239, 68, 68, 0.15)'
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
      background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(5, 150, 105, 0.1))',
      border: '1px solid rgba(34, 197, 94, 0.3)',
      borderRadius: '14px',
      fontSize: '14px',
      fontWeight: '500',
      position: 'relative',
      zIndex: 3,
      boxShadow: '0 4px 20px rgba(34, 197, 94, 0.15)'
    },
    backButton: {
      position: 'fixed',
      top: '100px',
      left: '30px',
      zIndex: 50,
      padding: '14px 22px',
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
    // Loading state
    loadingContainer: {
      position: 'relative',
      zIndex: 10,
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    },
    loadingCard: {
      background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.85) 0%, rgba(7, 11, 20, 0.95) 100%)',
      borderRadius: '28px',
      border: '1px solid rgba(59, 130, 246, 0.2)',
      padding: '4rem',
      position: 'relative',
      overflow: 'hidden'
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
      border: '2px solid rgba(59, 130, 246, 0.4)'
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
      gap: '10px',
      padding: '10px 20px',
      backgroundColor: 'rgba(59, 130, 246, 0.15)',
      border: '1px solid rgba(59, 130, 246, 0.3)',
      borderRadius: '25px',
      fontSize: '12px',
      fontWeight: '700',
      color: '#3b82f6',
      textTransform: 'uppercase',
      letterSpacing: '2px',
      marginBottom: '16px'
    },
    loadingTitle: {
      fontSize: '28px',
      fontWeight: '700',
      color: 'white',
      marginBottom: '8px'
    },
    loadingText: {
      color: '#64748b',
      fontSize: '14px',
      marginBottom: '28px'
    },
    loadingProgress: {
      width: '220px',
      height: '6px',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '3px',
      overflow: 'hidden'
    },
    loadingProgressFill: {
      width: '80px',
      height: '100%',
      background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #3b82f6)',
      borderRadius: '3px',
      backgroundSize: '200% 100%'
    }
  }), []);

  const hoverStyles = `
    /* ANIMATIONS */
    @keyframes globalLogoRotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    @keyframes hexPulse {
      0%, 100% { 
        filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.5));
        transform: scale(1);
      }
      50% { 
        filter: drop-shadow(0 0 35px rgba(59, 130, 246, 0.8));
        transform: scale(1.02);
      }
    }
    
    @keyframes orbit {
      0% { transform: rotate(0deg) translateX(65px) rotate(0deg); }
      100% { transform: rotate(360deg) translateX(65px) rotate(-360deg); }
    }
    
    @keyframes borderGlow {
      0%, 100% { 
        box-shadow: inset 0 0 30px rgba(59, 130, 246, 0.05), 
                    0 0 30px rgba(59, 130, 246, 0.15),
                    0 0 60px rgba(139, 92, 246, 0.1);
      }
      50% { 
        box-shadow: inset 0 0 40px rgba(59, 130, 246, 0.1), 
                    0 0 50px rgba(59, 130, 246, 0.25),
                    0 0 80px rgba(139, 92, 246, 0.15);
      }
    }
    
    @keyframes scanLine {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(200%); }
    }
    
    @keyframes radarPulse {
      0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.8; }
      100% { transform: translate(-50%, -50%) scale(1.6); opacity: 0; }
    }
    
    @keyframes pulseDot {
      0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 8px #10b981; }
      50% { opacity: 0.6; transform: scale(0.85); box-shadow: 0 0 15px #10b981; }
    }
    
    @keyframes slideProgress {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(400%); }
    }
    
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    
    @keyframes glowPulse {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 1; }
    }
    
    @keyframes achievementSlide {
      0% { transform: translateX(100px); opacity: 0; }
      10% { transform: translateX(0); opacity: 1; }
      90% { transform: translateX(0); opacity: 1; }
      100% { transform: translateX(100px); opacity: 0; }
    }
    
    @keyframes comboScale {
      0% { transform: scale(1); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }
    
    @keyframes flameDance {
      0%, 100% { transform: rotate(-5deg) scale(1); }
      25% { transform: rotate(5deg) scale(1.1); }
      50% { transform: rotate(-3deg) scale(1); }
      75% { transform: rotate(3deg) scale(1.05); }
    }
    
    @keyframes particleFloat {
      0%, 100% { 
        transform: translateY(0) translateX(0) scale(1);
        opacity: 0.6;
      }
      25% {
        transform: translateY(-30px) translateX(15px) scale(0.8);
        opacity: 0.8;
      }
      50% { 
        transform: translateY(-60px) translateX(-10px) scale(1.1);
        opacity: 0.4;
      }
      75% {
        transform: translateY(-30px) translateX(-20px) scale(0.9);
        opacity: 0.7;
      }
    }
    
    @keyframes xpShimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    
    @keyframes rankPop {
      0% { transform: scale(0) rotate(-180deg); }
      50% { transform: scale(1.2) rotate(10deg); }
      100% { transform: scale(1) rotate(0deg); }
    }
    
    @keyframes buttonPulse {
      0%, 100% { box-shadow: 0 8px 30px rgba(16, 185, 129, 0.4), 0 0 40px rgba(16, 185, 129, 0.1); }
      50% { box-shadow: 0 8px 40px rgba(16, 185, 129, 0.6), 0 0 60px rgba(16, 185, 129, 0.2); }
    }
    
    @keyframes stepPing {
      0% { transform: scale(1); opacity: 1; }
      75%, 100% { transform: scale(1.5); opacity: 0; }
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

    /* FLOATING PARTICLES */
    .floating-particle {
      animation: particleFloat 8s ease-in-out infinite;
    }
    
    .floating-particle:nth-child(odd) {
      animation-direction: reverse;
    }
    
    /* UI ELEMENT ANIMATIONS */
    .global-loading-spinner {
      animation: globalLogoRotate 2s linear infinite;
    }
    
    .main-card {
      animation: borderGlow 5s ease-in-out infinite;
    }
    
    .hexagon-badge {
      animation: hexPulse 3s ease-in-out infinite;
    }
    
    .orbit-dot {
      animation: orbit 10s linear infinite;
    }
    
    .orbit-dot:nth-child(2) {
      animation-delay: -3.33s;
    }
    
    .orbit-dot:nth-child(3) {
      animation-delay: -6.66s;
    }
    
    .scan-line {
      animation: scanLine 4s linear infinite;
    }
    
    .button-glow {
      animation: shimmer 2.5s ease-in-out infinite;
    }
    
    .primary-nav-button {
      animation: buttonPulse 2s ease-in-out infinite;
    }
    
    .radar-ring {
      animation: radarPulse 2s ease-out infinite;
    }
    
    .radar-ring-delayed {
      animation: radarPulse 2s ease-out infinite;
      animation-delay: 1s;
    }
    
    .pulse-dot {
      animation: pulseDot 1.5s ease-in-out infinite;
    }
    
    .loading-progress-fill {
      animation: slideProgress 1.5s ease-in-out infinite, xpShimmer 2s linear infinite;
    }
    
    .xp-shimmer {
      animation: xpShimmer 2s linear infinite;
      background-size: 200% 100%;
    }
    
    .xp-fill {
      animation: glowPulse 2s ease-in-out infinite;
    }
    
    .achievement-toast {
      animation: achievementSlide 3s ease-in-out forwards;
    }
    
    .combo-counter {
      animation: comboScale 0.5s ease-out;
    }
    
    .flame-icon {
      animation: flameDance 0.8s ease-in-out infinite;
    }
    
    .experience-rank-badge {
      animation: rankPop 0.5s ease-out;
    }
    
    .step-active-ping {
      animation: stepPing 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
    }

    /* HOVER EFFECTS */
    .pill-button {
      position: relative;
    }
    
    .pill-button::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 14px;
      padding: 2px;
      background: linear-gradient(135deg, transparent, transparent);
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    
    .pill-button:hover::before {
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      opacity: 1;
    }
    
    .pill-button:hover:not(.selected) {
      background: rgba(255, 255, 255, 0.08) !important;
      color: #e2e8f0 !important;
      transform: translateY(-3px) scale(1.02) !important;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3) !important;
    }
    
    .pill-button.selected:hover {
      transform: scale(1.08) translateY(-2px) !important;
      box-shadow: 0 0 35px rgba(59, 130, 246, 0.4) !important;
    }
    
    .pill-button:active {
      transform: scale(0.98) !important;
    }
    
    .nav-button:hover:not(:disabled) {
      transform: translateY(-3px) scale(1.02) !important;
    }
    
    .nav-button:active:not(:disabled) {
      transform: translateY(0) scale(0.98) !important;
    }
    
    .primary-button:hover:not(:disabled) {
      box-shadow: 0 12px 40px rgba(16, 185, 129, 0.5), 0 0 60px rgba(16, 185, 129, 0.2) !important;
    }
    
    .secondary-button:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.1) !important;
      border-color: rgba(255, 255, 255, 0.25) !important;
      color: #e2e8f0 !important;
    }
    
    .back-button:hover {
      background: rgba(15, 17, 22, 1) !important;
      border-color: rgba(59, 130, 246, 0.5) !important;
      color: #e2e8f0 !important;
      transform: translateY(-3px) !important;
      box-shadow: 0 15px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(59, 130, 246, 0.1) !important;
    }
    
    .experience-input:focus {
      border-color: #3b82f6 !important;
      box-shadow: 0 4px 20px rgba(59, 130, 246, 0.2) !important;
    }
    
    .experience-button:hover {
      background: rgba(59, 130, 246, 0.2) !important;
      border-color: rgba(59, 130, 246, 0.5) !important;
      color: #3b82f6 !important;
      transform: scale(1.1) !important;
    }
    
    .experience-button:active {
      transform: scale(0.95) !important;
    }

    .progress-step {
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .step-glow {
      position: absolute;
      inset: -4px;
      border-radius: 18px;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      opacity: 0;
      z-index: -1;
      filter: blur(8px);
      transition: opacity 0.3s ease;
    }
    
    .progress-step:hover .step-glow {
      opacity: 0.5;
    }
  `;

  if (initialLoading) {
    return (
      <div style={styles.pageContainer}>
        <style>{hoverStyles}</style>
        <div style={styles.gridOverlay} />
        <FloatingParticles />
        <IsolatedAnimatedBackground />
        
        {/* Corner Accents */}
        <svg style={{...styles.cornerAccent, top: 0, left: 0}} viewBox="0 0 120 120">
          <path d="M0 50 L0 0 L50 0" fill="none" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="2"/>
          <path d="M0 30 L0 0 L30 0" fill="none" stroke="rgba(139, 92, 246, 0.3)" strokeWidth="1"/>
          <circle cx="0" cy="0" r="4" fill="#3b82f6" opacity="0.8"/>
        </svg>
        <svg style={{...styles.cornerAccent, top: 0, right: 0, transform: 'scaleX(-1)'}} viewBox="0 0 120 120">
          <path d="M0 50 L0 0 L50 0" fill="none" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="2"/>
          <path d="M0 30 L0 0 L30 0" fill="none" stroke="rgba(139, 92, 246, 0.3)" strokeWidth="1"/>
          <circle cx="0" cy="0" r="4" fill="#3b82f6" opacity="0.8"/>
        </svg>
        <svg style={{...styles.cornerAccent, bottom: 0, left: 0, transform: 'scaleY(-1)'}} viewBox="0 0 120 120">
          <path d="M0 50 L0 0 L50 0" fill="none" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="2"/>
          <path d="M0 30 L0 0 L30 0" fill="none" stroke="rgba(139, 92, 246, 0.3)" strokeWidth="1"/>
          <circle cx="0" cy="0" r="4" fill="#3b82f6" opacity="0.8"/>
        </svg>
        <svg style={{...styles.cornerAccent, bottom: 0, right: 0, transform: 'scale(-1)'}} viewBox="0 0 120 120">
          <path d="M0 50 L0 0 L50 0" fill="none" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="2"/>
          <path d="M0 30 L0 0 L30 0" fill="none" stroke="rgba(139, 92, 246, 0.3)" strokeWidth="1"/>
          <circle cx="0" cy="0" r="4" fill="#3b82f6" opacity="0.8"/>
        </svg>
        
        <div style={styles.loadingContainer}>
          <div style={styles.loadingCard} className="main-card">
            <div style={styles.cardGridOverlay} />
            
            <div style={styles.radarContainer}>
              <div style={styles.radarRing} className="radar-ring" />
              <div style={styles.radarRing} className="radar-ring-delayed" />
              <div style={styles.radarCenter}>
                <Sparkles size={28} color="#3b82f6" />
              </div>
            </div>
            
            <div style={styles.loadingBadge}>
              <div style={styles.pulseDot} className="pulse-dot" />
              INITIALIZING
            </div>
            
            <h2 style={styles.loadingTitle}>Preparing Your Journey</h2>
            <p style={styles.loadingText}>Loading personalized onboarding...</p>
            
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
      
      {/* Floating Particles */}
      <FloatingParticles />
      
      {/* Corner Accents - Enhanced */}
      <svg style={{...styles.cornerAccent, top: 0, left: 0}} viewBox="0 0 120 120">
        <path d="M0 50 L0 0 L50 0" fill="none" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="2"/>
        <path d="M0 30 L0 0 L30 0" fill="none" stroke="rgba(139, 92, 246, 0.3)" strokeWidth="1"/>
        <circle cx="0" cy="0" r="5" fill="#3b82f6" opacity="0.8" className="pulse-dot"/>
      </svg>
      <svg style={{...styles.cornerAccent, top: 0, right: 0, transform: 'scaleX(-1)'}} viewBox="0 0 120 120">
        <path d="M0 50 L0 0 L50 0" fill="none" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="2"/>
        <path d="M0 30 L0 0 L30 0" fill="none" stroke="rgba(139, 92, 246, 0.3)" strokeWidth="1"/>
        <circle cx="0" cy="0" r="5" fill="#8b5cf6" opacity="0.8"/>
      </svg>
      <svg style={{...styles.cornerAccent, bottom: 0, left: 0, transform: 'scaleY(-1)'}} viewBox="0 0 120 120">
        <path d="M0 50 L0 0 L50 0" fill="none" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="2"/>
        <path d="M0 30 L0 0 L30 0" fill="none" stroke="rgba(139, 92, 246, 0.3)" strokeWidth="1"/>
        <circle cx="0" cy="0" r="5" fill="#10b981" opacity="0.8"/>
      </svg>
      <svg style={{...styles.cornerAccent, bottom: 0, right: 0, transform: 'scale(-1)'}} viewBox="0 0 120 120">
        <path d="M0 50 L0 0 L50 0" fill="none" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="2"/>
        <path d="M0 30 L0 0 L30 0" fill="none" stroke="rgba(139, 92, 246, 0.3)" strokeWidth="1"/>
        <circle cx="0" cy="0" r="5" fill="#f59e0b" opacity="0.8"/>
      </svg>
      
      {/* XP Bar */}
      <XPBar currentStep={currentStep} totalSteps={4} />
      
      {/* Achievement Toast */}
      <AchievementToast show={showAchievement} message={achievementMessage} icon={Trophy} />
      
      {/* Combo Counter */}
      <ComboCounter count={selectionCombo} />
      
      {/* Back Button */}
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
        Exit
      </button>
      
      <IsolatedAnimatedBackground />

      <div style={styles.container}>
        <div style={styles.mainCard} className="main-card">
          <div style={styles.cardInnerGlow} />
          <div style={styles.cardGridOverlay} />
          <div style={styles.scanLine} className="scan-line" />
          
          {/* Glow Orbs */}
          <div style={styles.glowOrbs}>
            <div style={{
              position: 'absolute',
              width: '300px',
              height: '300px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
              top: '-100px',
              right: '-100px',
              filter: 'blur(40px)'
            }} className="float-orb" />
            <div style={{
              position: 'absolute',
              width: '250px',
              height: '250px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%)',
              bottom: '-80px',
              left: '-80px',
              filter: 'blur(40px)'
            }} />
          </div>
          
          {/* Header - Step 1 */}
          {currentStep === 1 && (
            <div style={styles.header}>
              <div style={styles.hexagonContainer}>
                {/* Orbit Ring with Dots */}
                <div style={styles.orbitRing}>
                  <div style={styles.orbitDot} className="orbit-dot" />
                  <div style={styles.orbitDot} className="orbit-dot" />
                  <div style={styles.orbitDot} className="orbit-dot" />
                </div>
                
                {/* Hexagon */}
                <div style={styles.hexagonBadge} className="hexagon-badge">
                  <svg style={styles.hexagonSvg} viewBox="0 0 90 104">
                    <defs>
                      <linearGradient id="onboardHexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9"/>
                        <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.8"/>
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.9"/>
                      </linearGradient>
                      <filter id="hexGlow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    <polygon 
                      points="45,2 87,25 87,79 45,102 3,79 3,25" 
                      fill="rgba(15, 23, 42, 0.95)"
                      stroke="url(#onboardHexGrad)"
                      strokeWidth="2.5"
                      filter="url(#hexGlow)"
                    />
                  </svg>
                  <div style={styles.hexagonContent}>
                    <Rocket size={36} color="#3b82f6" />
                  </div>
                </div>
              </div>
              
              <div style={styles.statusBadge}>
                <div style={styles.pulseDot} className="pulse-dot" />
                MISSION START
              </div>
              <h1 style={{...styles.title, ...styles.titleGradient}}>Welcome, {user?.full_name}!</h1>
              <p style={styles.subtitle}>Let's personalize your TechSync experience</p>
            </div>
          )}

          {/* Progress Stepper */}
          <div style={styles.progressContainer}>
            <div style={styles.stepperContainer}>
              {[1, 2, 3, 4].map((step, index) => {
                const StepIcon = stepIcons[step];
                const isActive = step === currentStep;
                const isComplete = step < currentStep;
                
                return (
                  <React.Fragment key={step}>
                    {/* Step Node */}
                    <div style={styles.stepperNode}>
                      <div
                        className="progress-step"
                        style={{
                          ...styles.stepperCircle,
                          ...(isActive ? styles.stepperCircleActive : {}),
                          ...(isComplete ? styles.stepperCircleComplete : {})
                        }}
                      >
                        {/* Active ping effect */}
                        {isActive && (
                          <div className="step-active-ping" style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '16px',
                            border: '2px solid #3b82f6',
                            opacity: 0
                          }} />
                        )}
                        
                        {isComplete ? (
                          <CheckCircle size={22} />
                        ) : (
                          <>
                            <StepIcon size={20} />
                            <span style={styles.stepEmoji}>{stepEmojis[step]}</span>
                          </>
                        )}
                      </div>
                      <span style={{
                        ...styles.stepperLabel,
                        ...(isActive ? styles.stepperLabelActive : {}),
                        ...(isComplete ? styles.stepperLabelComplete : {})
                      }}>
                        {stepLabels[step]}
                      </span>
                    </div>
                    
                    {/* Connector Line */}
                    {index < 3 && (
                      <div style={{
                        ...styles.stepperLine,
                        ...(step < currentStep ? styles.stepperLineFilled : {})
                      }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Error/Success */}
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

          {/* Step 1: Languages */}
          {currentStep === 1 && (
            <div style={styles.stepContainer}>
              <div style={styles.stepHeader}>
                <div style={styles.stepBadge}>
                  <div style={styles.stepBadgeIcon}>
                    <Code2 size={16} color="#3b82f6" />
                  </div>
                  <span style={styles.stepBadgeText}>Mission 1 of 4</span>
                </div>
                <h2 style={styles.stepTitle}>Select Your Programming Languages</h2>
                <p style={styles.stepSubtitle}>Choose the languages you're skilled at. Select 3+ for better matches!</p>
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
                      {isSelected && <CheckCircle size={14} style={{ marginRight: '6px' }} />}
                      {language.name}
                    </button>
                  );
                })}
              </div>

              {selectedLanguages.length > 0 && (
                <div style={styles.selectionCount}>
                  <Star size={16} color="#fbbf24" fill="#fbbf24" />
                  {selectedLanguages.length} language{selectedLanguages.length !== 1 ? 's' : ''} selected
                  {selectedLanguages.length >= 3 && <span style={{ marginLeft: '8px' }}>🎯 Great choices!</span>}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Topics */}
          {currentStep === 2 && (
            <div style={styles.stepContainer}>
              <div style={styles.stepHeader}>
                <div style={styles.stepBadge}>
                  <div style={styles.stepBadgeIcon}>
                    <BookOpen size={16} color="#3b82f6" />
                  </div>
                  <span style={styles.stepBadgeText}>Mission 2 of 4</span>
                </div>
                <h2 style={styles.stepTitle}>What Topics Interest You?</h2>
                <p style={styles.stepSubtitle}>Select areas you'd like to explore and work on.</p>
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
                      {isSelected && <CheckCircle size={14} style={{ marginRight: '6px' }} />}
                      {topic.name}
                    </button>
                  );
                })}
              </div>

              {selectedTopics.length > 0 && (
                <div style={styles.selectionCount}>
                  <Target size={16} color="#10b981" />
                  {selectedTopics.length} topic{selectedTopics.length !== 1 ? 's' : ''} selected
                  {selectedTopics.length >= 3 && <span style={{ marginLeft: '8px' }}>🚀 Explorer!</span>}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Experience */}
          {currentStep === 3 && (
            <div style={styles.stepContainer}>
              <div style={styles.stepHeader}>
                <div style={styles.stepBadge}>
                  <div style={styles.stepBadgeIcon}>
                    <Clock size={16} color="#3b82f6" />
                  </div>
                  <span style={styles.stepBadgeText}>Mission 3 of 4</span>
                </div>
                <h2 style={styles.stepTitle}>Your Experience Level</h2>
                <p style={styles.stepSubtitle}>How many years have you been coding?</p>
              </div>
              
              <div style={styles.experienceContainer}>
                <div style={styles.experienceInnerGlow} />
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
                    const LevelIcon = level.icon;
                    return (
                      <div style={styles.experienceRankContainer}>
                        <div 
                          className="experience-rank-badge"
                          style={{
                            ...styles.experienceRankBadge,
                            backgroundColor: `${level.color}20`,
                            borderColor: level.color,
                            color: level.color,
                            boxShadow: `0 0 30px ${level.color}40`
                          }}
                        >
                          {level.rank}
                        </div>
                        <div style={{
                          ...styles.experienceLevelBadge,
                          backgroundColor: `${level.color}15`,
                          borderColor: `${level.color}40`,
                          color: level.color
                        }}>
                          <LevelIcon size={18} />
                          <span>{level.emoji} {level.label}</span>
                        </div>
                      </div>
                    );
                  })()}
                  
                  <p style={styles.experienceText}>
                    {yearsExperience === 0 ? "Everyone starts somewhere! Let's go!" : 
                     yearsExperience === 1 ? '1 year of coding adventures' : 
                     `${yearsExperience} years of coding mastery`}
                  </p>
                </div>
              </div>
            </div>
          )}


          {/* Navigation */}
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
                  Back
                </button>
              )}

              <button
                onClick={handleNextStep}
                className="nav-button primary-button primary-nav-button"
                style={{
                  ...styles.navButton,
                  ...styles.primaryButton
                }}
              >
                <span style={styles.buttonGlow} className="button-glow" />
                {currentStep === 3 ? 'Start Challenge' : 'Continue'}
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Step 4: Challenge */}
          {currentStep === 4 && !allChallengesComplete && (
              <PreAssessmentModal
                language={selectedLanguages[currentChallengeIndex]}
                onComplete={handleChallengeComplete}
                onClose={() => setCurrentStep(3)}
              />
          )}

          {showCourseRecommendations && currentRecommendationLanguage && (
          <CourseRecommendationModal
            language={{
              language_id: currentRecommendationLanguage.language_id,
              name: currentRecommendationLanguage.name
            }}
            proficiencyLevel={currentRecommendationLanguage.result?.proficiencyLevel}
            score={currentRecommendationLanguage.result?.score}
            onContinue={handleCourseRecommendationComplete}
            onSkip={handleSkipCourseRecommendations}
          />
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

export default Onboarding;