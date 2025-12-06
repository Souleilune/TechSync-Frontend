// frontend/src/components/CourseRecommendationModal.jsx
// Gamified Dark Theme with Side-by-Side Layout
import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Clock, Award, ChevronRight, Sparkles, CheckCircle, 
  Trophy, Code2, Target, Zap, Shield, Radio, Star, TrendingUp,
  Layers, ArrowRight
} from 'lucide-react';
import CourseDetailsModal from './CourseDetailsModal';

const CourseRecommendationModal = ({ 
  languages,
  challengesPassed = 0,
  totalChallenges = 1,
  onContinue, 
  onSkip 
}) => {
  const [coursesByLanguage, setCoursesByLanguage] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savedCourses, setSavedCourses] = useState(new Set());
  const [enrolling, setEnrolling] = useState(new Set());
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    if (languages && languages.length > 0) {
      loadAllCourseRecommendations();
    }
  }, [languages]);

  const loadAllCourseRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('❌ No authentication token found');
        setError('Authentication required');
        setLoading(false);
        setTimeout(() => {
          onContinue([]);
        }, 1000);
        return;
      }

      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      
      console.log('📚 Loading courses for languages:', languages.map(l => l.name));
      
      const coursesPromises = languages.map(async (lang) => {
        try {
          console.log(`\n🔍 Fetching courses for ${lang.name} (ID: ${lang.language_id})...`);
          
          const response = await fetch(`${API_URL}/recommendations/challenge-failure`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              challengeId: 'onboarding-assessment',
              attemptCount: 15,
              programmingLanguageId: lang.language_id,
              difficultyLevel: 'beginner'
            })
          });

          if (response.status === 401) {
            throw new Error('Session expired');
          }

          if (!response.ok) {
            console.error(`  ❌ Failed to fetch courses for ${lang.name}:`, response.status);
            return { language: lang, courses: [] };
          }

          const data = await response.json();
          
          if (data.success && data.recommendations) {
            const internalCourses = data.recommendations.filter(resource => {
              const hasInternalProvider = resource.provider?.toLowerCase() === 'internal_course';
              const hasCourseType = resource.type?.toLowerCase() === 'course';
              const hasCourseId = !!resource.courseId;
              const hasCoursePath = resource.url?.includes('/courses/');
              return hasInternalProvider || hasCourseType || hasCourseId || hasCoursePath;
            });
            
            return { language: lang, courses: internalCourses };
          }
          
          return { language: lang, courses: [] };
        } catch (err) {
          console.error(`  ❌ Error loading courses for ${lang.name}:`, err);
          return { language: lang, courses: [] };
        }
      });

      const results = await Promise.all(coursesPromises);
      
      const coursesMap = {};
      results.forEach(({ language, courses }) => {
        coursesMap[language.language_id] = { language, courses };
      });

      setCoursesByLanguage(coursesMap);
      
    } catch (err) {
      console.error('❌ Error loading courses:', err);
      setError('Unable to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (course) => {
    setSelectedCourse(course);
    setShowDetailsModal(true);
  };

  const handleCloseDetails = () => {
    setShowDetailsModal(false);
    setSelectedCourse(null);
  };

  const handleEnrollCourse = async (course) => {
    try {
      const courseId = extractCourseId(course);
      if (!courseId) return;

      setEnrolling(prev => new Set(prev).add(courseId));

      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_URL}/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setSavedCourses(prev => new Set(prev).add(courseId));
      }
    } catch (err) {
      console.error('❌ Error enrolling in course:', err);
    } finally {
      setEnrolling(prev => {
        const newSet = new Set(prev);
        const courseId = extractCourseId(course);
        newSet.delete(courseId);
        return newSet;
      });
    }
  };

  const extractCourseId = (course) => {
    if (course.courseId) return course.courseId;
    if (course.id) return course.id;
    if (course.url) {
      const match = course.url.match(/\/courses?\/([^/]+)/);
      return match ? match[1] : null;
    }
    return null;
  };

  const isEnrolled = (course) => {
    const courseId = extractCourseId(course);
    return courseId && savedCourses.has(courseId);
  };

  const isEnrolling = (course) => {
    const courseId = extractCourseId(course);
    return courseId && enrolling.has(courseId);
  };

  const handleContinue = () => {
    onContinue(Array.from(savedCourses));
  };

  const handleSkipClick = () => {
    onSkip();
  };

  const getProficiencyData = (score) => {
    if (score >= 90) return { 
      rank: 'S', 
      color: '#a855f7', 
      glow: 'rgba(168, 85, 247, 0.4)',
      title: 'Expert',
      description: 'Outstanding mastery!'
    };
    if (score >= 75) return { 
      rank: 'A', 
      color: '#3b82f6', 
      glow: 'rgba(59, 130, 246, 0.4)',
      title: 'Advanced',
      description: 'Strong skills!'
    };
    if (score >= 60) return { 
      rank: 'B', 
      color: '#10b981', 
      glow: 'rgba(16, 185, 129, 0.4)',
      title: 'Intermediate',
      description: 'Good foundation!'
    };
    return { 
      rank: 'C',
      color: '#f59e0b', 
      glow: 'rgba(245, 158, 11, 0.4)',
      title: 'Beginner',
      description: 'Let\'s grow together!'
    };
  };

  const totalCoursesAvailable = Object.values(coursesByLanguage).reduce(
    (total, { courses }) => total + courses.length, 0
  );

  const keyframes = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(30px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    @keyframes hexPulse {
      0%, 100% { filter: drop-shadow(0 0 15px rgba(59, 130, 246, 0.4)); }
      50% { filter: drop-shadow(0 0 25px rgba(59, 130, 246, 0.7)); }
    }
    
    @keyframes borderGlow {
      0%, 100% { 
        box-shadow: inset 0 0 20px rgba(59, 130, 246, 0.05), 0 0 30px rgba(59, 130, 246, 0.1);
      }
      50% { 
        box-shadow: inset 0 0 30px rgba(59, 130, 246, 0.1), 0 0 50px rgba(59, 130, 246, 0.2);
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
    
    @keyframes pulseDot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.8); }
    }
    
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    
    @keyframes rankPop {
      0% { transform: scale(0) rotate(-180deg); }
      50% { transform: scale(1.2) rotate(10deg); }
      100% { transform: scale(1) rotate(0deg); }
    }
    
    @keyframes progressFill {
      from { width: 0%; }
      to { width: var(--progress-width); }
    }
    
    .hexagon-badge { animation: hexPulse 3s ease-in-out infinite; }
    .main-card { animation: borderGlow 4s ease-in-out infinite; }
    .scan-line { animation: scanLine 3s ease-in-out infinite; }
    .button-glow { animation: shimmer 2s ease-in-out infinite; }
    .pulse-dot { animation: pulseDot 1s ease-in-out infinite; }
    .float-animation { animation: float 3s ease-in-out infinite; }
    .rank-badge { animation: rankPop 0.5s ease-out forwards; }
    
    .course-card:hover {
      transform: translateY(-4px) !important;
      border-color: rgba(59, 130, 246, 0.4) !important;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3) !important;
    }
    
    .enroll-button:hover:not(:disabled) {
      background: rgba(59, 130, 246, 0.25) !important;
      border-color: rgba(59, 130, 246, 0.6) !important;
      transform: translateY(-2px) !important;
    }
    
    .cta-button:hover {
      transform: translateY(-3px) scale(1.02) !important;
      box-shadow: 0 12px 40px rgba(59, 130, 246, 0.5) !important;
    }
    
    .skip-button:hover {
      background: rgba(255, 255, 255, 0.1) !important;
      border-color: rgba(255, 255, 255, 0.2) !important;
    }
  `;

  if (!languages || languages.length === 0) {
    return null;
  }

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.92)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px',
      animation: 'fadeIn 0.3s ease-out'
    },
    modal: {
      position: 'relative',
      backgroundColor: '#0f1116',
      borderRadius: '24px',
      maxWidth: '1200px',
      width: '100%',
      maxHeight: '90vh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.6)',
      animation: 'slideUp 0.5s ease-out',
      border: '1px solid rgba(59, 130, 246, 0.2)'
    },
    gridOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundImage: `
        linear-gradient(rgba(59, 130, 246, 0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(59, 130, 246, 0.02) 1px, transparent 1px)
      `,
      backgroundSize: '40px 40px',
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
    header: {
      position: 'relative',
      zIndex: 2,
      background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, transparent 100%)',
      padding: '28px 32px 20px',
      borderBottom: '1px solid rgba(59, 130, 246, 0.15)',
      textAlign: 'center'
    },
    headerHexagon: {
      position: 'relative',
      width: '70px',
      height: '80px',
      margin: '0 auto 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    statusBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 14px',
      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1))',
      border: '1px solid rgba(16, 185, 129, 0.3)',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: '700',
      color: '#10b981',
      textTransform: 'uppercase',
      letterSpacing: '1.5px',
      marginBottom: '12px'
    },
    title: {
      fontSize: '2rem',
      fontWeight: '800',
      margin: '0 0 8px 0',
      background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text'
    },
    subtitle: {
      fontSize: '15px',
      color: '#64748b',
      margin: 0
    },
    mainContent: {
      display: 'flex',
      flex: 1,
      overflow: 'hidden',
      position: 'relative',
      zIndex: 2
    },
    leftPanel: {
      width: '380px',
      flexShrink: 0,
      background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, rgba(7, 11, 20, 0.9) 100%)',
      borderRight: '1px solid rgba(59, 130, 246, 0.15)',
      padding: '24px',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column'
    },
    rightPanel: {
      flex: 1,
      padding: '24px',
      overflowY: 'auto',
      background: '#0a0c10'
    },
    panelHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '20px'
    },
    panelIcon: {
      width: '44px',
      height: '44px',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid'
    },
    panelTitle: {
      fontSize: '18px',
      fontWeight: '700',
      color: '#fff',
      margin: 0
    },
    panelSubtitle: {
      fontSize: '13px',
      color: '#64748b',
      margin: '4px 0 0 0'
    },
    assessmentCard: {
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01))',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '12px',
      transition: 'all 0.3s ease'
    },
    languageRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '14px'
    },
    rankBadge: {
      width: '48px',
      height: '48px',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '20px',
      fontWeight: '800',
      fontFamily: 'monospace',
      border: '2px solid',
      flexShrink: 0
    },
    languageInfo: {
      flex: 1
    },
    languageName: {
      fontSize: '16px',
      fontWeight: '700',
      color: '#fff',
      marginBottom: '4px'
    },
    proficiencyRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    proficiencyBadge: {
      fontSize: '11px',
      fontWeight: '600',
      padding: '3px 10px',
      borderRadius: '8px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    scoreDisplay: {
      fontSize: '24px',
      fontWeight: '800',
      fontFamily: 'monospace'
    },
    encouragementCard: {
      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.05))',
      border: '1px solid rgba(245, 158, 11, 0.25)',
      borderRadius: '14px',
      padding: '18px',
      marginTop: 'auto',
      textAlign: 'center'
    },
    encouragementIcon: {
      fontSize: '32px',
      marginBottom: '10px'
    },
    encouragementText: {
      fontSize: '13px',
      color: '#fbbf24',
      margin: 0,
      lineHeight: '1.6'
    },
    coursesHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '20px'
    },
    courseCount: {
      fontSize: '13px',
      color: '#64748b',
      padding: '6px 14px',
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '10px',
      fontWeight: '600'
    },
    languageSection: {
      marginBottom: '24px'
    },
    languageSectionHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '14px',
      paddingBottom: '10px',
      borderBottom: '1px solid rgba(59, 130, 246, 0.15)'
    },
    languageSectionBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '28px',
      height: '28px',
      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.15))',
      border: '1px solid rgba(59, 130, 246, 0.3)',
      borderRadius: '8px',
      color: '#60a5fa',
      fontSize: '12px',
      fontWeight: '700'
    },
    languageSectionTitle: {
      fontSize: '15px',
      fontWeight: '700',
      color: '#fff',
      flex: 1,
      margin: 0
    },
    coursesGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
      gap: '14px'
    },
    courseCard: {
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(7, 11, 20, 0.9))',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '14px',
      padding: '18px',
      transition: 'all 0.3s ease',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      cursor: 'default'
    },
    courseHeader: {
      display: 'flex',
      gap: '12px',
      alignItems: 'flex-start'
    },
    courseIconContainer: {
      width: '42px',
      height: '42px',
      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.1))',
      border: '1px solid rgba(59, 130, 246, 0.25)',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      fontSize: '20px'
    },
    courseTitle: {
      fontSize: '14px',
      fontWeight: '700',
      color: '#fff',
      margin: 0,
      lineHeight: '1.4',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical'
    },
    courseMeta: {
      display: 'flex',
      gap: '10px',
      marginTop: '6px',
      flexWrap: 'wrap'
    },
    courseMetaItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '11px',
      color: '#64748b',
      fontWeight: '500'
    },
    courseDescription: {
      fontSize: '12px',
      color: '#94a3b8',
      lineHeight: '1.6',
      margin: 0,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical'
    },
    enrollButton: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      padding: '10px 14px',
      background: 'rgba(59, 130, 246, 0.12)',
      color: '#3b82f6',
      border: '1px solid rgba(59, 130, 246, 0.3)',
      borderRadius: '10px',
      fontSize: '12px',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      marginTop: 'auto',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    enrolledButton: {
      background: 'rgba(16, 185, 129, 0.12)',
      color: '#10b981',
      border: '1px solid rgba(16, 185, 129, 0.3)',
      cursor: 'not-allowed'
    },
    enrollingButton: {
      background: 'rgba(100, 116, 139, 0.12)',
      color: '#64748b',
      border: '1px solid rgba(100, 116, 139, 0.3)',
      cursor: 'not-allowed'
    },
    buttonSpinner: {
      width: '14px',
      height: '14px',
      border: '2px solid rgba(100, 116, 139, 0.3)',
      borderTop: '2px solid #64748b',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite'
    },
    loadingContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 20px',
      gap: '20px'
    },
    radarContainer: {
      position: 'relative',
      width: '80px',
      height: '80px'
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
      animation: 'pulseDot 2s ease-out infinite'
    },
    radarCenter: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '40px',
      height: '40px',
      background: 'rgba(15, 23, 42, 0.9)',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '2px solid rgba(59, 130, 246, 0.5)'
    },
    loadingText: {
      fontSize: '14px',
      color: '#64748b',
      margin: 0
    },
    emptyContainer: {
      textAlign: 'center',
      padding: '40px 20px'
    },
    emptyIcon: {
      fontSize: '48px',
      marginBottom: '16px',
      opacity: 0.6
    },
    emptyTitle: {
      fontSize: '18px',
      fontWeight: '700',
      color: '#94a3b8',
      margin: '0 0 8px 0'
    },
    emptyText: {
      fontSize: '13px',
      color: '#64748b',
      margin: 0,
      lineHeight: '1.6'
    },
    footer: {
      position: 'relative',
      zIndex: 2,
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      padding: '20px 32px',
      borderTop: '1px solid rgba(59, 130, 246, 0.15)',
      background: 'linear-gradient(180deg, transparent 0%, rgba(15, 23, 42, 0.95) 100%)'
    },
    button: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '14px 28px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '700',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      fontFamily: 'inherit',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    primaryButton: {
      background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
      color: '#fff',
      boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)',
      position: 'relative',
      overflow: 'hidden'
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
    }
  };

  return (
    <>
      <style>{keyframes}</style>
      <div style={styles.overlay}>
        <div style={styles.modal} className="main-card">
          {/* Grid Overlay */}
          <div style={styles.gridOverlay} />
          
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
            <div style={styles.headerHexagon} className="hexagon-badge float-animation">
              <svg style={{ position: 'absolute', width: '100%', height: '100%' }} viewBox="0 0 70 80">
                <defs>
                  <linearGradient id="modalHexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.8"/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.8"/>
                  </linearGradient>
                </defs>
                <polygon 
                  points="35,2 67,20 67,60 35,78 3,60 3,20" 
                  fill="rgba(15, 23, 42, 0.9)"
                  stroke="url(#modalHexGrad)"
                  strokeWidth="2"
                />
              </svg>
              <div style={{ position: 'relative', zIndex: 2 }}>
                <Trophy size={28} color="#10b981" />
              </div>
            </div>
            
            <div style={styles.statusBadge}>
              <CheckCircle size={12} />
              ASSESSMENT COMPLETE
            </div>
            
            <h2 style={styles.title}>Great Work! 🎉</h2>
            <p style={styles.subtitle}>
              You've completed {challengesPassed} of {totalChallenges} skill assessments
            </p>
          </div>

          {/* Main Content - Side by Side */}
          <div style={styles.mainContent}>
            {/* Left Panel - Assessment Results */}
            <div style={styles.leftPanel}>
              <div style={styles.panelHeader}>
                <div style={{
                  ...styles.panelIcon,
                  background: 'rgba(139, 92, 246, 0.15)',
                  borderColor: 'rgba(139, 92, 246, 0.3)'
                }}>
                  <Target size={20} color="#a78bfa" />
                </div>
                <div>
                  <h3 style={styles.panelTitle}>Your Results</h3>
                  <p style={styles.panelSubtitle}>Skill assessment breakdown</p>
                </div>
              </div>

              {/* Language Results */}
              {languages.map((lang) => {
                const proficiency = getProficiencyData(lang.score || 0);
                return (
                  <div key={lang.language_id} style={styles.assessmentCard}>
                    <div style={styles.languageRow}>
                      <div 
                        className="rank-badge"
                        style={{
                          ...styles.rankBadge,
                          background: `linear-gradient(135deg, ${proficiency.color}20, ${proficiency.color}10)`,
                          borderColor: proficiency.color,
                          color: proficiency.color,
                          boxShadow: `0 0 20px ${proficiency.glow}`
                        }}
                      >
                        {proficiency.rank}
                      </div>
                      <div style={styles.languageInfo}>
                        <div style={styles.languageName}>{lang.name}</div>
                        <div style={styles.proficiencyRow}>
                          <span style={{
                            ...styles.proficiencyBadge,
                            background: `${proficiency.color}15`,
                            color: proficiency.color
                          }}>
                            {proficiency.icon} {proficiency.title}
                          </span>
                        </div>
                      </div>
                      <div style={{
                        ...styles.scoreDisplay,
                        color: proficiency.color
                      }}>
                        {Math.round(lang.score || 0)}%
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div style={{
                      marginTop: '12px',
                      height: '6px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${lang.score || 0}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, ${proficiency.color}, ${proficiency.color}aa)`,
                        borderRadius: '3px',
                        transition: 'width 1s ease-out'
                      }} />
                    </div>
                  </div>
                );
              })}

              {/* Encouragement Card */}
              {languages.some(l => (l.score || 0) < 60) && (
                <div style={styles.encouragementCard}>
                  <p style={styles.encouragementText}>
                    <strong>Everyone starts somewhere!</strong><br />
                    These courses will help you build a strong foundation.
                  </p>
                </div>
              )}
            </div>

            {/* Right Panel - Learning Path */}
            <div style={styles.rightPanel}>
              <div style={styles.coursesHeader}>
                <div style={styles.panelHeader}>
                  <div style={{
                    ...styles.panelIcon,
                    background: 'rgba(59, 130, 246, 0.15)',
                    borderColor: 'rgba(59, 130, 246, 0.3)'
                  }}>
                    <Sparkles size={20} color="#60a5fa" />
                  </div>
                  <div>
                    <h3 style={styles.panelTitle}>Learning Path</h3>
                    <p style={styles.panelSubtitle}>Curated courses for your journey</p>
                  </div>
                </div>
                {!loading && totalCoursesAvailable > 0 && (
                  <div style={styles.courseCount}>
                    {totalCoursesAvailable} courses available
                  </div>
                )}
              </div>

              {loading ? (
                <div style={styles.loadingContainer}>
                  <div style={styles.radarContainer}>
                    <div style={styles.radarRing} />
                    <div style={{...styles.radarRing, animationDelay: '1s'}} />
                    <div style={styles.radarCenter}>
                      <BookOpen size={20} color="#3b82f6" />
                    </div>
                  </div>
                  <p style={styles.loadingText}>Finding perfect courses for you...</p>
                </div>
              ) : error || totalCoursesAvailable === 0 ? (
                <div style={styles.emptyContainer}>
                  <div style={styles.emptyIcon}>📚</div>
                  <h3 style={styles.emptyTitle}>
                    {error ? 'Unable to Load' : 'Coming Soon'}
                  </h3>
                  <p style={styles.emptyText}>
                    Courses are being prepared. You can explore them later from your dashboard!
                  </p>
                </div>
              ) : (
                <>
                  {Object.entries(coursesByLanguage).map(([langId, { language, courses }]) => (
                    courses.length > 0 && (
                      <div key={langId} style={styles.languageSection}>
                        <div style={styles.languageSectionHeader}>
                          <div style={styles.languageSectionBadge}>
                            <Code2 size={14} />
                          </div>
                          <h4 style={styles.languageSectionTitle}>{language.name}</h4>
                          <span style={{
                            fontSize: '12px',
                            color: '#64748b',
                            fontWeight: '500'
                          }}>
                            {courses.length} {courses.length === 1 ? 'course' : 'courses'}
                          </span>
                        </div>

                        <div style={styles.coursesGrid}>
                          {courses.map((course, idx) => (
                            <div 
                              key={idx} 
                              style={styles.courseCard}
                              className="course-card"
                            >
                              <div style={styles.courseHeader}>
                                <div style={styles.courseIconContainer}>
                                  {course.icon || '📚'}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <h5 style={styles.courseTitle}>{course.title}</h5>
                                  <div style={styles.courseMeta}>
                                    {course.difficulty && (
                                      <span style={styles.courseMetaItem}>
                                        <Award size={12} />
                                        {course.difficulty}
                                      </span>
                                    )}
                                    {course.duration && (
                                      <span style={styles.courseMetaItem}>
                                        <Clock size={12} />
                                        {course.duration}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <p style={styles.courseDescription}>
                                {course.description || 'Build strong fundamentals with this comprehensive course.'}
                              </p>

                              <div style={{
                                display: 'flex',
                                gap: '8px',
                                marginTop: 'auto'
                              }}>
                                <button
                                  onClick={() => handleViewDetails(course)}
                                  style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    padding: '10px 12px',
                                    background: 'rgba(100, 116, 139, 0.12)',
                                    color: '#94a3b8',
                                    border: '1px solid rgba(100, 116, 139, 0.3)',
                                    borderRadius: '10px',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(100, 116, 139, 0.2)';
                                    e.currentTarget.style.borderColor = 'rgba(100, 116, 139, 0.5)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(100, 116, 139, 0.12)';
                                    e.currentTarget.style.borderColor = 'rgba(100, 116, 139, 0.3)';
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                                    <circle cx="12" cy="12" r="3"/>
                                  </svg>
                                  Details
                                </button>

                                <button
                                  onClick={() => handleEnrollCourse(course)}
                                  disabled={isEnrolled(course) || isEnrolling(course)}
                                  className="enroll-button"
                                  style={{
                                    flex: 1,
                                    ...styles.enrollButton,
                                    marginTop: 0,
                                    ...(isEnrolled(course) ? styles.enrolledButton : {}),
                                    ...(isEnrolling(course) ? styles.enrollingButton : {})
                                  }}
                                >
                                  {isEnrolled(course) ? (
                                    <>
                                      <CheckCircle size={14} />
                                      Enrolled
                                    </>
                                  ) : isEnrolling(course) ? (
                                    <>
                                      <div style={styles.buttonSpinner} />
                                      Enrolling...
                                    </>
                                  ) : (
                                    <>
                                      <BookOpen size={14} />
                                      Enroll
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            <button 
              onClick={handleSkipClick} 
              style={{ ...styles.button, ...styles.secondaryButton }}
              className="skip-button"
            >
              Skip for Now
            </button>
            <button 
              onClick={handleContinue} 
              style={{ ...styles.button, ...styles.primaryButton }}
              className="cta-button"
            >
              <span style={styles.buttonGlow} className="button-glow" />
              Continue {savedCourses.size > 0 && `(${savedCourses.size} enrolled)`}
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
      {showDetailsModal && selectedCourse && (
        <CourseDetailsModal
          course={selectedCourse}
          onClose={handleCloseDetails}
          onEnroll={handleEnrollCourse}
          isEnrolled={isEnrolled(selectedCourse)}
          isEnrolling={isEnrolling(selectedCourse)}
        />
      )}
    </>
  );
};

export default CourseRecommendationModal;