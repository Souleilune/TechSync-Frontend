// src/components/CourseDetailsModal.jsx
// Gamified Dark Theme Version - FETCHES REAL COURSE DATA
import React, { useState, useEffect } from 'react';
import { 
  X, BookOpen, Clock, Award, Layers, Target, CheckCircle, 
  PlayCircle, ChevronRight, ChevronDown, Code, Video, FileText,
  Sparkles, TrendingUp, Shield, Zap, Radio, Trophy, Star, Users
} from 'lucide-react';

const CourseDetailsModal = ({ course, onClose, onEnroll, isEnrolled, isEnrolling }) => {
  const [expandedModules, setExpandedModules] = useState({});
  const [courseDetails, setCourseDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch real course data on mount
  useEffect(() => {
    fetchCourseDetails();
  }, [course]);

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      const courseId = extractCourseId(course);
      
      if (!courseId) {
        console.warn('⚠️ No course ID found, using provided course data');
        setCourseDetails({ ...course, modules: generateMockModules(course) });
        setLoading(false);
        return;
      }

      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      console.log(`🔍 Fetching course details for ID: ${courseId}`);
      
      const response = await fetch(`${API_URL}/courses/${courseId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Course details fetched successfully:', data);
        
        // Handle different response structures
        const fetchedCourse = data.course || data;
        setCourseDetails({
          ...course, // Keep original course data as fallback
          ...fetchedCourse, // Override with fetched data
          modules: fetchedCourse.modules || fetchedCourse.course_modules || []
        });
      } else {
        console.warn(`⚠️ Failed to fetch course (${response.status}), using provided data`);
        setCourseDetails({ ...course, modules: generateMockModules(course) });
      }
    } catch (err) {
      console.error('❌ Error fetching course details:', err);
      setCourseDetails({ ...course, modules: generateMockModules(course) });
    } finally {
      setLoading(false);
    }
  };

  const extractCourseId = (course) => {
    if (course.courseId) return course.courseId;
    if (course.id) return course.id;
    if (course.course_id) return course.course_id;
    if (course.url) {
      const match = course.url.match(/\/courses?\/([^/]+)/);
      return match ? match[1] : null;
    }
    return null;
  };

  const toggleModule = (moduleIndex) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleIndex]: !prev[moduleIndex]
    }));
  };

  const getLessonIcon = (lessonType) => {
    switch(lessonType?.toLowerCase()) {
      case 'video':
        return <Video size={16} color="#a78bfa" />;
      case 'coding':
      case 'project':
        return <Code size={16} color="#60a5fa" />;
      default:
        return <FileText size={16} color="#34d399" />;
    }
  };

  const getLessonTypeStyle = (lessonType) => {
    switch(lessonType?.toLowerCase()) {
      case 'video':
        return { bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.3)', color: '#a78bfa' };
      case 'coding':
      case 'project':
        return { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)', color: '#60a5fa' };
      default:
        return { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', color: '#34d399' };
    }
  };

  const getDifficultyData = (difficulty) => {
    switch(difficulty?.toLowerCase()) {
      case 'beginner':
        return { color: '#10b981', icon: '🌱', label: 'Beginner' };
      case 'intermediate':
        return { color: '#f59e0b', icon: '⚡', label: 'Intermediate' };
      case 'advanced':
        return { color: '#ef4444', icon: '🔥', label: 'Advanced' };
      default:
        return { color: '#3b82f6', icon: '📚', label: difficulty || 'All Levels' };
    }
  };

  // CRITICAL: Define keyframes and styles BEFORE any conditional returns
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
      50% { filter: drop-shadow(0 0 30px rgba(59, 130, 246, 0.7)); }
    }
    
    @keyframes borderGlow {
      0%, 100% { 
        box-shadow: inset 0 0 20px rgba(59, 130, 246, 0.05), 0 0 40px rgba(59, 130, 246, 0.1);
      }
      50% { 
        box-shadow: inset 0 0 30px rgba(59, 130, 246, 0.1), 0 0 60px rgba(59, 130, 246, 0.2);
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
    
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    
    @keyframes progressGlow {
      0%, 100% { box-shadow: 0 0 10px rgba(59, 130, 246, 0.3); }
      50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.6); }
    }
    
    .hexagon-badge { animation: hexPulse 3s ease-in-out infinite; }
    .main-card { animation: borderGlow 4s ease-in-out infinite; }
    .scan-line { animation: scanLine 3s ease-in-out infinite; }
    .button-glow { animation: shimmer 2s ease-in-out infinite; }
    .float-animation { animation: float 3s ease-in-out infinite; }
    
    .module-card:hover {
      border-color: rgba(59, 130, 246, 0.3) !important;
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(139, 92, 246, 0.05)) !important;
    }
    
    .close-button:hover {
      background: rgba(239, 68, 68, 0.15) !important;
      border-color: rgba(239, 68, 68, 0.3) !important;
    }
    
    .close-button:hover svg {
      color: #ef4444 !important;
    }
    
    .enroll-button:hover:not(:disabled) {
      transform: translateY(-3px) !important;
      box-shadow: 0 12px 35px rgba(59, 130, 246, 0.5) !important;
    }
    
    .learning-item:hover {
      border-color: rgba(16, 185, 129, 0.4) !important;
      background: rgba(16, 185, 129, 0.08) !important;
    }
  `;

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: '240px',
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.92)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '40px 20px 20px 20px' ,
      backdropFilter: 'blur(12px)',
      animation: 'fadeIn 0.3s ease-out'
    },
    modal: {
      position: 'relative',
      backgroundColor: '#0f1116',
      borderRadius: '24px',
      maxWidth: '950px',
      width: '100%',
      maxHeight: 'calc(100vh - 80px)',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.6)',
      border: '1px solid rgba(59, 130, 246, 0.2)',
      animation: 'slideUp 0.4s ease-out',
      overflow: 'hidden'
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
    scanLine: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '2px',
      background: 'linear-gradient(90deg, transparent, #3b82f6, #8b5cf6, transparent)',
      boxShadow: '0 0 15px #3b82f6',
      zIndex: 3,
      overflow: 'hidden'
    },
    header: {
      position: 'relative',
      zIndex: 2,
      display: 'flex',
      justifyContent: 'flex-end',
      padding: '20px 24px 0 24px'
    },
    closeButton: {
      width: '44px',
      height: '44px',
      borderRadius: '12px',
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s ease'
    },
    content: {
      flex: 1,
      overflowY: 'auto',
      padding: '0 32px 32px 32px',
      position: 'relative',
      zIndex: 2
    },
    hero: {
      textAlign: 'center',
      marginBottom: '32px',
      paddingTop: '8px'
    },
    hexagonContainer: {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: '20px'
    },
    hexagonBadge: {
      position: 'relative',
      width: '90px',
      height: '104px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    heroBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 18px',
      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(168, 85, 247, 0.1))',
      border: '1px solid rgba(139, 92, 246, 0.3)',
      color: '#a78bfa',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '700',
      letterSpacing: '1px',
      textTransform: 'uppercase',
      marginBottom: '20px'
    },
    title: {
      fontSize: '2.25rem',
      fontWeight: '800',
      margin: '0 0 16px 0',
      lineHeight: '1.2',
      background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text'
    },
    description: {
      fontSize: '16px',
      color: '#64748b',
      lineHeight: '1.7',
      margin: '0 0 28px 0',
      maxWidth: '700px',
      marginLeft: 'auto',
      marginRight: 'auto'
    },
    stats: {
      display: 'flex',
      justifyContent: 'center',
      gap: '16px',
      flexWrap: 'wrap'
    },
    statItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '14px 20px',
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(7, 11, 20, 0.9))',
      borderRadius: '14px',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      transition: 'all 0.3s ease'
    },
    statIcon: {
      width: '36px',
      height: '36px',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid'
    },
    statValue: {
      fontSize: '14px',
      fontWeight: '700',
      color: '#fff'
    },
    divider: {
      height: '1px',
      background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.3), transparent)',
      margin: '32px 0'
    },
    section: {
      marginBottom: '32px'
    },
    sectionHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      marginBottom: '20px'
    },
    sectionIcon: {
      width: '48px',
      height: '48px',
      borderRadius: '14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid'
    },
    sectionTitleContainer: {
      flex: 1
    },
    sectionTitle: {
      fontSize: '20px',
      fontWeight: '700',
      color: '#fff',
      margin: 0
    },
    sectionSubtitle: {
      fontSize: '13px',
      color: '#64748b',
      margin: '4px 0 0 0'
    },
    learningGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '14px'
    },
    learningItem: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '14px',
      padding: '18px',
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.6), rgba(7, 11, 20, 0.8))',
      borderRadius: '14px',
      border: '1px solid rgba(16, 185, 129, 0.15)',
      transition: 'all 0.3s ease',
      cursor: 'default'
    },
    learningIconContainer: {
      width: '32px',
      height: '32px',
      borderRadius: '10px',
      background: 'rgba(16, 185, 129, 0.15)',
      border: '1px solid rgba(16, 185, 129, 0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    },
    learningText: {
      fontSize: '14px',
      color: '#e2e8f0',
      lineHeight: '1.5',
      fontWeight: '500'
    },
    modulesList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    },
    moduleCard: {
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.6), rgba(7, 11, 20, 0.8))',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '16px',
      overflow: 'hidden',
      transition: 'all 0.3s ease'
    },
    moduleHeader: {
      width: '100%',
      padding: '20px',
      backgroundColor: 'transparent',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      textAlign: 'left',
      transition: 'all 0.3s ease'
    },
    moduleHeaderLeft: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '16px',
      flex: 1
    },
    moduleNumber: {
      width: '40px',
      height: '40px',
      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.15))',
      border: '1px solid rgba(59, 130, 246, 0.3)',
      color: '#60a5fa',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      fontWeight: '800',
      fontFamily: 'monospace',
      flexShrink: 0
    },
    moduleInfo: {
      flex: 1,
      minWidth: 0
    },
    moduleTitle: {
      fontSize: '16px',
      fontWeight: '700',
      color: '#fff',
      margin: '0 0 6px 0',
      lineHeight: '1.3'
    },
    moduleDescription: {
      fontSize: '13px',
      color: '#64748b',
      margin: '0 0 10px 0',
      lineHeight: '1.5'
    },
    moduleMeta: {
      display: 'flex',
      gap: '16px',
      fontSize: '12px',
      color: '#64748b',
      fontWeight: '600'
    },
    moduleMetaItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    moduleChevron: {
      width: '36px',
      height: '36px',
      borderRadius: '10px',
      background: 'rgba(255, 255, 255, 0.05)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s ease'
    },
    lessonsList: {
      padding: '0 20px 20px 20px',
      borderTop: '1px solid rgba(255, 255, 255, 0.05)'
    },
    lessonItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      padding: '14px',
      marginTop: '10px',
      background: 'rgba(0, 0, 0, 0.2)',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      transition: 'all 0.3s ease'
    },
    lessonIcon: {
      width: '36px',
      height: '36px',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      border: '1px solid'
    },
    lessonInfo: {
      flex: 1,
      minWidth: 0
    },
    lessonTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#e2e8f0',
      display: 'block',
      marginBottom: '6px'
    },
    lessonMeta: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontSize: '12px',
      color: '#64748b'
    },
    lessonTypeBadge: {
      padding: '3px 10px',
      borderRadius: '8px',
      fontSize: '11px',
      fontWeight: '600',
      textTransform: 'capitalize'
    },
    footer: {
      position: 'relative',
      zIndex: 2,
      padding: '24px 32px',
      background: 'linear-gradient(180deg, transparent 0%, rgba(15, 23, 42, 0.98) 100%)',
      borderTop: '1px solid rgba(59, 130, 246, 0.15)'
    },
    footerContent: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '24px',
      flexWrap: 'wrap'
    },
    footerInfo: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    },
    footerTitle: {
      fontSize: '18px',
      fontWeight: '700',
      color: '#fff'
    },
    footerSubtitle: {
      fontSize: '14px',
      color: '#64748b',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    enrollButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '16px 36px',
      background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
      color: '#fff',
      border: 'none',
      borderRadius: '14px',
      fontSize: '15px',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 8px 30px rgba(59, 130, 246, 0.4)',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      position: 'relative',
      overflow: 'hidden'
    },
    enrolledButton: {
      background: 'linear-gradient(135deg, #10b981, #059669)',
      boxShadow: '0 8px 30px rgba(16, 185, 129, 0.4)',
      cursor: 'default'
    },
    enrollingButton: {
      background: 'linear-gradient(135deg, #64748b, #475569)',
      boxShadow: 'none',
      cursor: 'not-allowed'
    },
    buttonGlow: {
      position: 'absolute',
      top: 0,
      left: '-100%',
      width: '100%',
      height: '100%',
      background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)'
    },
    spinner: {
      width: '18px',
      height: '18px',
      border: '2px solid rgba(255, 255, 255, 0.3)',
      borderTop: '2px solid #fff',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite'
    }
  };

  // NOW check loading state - after keyframes and styles are defined
  if (loading) {
  return (
    <>
      <style>{keyframes}</style>
      <div style={styles.overlay} onClick={onClose}>
        <div 
          style={{
            ...styles.modal, 
            padding: '60px', 
            display: 'flex',           // ✅ ADD THIS
            justifyContent: 'center', 
            alignItems: 'center'
          }} 
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={styles.spinner} />
            <p style={{ color: '#64748b', marginTop: '20px', fontSize: '14px' }}>Loading course details...</p>
          </div>
        </div>
      </div>
    </>
  );
}

  if (!courseDetails) {
    return null;
  }

  // Use fetched course details
  const modules = courseDetails.modules || courseDetails.course_modules || generateMockModules(courseDetails);
  const difficultyData = getDifficultyData(courseDetails.level || courseDetails.difficulty);

  // Calculate totals from actual data
  const totalLessons = modules.reduce((sum, module) => {
    const lessons = module.lessons || module.course_lessons || [];
    return sum + lessons.length;
  }, 0) || courseDetails.total_lessons || 24;

  const totalDuration = courseDetails.estimated_duration_hours 
    ? `${courseDetails.estimated_duration_hours} Hours`
    : (courseDetails.duration || '8 Hours');

  return (
    <>
      <style>{keyframes}</style>
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.modal} className="main-card" onClick={(e) => e.stopPropagation()}>
          {/* Grid Overlay */}
          <div style={styles.gridOverlay} />
          
          {/* Scan Line */}
          <div style={styles.scanLine} className="scan-line" />
          
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
            <button onClick={onClose} style={styles.closeButton} className="close-button">
              <X size={20} color="#64748b" />
            </button>
          </div>

          {/* Content */}
          <div style={styles.content}>
            {/* Hero Section */}
            <div style={styles.hero}>
              {/* Hexagon Badge */}
              <div style={styles.hexagonContainer}>
                <div style={styles.hexagonBadge} className="hexagon-badge float-animation">
                  <svg style={{ position: 'absolute', width: '100%', height: '100%' }} viewBox="0 0 90 104">
                    <defs>
                      <linearGradient id="courseDetailHexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8"/>
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8"/>
                      </linearGradient>
                    </defs>
                    <polygon 
                      points="45,2 87,26 87,78 45,102 3,78 3,26" 
                      fill="rgba(15, 23, 42, 0.9)"
                      stroke="url(#courseDetailHexGrad)"
                      strokeWidth="2"
                    />
                  </svg>
                  <div style={{ position: 'relative', zIndex: 2, fontSize: '2.5rem' }}>
                    {courseDetails.icon_emoji || courseDetails.icon || '📚'}
                  </div>
                </div>
              </div>

              <div style={styles.heroBadge}>
                <Sparkles size={14} />
                COURSE DETAILS
              </div>
              
              <h2 style={styles.title}>{courseDetails.title}</h2>
              
              <p style={styles.description}>
                {courseDetails.description || courseDetails.short_description || 'Comprehensive course to help you master the fundamentals and advance your skills.'}
              </p>

              {/* Stats */}
              <div style={styles.stats}>
                <div style={styles.statItem}>
                  <div style={{
                    ...styles.statIcon,
                    background: 'rgba(59, 130, 246, 0.15)',
                    borderColor: 'rgba(59, 130, 246, 0.3)'
                  }}>
                    <Layers size={18} color="#60a5fa" />
                  </div>
                  <span style={styles.statValue}>{courseDetails.total_modules || modules.length} Modules</span>
                </div>
                <div style={styles.statItem}>
                  <div style={{
                    ...styles.statIcon,
                    background: 'rgba(16, 185, 129, 0.15)',
                    borderColor: 'rgba(16, 185, 129, 0.3)'
                  }}>
                    <BookOpen size={18} color="#34d399" />
                  </div>
                  <span style={styles.statValue}>{totalLessons} Lessons</span>
                </div>
                <div style={styles.statItem}>
                  <div style={{
                    ...styles.statIcon,
                    background: 'rgba(245, 158, 11, 0.15)',
                    borderColor: 'rgba(245, 158, 11, 0.3)'
                  }}>
                    <Clock size={18} color="#fbbf24" />
                  </div>
                  <span style={styles.statValue}>{totalDuration}</span>
                </div>
                <div style={styles.statItem}>
                  <div style={{
                    ...styles.statIcon,
                    background: `${difficultyData.color}15`,
                    borderColor: `${difficultyData.color}40`
                  }}>
                    <span style={{ fontSize: '16px' }}>{difficultyData.icon}</span>
                  </div>
                  <span style={styles.statValue}>{difficultyData.label}</span>
                </div>
              </div>
            </div>

            <div style={styles.divider} />

            {/* What You'll Learn */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <div style={{
                  ...styles.sectionIcon,
                  background: 'rgba(59, 130, 246, 0.15)',
                  borderColor: 'rgba(59, 130, 246, 0.3)'
                }}>
                  <Target size={22} color="#60a5fa" />
                </div>
                <div style={styles.sectionTitleContainer}>
                  <h3 style={styles.sectionTitle}>What You'll Learn</h3>
                  <p style={styles.sectionSubtitle}>Key skills and concepts you'll master</p>
                </div>
              </div>
              
              <div style={styles.learningGrid}>
                {getWhatYouLearn(courseDetails, modules).map((item, idx) => (
                  <div key={idx} style={styles.learningItem} className="learning-item">
                    <div style={styles.learningIconContainer}>
                      <CheckCircle size={16} color="#10b981" />
                    </div>
                    <span style={styles.learningText}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.divider} />

            {/* Course Curriculum */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <div style={{
                  ...styles.sectionIcon,
                  background: 'rgba(245, 158, 11, 0.15)',
                  borderColor: 'rgba(245, 158, 11, 0.3)'
                }}>
                  <BookOpen size={22} color="#fbbf24" />
                </div>
                <div style={styles.sectionTitleContainer}>
                  <h3 style={styles.sectionTitle}>Course Curriculum</h3>
                  <p style={styles.sectionSubtitle}>
                    {modules.length} modules • {totalLessons} lessons
                  </p>
                </div>
              </div>

              <div style={styles.modulesList}>
                {modules.map((module, moduleIndex) => {
                  const isExpanded = expandedModules[moduleIndex];
                  const lessons = module.lessons || module.course_lessons || generateMockLessons(moduleIndex);

                  return (
                    <div key={moduleIndex} style={styles.moduleCard} className="module-card">
                      <button
                        onClick={() => toggleModule(moduleIndex)}
                        style={styles.moduleHeader}
                      >
                        <div style={styles.moduleHeaderLeft}>
                          <div style={styles.moduleNumber}>
                            {String(moduleIndex + 1).padStart(2, '0')}
                          </div>
                          <div style={styles.moduleInfo}>
                            <h4 style={styles.moduleTitle}>{module.title}</h4>
                            {module.description && (
                              <p style={styles.moduleDescription}>{module.description}</p>
                            )}
                            <div style={styles.moduleMeta}>
                              <span style={styles.moduleMetaItem}>
                                <BookOpen size={12} />
                                {lessons.length} lessons
                              </span>
                              {module.estimated_duration_minutes && (
                                <span style={styles.moduleMetaItem}>
                                  <Clock size={12} />
                                  {module.estimated_duration_minutes} min
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div style={{
                          ...styles.moduleChevron,
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                        }}>
                          <ChevronDown size={18} color="#64748b" />
                        </div>
                      </button>

                      {isExpanded && (
                        <div style={styles.lessonsList}>
                          {lessons.map((lesson, lessonIndex) => {
                            const lessonType = lesson.lesson_type || lesson.type || 'text';
                            const typeStyle = getLessonTypeStyle(lessonType);
                            
                            return (
                              <div key={lessonIndex} style={styles.lessonItem}>
                                <div style={{
                                  ...styles.lessonIcon,
                                  background: typeStyle.bg,
                                  borderColor: typeStyle.border
                                }}>
                                  {getLessonIcon(lessonType)}
                                </div>
                                <div style={styles.lessonInfo}>
                                  <span style={styles.lessonTitle}>
                                    {lessonIndex + 1}. {lesson.title}
                                  </span>
                                  <div style={styles.lessonMeta}>
                                    <span style={{
                                      ...styles.lessonTypeBadge,
                                      background: typeStyle.bg,
                                      color: typeStyle.color,
                                      border: `1px solid ${typeStyle.border}`
                                    }}>
                                      {lessonType}
                                    </span>
                                    {lesson.estimated_duration_minutes && (
                                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Clock size={12} />
                                        {lesson.estimated_duration_minutes} min
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer CTA */}
          <div style={styles.footer}>
            <div style={styles.footerContent}>
              <div style={styles.footerInfo}>
                <div style={styles.footerTitle}>
                  {isEnrolled ? '🎉 You\'re enrolled!' : 'Ready to start learning?'}
                </div>
                <div style={styles.footerSubtitle}>
                  <Users size={14} />
                  Join {courseDetails.enrollmentCount || courseDetails.enrollment_count || 'thousands of'} students already enrolled
                </div>
              </div>
              <button
                onClick={() => onEnroll(course)}
                disabled={isEnrolled || isEnrolling}
                style={{
                  ...styles.enrollButton,
                  ...(isEnrolled ? styles.enrolledButton : {}),
                  ...(isEnrolling ? styles.enrollingButton : {})
                }}
                className="enroll-button"
              >
                <span style={styles.buttonGlow} className="button-glow" />
                {isEnrolled ? (
                  <>
                    <CheckCircle size={18} />
                    Enrolled
                  </>
                ) : isEnrolling ? (
                  <>
                    <div style={styles.spinner} />
                    Enrolling...
                  </>
                ) : (
                  <>
                    <PlayCircle size={18} />
                    Enroll Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Helper functions
const generateMockModules = (course) => {
  const moduleCount = course.moduleCount || course.total_modules || 8;
  return Array.from({ length: moduleCount }, (_, i) => ({
    title: `Week ${i + 1}: ${getModuleTitle(i, course)}`,
    description: `Learn essential concepts and techniques in week ${i + 1}`,
    estimated_duration_minutes: 60,
    lessons: generateMockLessons(i)
  }));
};

const generateMockLessons = (moduleIndex) => {
  return [
    { title: 'Introduction and Overview', lesson_type: 'video', estimated_duration_minutes: 15 },
    { title: 'Core Concepts', lesson_type: 'text', estimated_duration_minutes: 20 },
    { title: 'Hands-on Practice', lesson_type: 'coding', estimated_duration_minutes: 25 }
  ];
};

const getModuleTitle = (index, course) => {
  const titles = [
    'Introduction',
    'Fundamentals',
    'Core Concepts',
    'Intermediate Topics',
    'Advanced Techniques',
    'Practical Applications',
    'Real-world Projects',
    'Final Project'
  ];
  return titles[index] || `Module ${index + 1}`;
};

const getWhatYouLearn = (course, modules) => {
  if (course.learningObjectives) {
    return course.learningObjectives;
  }

  // Use first 4 module titles as learning objectives
  const objectives = modules.slice(0, 4).map(module => module.title);
  
  // Fill with defaults if not enough modules
  while (objectives.length < 4) {
    const defaults = [
      'Master the fundamentals and core concepts',
      'Build real-world projects from scratch',
      'Understand best practices and design patterns',
      'Gain hands-on practical experience'
    ];
    objectives.push(defaults[objectives.length]);
  }

  return objectives;
};

export default CourseDetailsModal;