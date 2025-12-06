// frontend/src/pages/CourseLearn.js - Gamified Dark Theme
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, PlayCircle, CheckCircle, Lock, BookOpen, 
  Clock, ChevronRight, ChevronDown, Code, FileText, Video,
  Award, Target, BookMarked, Layers, Sparkles, TrendingUp,
  Zap, Shield, Radio, Trophy, Star, Copy, ExternalLink
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const CourseLearn = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [expandedModules, setExpandedModules] = useState({});
  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState(null);
  const [lessonProgress, setLessonProgress] = useState({});
  const [allLessons, setAllLessons] = useState([]);
  const [showOutline, setShowOutline] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchCourseDetails();
  }, [courseId]);

  useEffect(() => {
    if (selectedLesson && enrollment) {
      markLessonAsStarted(selectedLesson.id);
      setShowOutline(false);
    }
  }, [selectedLesson]);

  const fetchCourseDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/courses/${courseId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setCourse(data.course);
        
        const lessons = [];
        data.course.course_modules?.forEach(module => {
          module.course_lessons?.forEach(lesson => {
            lessons.push({ ...lesson, moduleId: module.id });
          });
        });
        setAllLessons(lessons);
        
        if (data.course.course_modules && data.course.course_modules.length > 0) {
          const firstModule = data.course.course_modules[0];
          setExpandedModules({ [firstModule.id]: true });
        }
      }

      const progressResponse = await fetch(`${API_URL}/courses/${courseId}/progress`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const progressData = await progressResponse.json();
      
      if (progressData.success) {
        setEnrollment(progressData.enrollment);
        
        const progressMap = {};
        progressData.lessons?.forEach(lesson => {
          if (lesson.user_lesson_progress && lesson.user_lesson_progress.length > 0) {
            progressMap[lesson.id] = lesson.user_lesson_progress[0];
          }
        });
        setLessonProgress(progressMap);
      }
    } catch (error) {
      console.error('Error fetching course:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = () => {
    if (!allLessons.length) return 0;
    const completedCount = allLessons.filter(lesson => 
      lessonProgress[lesson.id]?.status === 'completed'
    ).length;
    return Math.round((completedCount / allLessons.length) * 100);
  };

  const markLessonAsStarted = async (lessonId) => {
    if (lessonProgress[lessonId]?.status === 'completed') return;
    if (lessonProgress[lessonId]?.status === 'in_progress') return;

    try {
      await fetch(`${API_URL}/courses/lessons/${lessonId}/progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          status: 'in_progress',
          enrollmentId: enrollment.id
        })
      });

      setLessonProgress(prev => ({
        ...prev,
        [lessonId]: { status: 'in_progress' }
      }));
    } catch (error) {
      console.error('Error updating lesson progress:', error);
    }
  };

  const updateEnrollmentProgress = async (updatedProgress) => {
    const completedCount = Object.values(updatedProgress).filter(
      p => p?.status === 'completed'
    ).length;
    const progressPercentage = Math.round((completedCount / allLessons.length) * 100);

    try {
      await fetch(`${API_URL}/courses/${courseId}/enrollment/progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          progress_percentage: progressPercentage
        })
      });
    } catch (error) {
      console.error('Error updating enrollment progress:', error);
    }
  };

  const markLessonAsCompleted = async () => {
    if (!selectedLesson) return;

    try {
      const response = await fetch(`${API_URL}/courses/lessons/${selectedLesson.id}/progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          status: 'completed',
          enrollmentId: enrollment.id
        })
      });

      const data = await response.json();
      
      if (data.success) {
        const updatedProgress = {
          ...lessonProgress,
          [selectedLesson.id]: { status: 'completed', completed_at: new Date().toISOString() }
        };
        
        setLessonProgress(updatedProgress);
        await updateEnrollmentProgress(updatedProgress);
        navigateToNextLesson();
      }
    } catch (error) {
      console.error('Error marking lesson as completed:', error);
    }
  };

  const navigateToNextLesson = () => {
    const currentIndex = allLessons.findIndex(l => l.id === selectedLesson?.id);
    if (currentIndex !== -1 && currentIndex < allLessons.length - 1) {
      const nextLesson = allLessons[currentIndex + 1];
      setSelectedLesson(nextLesson);
      
      setExpandedModules(prev => ({
        ...prev,
        [nextLesson.moduleId]: true
      }));
    }
  };

  const navigateToPreviousLesson = () => {
    const currentIndex = allLessons.findIndex(l => l.id === selectedLesson?.id);
    if (currentIndex > 0) {
      const prevLesson = allLessons[currentIndex - 1];
      setSelectedLesson(prevLesson);
      
      setExpandedModules(prev => ({
        ...prev,
        [prevLesson.moduleId]: true
      }));
    }
  };

  const toggleModule = (moduleId) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const getLessonIcon = (lesson) => {
    const progress = lessonProgress[lesson.id];
    
    if (progress?.status === 'completed') {
      return <CheckCircle size={16} style={{ color: '#10b981' }} />;
    } else if (progress?.status === 'in_progress') {
      return <PlayCircle size={16} style={{ color: '#3b82f6' }} />;
    } else {
      switch(lesson.lesson_type) {
        case 'video':
          return <Video size={16} style={{ color: '#64748b' }} />;
        case 'coding':
        case 'project':
          return <Code size={16} style={{ color: '#64748b' }} />;
        default:
          return <FileText size={16} style={{ color: '#64748b' }} />;
      }
    }
  };

  const getLessonTypeColor = (type) => {
    switch(type) {
      case 'video': return { bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.3)', color: '#a78bfa' };
      case 'coding': return { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)', color: '#60a5fa' };
      case 'project': return { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', color: '#fbbf24' };
      default: return { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', color: '#34d399' };
    }
  };

  const isFirstLesson = () => {
    return allLessons.findIndex(l => l.id === selectedLesson?.id) === 0;
  };

  const isLastLesson = () => {
    return allLessons.findIndex(l => l.id === selectedLesson?.id) === allLessons.length - 1;
  };

  const getYouTubeVideoId = (url) => {
    if (!url) return null;
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Keyframes for animations
  const keyframes = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
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
    
    @keyframes progressGlow {
      0%, 100% { box-shadow: 0 0 10px rgba(139, 92, 246, 0.3); }
      50% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.6); }
    }
    
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    
    .hexagon-badge { animation: hexPulse 3s ease-in-out infinite; }
    .main-card { animation: borderGlow 4s ease-in-out infinite; }
    .scan-line { animation: scanLine 3s ease-in-out infinite; }
    .button-glow { animation: shimmer 2s ease-in-out infinite; }
    .radar-ring { animation: radarPulse 2s ease-out infinite; }
    .radar-ring-delayed { animation: radarPulse 2s ease-out infinite; animation-delay: 1s; }
    .pulse-dot { animation: pulseDot 1s ease-in-out infinite; }
    .progress-glow { animation: progressGlow 2s ease-in-out infinite; }
    .float-animation { animation: float 3s ease-in-out infinite; }
    
    .module-button:hover {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.1)) !important;
      border-color: rgba(59, 130, 246, 0.3) !important;
    }
    
    .lesson-button:hover {
      background: rgba(59, 130, 246, 0.1) !important;
      border-color: rgba(59, 130, 246, 0.3) !important;
    }
    
    .nav-button:hover:not(:disabled) {
      transform: translateY(-2px) !important;
      box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4) !important;
    }
    
    .cta-button:hover {
      transform: translateY(-3px) scale(1.02) !important;
      box-shadow: 0 12px 35px rgba(139, 92, 246, 0.5) !important;
    }
  `;

  const styles = {
    pageContainer: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: '#0f1116',
      color: '#fff',
      position: 'relative'
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
      zIndex: 0
    },
    cornerAccent: {
      position: 'fixed',
      width: '80px',
      height: '80px',
      pointerEvents: 'none',
      zIndex: 1
    },
    topNav: {
      height: '70px',
      background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.9) 100%)',
      borderBottom: '1px solid rgba(59, 130, 246, 0.15)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 1.5rem',
      justifyContent: 'space-between',
      position: 'relative',
      zIndex: 20,
      backdropFilter: 'blur(12px)'
    },
    backButton: {
      padding: '10px 16px',
      background: 'rgba(255, 255, 255, 0.05)',
      color: '#94a3b8',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'all 0.3s ease'
    },
    navTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    hexBadgeSmall: {
      position: 'relative',
      width: '40px',
      height: '46px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    sidebar: {
      width: '320px',
      background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(7, 11, 20, 0.98) 100%)',
      borderRight: '1px solid rgba(59, 130, 246, 0.15)',
      overflow: 'auto',
      position: 'relative',
      zIndex: 10
    },
    sidebarHeader: {
      padding: '1.25rem',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      background: 'rgba(59, 130, 246, 0.05)'
    },
    moduleButton: {
      width: '100%',
      padding: '14px 16px',
      background: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '12px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      textAlign: 'left',
      marginBottom: '8px',
      transition: 'all 0.3s ease'
    },
    lessonButton: {
      width: '100%',
      padding: '12px 14px',
      background: 'transparent',
      border: '1px solid transparent',
      borderRadius: '10px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      textAlign: 'left',
      marginBottom: '4px',
      transition: 'all 0.3s ease'
    },
    mainContent: {
      flex: 1,
      overflow: 'auto',
      position: 'relative',
      zIndex: 5
    },
    outlineContainer: {
      padding: '2.5rem',
      maxWidth: '950px',
      margin: '0 auto'
    },
    heroSection: {
      textAlign: 'center',
      marginBottom: '3rem',
      position: 'relative'
    },
    statusBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(168, 85, 247, 0.1))',
      border: '1px solid rgba(139, 92, 246, 0.3)',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '700',
      color: '#a78bfa',
      textTransform: 'uppercase',
      letterSpacing: '1.5px',
      marginBottom: '1.5rem'
    },
    courseTitle: {
      fontSize: '2.75rem',
      fontWeight: '800',
      marginBottom: '1rem',
      lineHeight: '1.2',
      background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text'
    },
    courseDescription: {
      fontSize: '1.125rem',
      color: '#64748b',
      maxWidth: '700px',
      margin: '0 auto 2rem',
      lineHeight: '1.7'
    },
    statsRow: {
      display: 'flex',
      justifyContent: 'center',
      gap: '2rem',
      flexWrap: 'wrap'
    },
    statItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 18px',
      background: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '12px'
    },
    progressCard: {
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(7, 11, 20, 0.95) 100%)',
      border: '2px solid rgba(139, 92, 246, 0.4)',
      borderRadius: '20px',
      padding: '2rem',
      marginBottom: '2.5rem',
      position: 'relative',
      overflow: 'hidden'
    },
    sectionCard: {
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(7, 11, 20, 0.9) 100%)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '20px',
      padding: '2rem',
      marginBottom: '2rem',
      position: 'relative'
    },
    sectionTitle: {
      fontSize: '1.5rem',
      fontWeight: '700',
      color: '#fff',
      marginBottom: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    ctaCard: {
      textAlign: 'center',
      padding: '2.5rem',
      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(168, 85, 247, 0.05) 100%)',
      border: '2px solid rgba(139, 92, 246, 0.3)',
      borderRadius: '20px'
    },
    ctaButton: {
      padding: '16px 40px',
      background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      color: '#fff',
      border: 'none',
      borderRadius: '14px',
      fontSize: '1.125rem',
      fontWeight: '700',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '12px',
      boxShadow: '0 8px 30px rgba(139, 92, 246, 0.4)',
      transition: 'all 0.3s ease',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    lessonContainer: {
      padding: '2.5rem',
      maxWidth: '950px',
      margin: '0 auto'
    },
    lessonHeader: {
      marginBottom: '2rem',
      paddingBottom: '1.5rem',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
    },
    lessonTypeBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 14px',
      borderRadius: '8px',
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      marginBottom: '1rem'
    },
    lessonTitle: {
      fontSize: '2.25rem',
      fontWeight: '800',
      marginBottom: '0.75rem',
      color: '#fff'
    },
    contentCard: {
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(7, 11, 20, 0.95) 100%)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '16px',
      padding: '2rem',
      marginBottom: '1.5rem'
    },
    codeBlock: {
      background: '#080a0f',
      padding: '1.5rem',
      borderRadius: '12px',
      overflow: 'auto',
      fontSize: '14px',
      lineHeight: '1.7',
      border: '1px solid rgba(59, 130, 246, 0.2)',
      fontFamily: '"Fira Code", "Consolas", monospace'
    },
    navigationButtons: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: '2.5rem',
      paddingTop: '2rem',
      borderTop: '1px solid rgba(255, 255, 255, 0.08)'
    },
    navButton: {
      padding: '14px 28px',
      borderRadius: '12px',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      transition: 'all 0.3s ease',
      border: 'none'
    }
  };

  const renderLessonContent = () => {
    if (!selectedLesson) return null;

    const { lesson_type, video_url, content, code_template } = selectedLesson;
    const typeStyle = getLessonTypeColor(lesson_type);

    // VIDEO LESSON
    if (lesson_type === 'video' && video_url) {
      const videoId = getYouTubeVideoId(video_url);
      
      return (
        <>
          {videoId && (
            <div style={{
              position: 'relative',
              paddingBottom: '56.25%',
              height: 0,
              overflow: 'hidden',
              marginBottom: '2rem',
              borderRadius: '16px',
              border: '2px solid rgba(139, 92, 246, 0.3)',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)'
            }}>
              <iframe
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  borderRadius: '14px'
                }}
                src={`https://www.youtube.com/embed/${videoId}`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={selectedLesson.title}
              />
            </div>
          )}
          
          {content && (
            <div style={styles.contentCard}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                marginBottom: '1rem',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <FileText size={20} color="#8b5cf6" />
                Lesson Notes
              </h3>
              <div style={{ 
                whiteSpace: 'pre-wrap', 
                color: '#94a3b8', 
                lineHeight: '1.8',
                fontSize: '15px'
              }}>
                {content}
              </div>
            </div>
          )}
        </>
      );
    }

    // CODING/PROJECT LESSON
    if ((lesson_type === 'coding' || lesson_type === 'project') && code_template) {
      return (
        <>
          {content && (
            <div style={styles.contentCard}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                marginBottom: '1rem',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Target size={20} color="#3b82f6" />
                Instructions
              </h3>
              <div style={{ 
                whiteSpace: 'pre-wrap', 
                color: '#94a3b8', 
                lineHeight: '1.8',
                fontSize: '15px'
              }}>
                {content}
              </div>
            </div>
          )}

          <div style={styles.contentCard}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Code size={20} color="#3b82f6" />
                Code Template
              </h3>
              <button
                onClick={() => handleCopyCode(code_template)}
                style={{
                  padding: '10px 18px',
                  background: copiedCode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                  color: copiedCode ? '#10b981' : '#3b82f6',
                  border: `1px solid ${copiedCode ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s ease'
                }}
              >
                {copiedCode ? <CheckCircle size={16} /> : <Copy size={16} />}
                {copiedCode ? 'Copied!' : 'Copy Code'}
              </button>
            </div>
            <pre style={styles.codeBlock}>
              <code style={{ color: '#e2e8f0' }}>
                {code_template}
              </code>
            </pre>
            <div style={{
              marginTop: '1rem',
              padding: '1rem 1.25rem',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.05))',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '12px',
              color: '#60a5fa',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <Zap size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>
                <strong>Pro Tip:</strong> Copy this code to your local editor and complete the TODOs to finish the exercise!
              </span>
            </div>
          </div>
        </>
      );
    }

    // TEXT LESSON (default)
    return (
      <div style={styles.contentCard}>
        {content ? (
          <div style={{ 
            lineHeight: '1.9', 
            color: '#94a3b8',
            fontSize: '15px'
          }}>
            {content.split('\n').map((line, index) => {
              if (line.startsWith('# ')) {
                return (
                  <h2 key={index} style={{ 
                    fontSize: '1.75rem', 
                    fontWeight: 'bold', 
                    marginTop: '2rem',
                    marginBottom: '1rem',
                    color: '#fff'
                  }}>
                    {line.substring(2)}
                  </h2>
                );
              }
              if (line.startsWith('## ')) {
                return (
                  <h3 key={index} style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: '600', 
                    marginTop: '1.5rem',
                    marginBottom: '0.75rem',
                    color: '#fff'
                  }}>
                    {line.substring(3)}
                  </h3>
                );
              }
              if (line.startsWith('```')) {
                return null;
              }
              if (line.trim() === '') {
                return <br key={index} />;
              }
              return <p key={index} style={{ marginBottom: '0.5rem' }}>{line}</p>;
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <BookOpen size={48} color="#64748b" style={{ marginBottom: '1rem' }} />
            <p style={{ color: '#64748b', fontSize: '1rem' }}>
              Lesson content coming soon...
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderCourseOutline = () => {
    if (!course) return null;

    const totalLessons = allLessons.length;
    const completedLessons = allLessons.filter(lesson => 
      lessonProgress[lesson.id]?.status === 'completed'
    ).length;
    const progress = calculateProgress();

    return (
      <div style={styles.outlineContainer}>
        {/* Hero Section */}
        <div style={styles.heroSection}>
          {/* Hexagon Badge */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{
              position: 'relative',
              width: '90px',
              height: '104px',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }} className="hexagon-badge float-animation">
              <svg style={{ position: 'absolute', width: '100%', height: '100%' }} viewBox="0 0 90 104">
                <defs>
                  <linearGradient id="courseHexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8"/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.8"/>
                  </linearGradient>
                </defs>
                <polygon 
                  points="45,2 87,26 87,78 45,102 3,78 3,26" 
                  fill="rgba(15, 23, 42, 0.9)"
                  stroke="url(#courseHexGrad)"
                  strokeWidth="2"
                />
              </svg>
              <div style={{ position: 'relative', zIndex: 2, fontSize: '2.5rem' }}>
                {course.icon_emoji || '📚'}
              </div>
            </div>
          </div>

          <div style={styles.statusBadge}>
            <Radio size={14} className="pulse-dot" />
            COURSE OVERVIEW
          </div>
          
          <h1 style={styles.courseTitle}>
            {course.title}
          </h1>
          
          <p style={styles.courseDescription}>
            {course.description}
          </p>

          {/* Course Stats */}
          <div style={styles.statsRow}>
            <div style={styles.statItem}>
              <Layers size={18} color="#3b82f6" />
              <span style={{ fontWeight: '600', color: '#3b82f6' }}>{course.total_modules} Modules</span>
            </div>
            <div style={styles.statItem}>
              <BookOpen size={18} color="#10b981" />
              <span style={{ fontWeight: '600', color: '#10b981' }}>{totalLessons} Lessons</span>
            </div>
            <div style={styles.statItem}>
              <Clock size={18} color="#f59e0b" />
              <span style={{ fontWeight: '600', color: '#f59e0b' }}>{course.estimated_duration_hours}h</span>
            </div>
            <div style={styles.statItem}>
              <Award size={18} color="#8b5cf6" />
              <span style={{ fontWeight: '600', color: '#8b5cf6' }}>{course.level}</span>
            </div>
          </div>
        </div>

        {/* Progress Card */}
        {enrollment && (
          <div style={styles.progressCard} className="main-card">
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '2px',
              background: 'linear-gradient(90deg, transparent, #8b5cf6, transparent)',
              overflow: 'hidden'
            }}>
              <div className="scan-line" style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, #fff, transparent)'
              }} />
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <TrendingUp size={24} color="#8b5cf6" />
                Your Progress
              </h3>
              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '4px'
              }}>
                <span style={{
                  fontSize: '3rem',
                  fontWeight: '800',
                  color: '#8b5cf6',
                  fontFamily: 'monospace',
                  lineHeight: 1
                }}>
                  {progress}
                </span>
                <span style={{ fontSize: '1.5rem', color: '#8b5cf6', fontWeight: '600' }}>%</span>
              </div>
            </div>
            
            <div style={{
              width: '100%',
              height: '14px',
              background: 'rgba(15, 23, 42, 0.8)',
              borderRadius: '7px',
              overflow: 'hidden',
              marginBottom: '1rem',
              border: '1px solid rgba(139, 92, 246, 0.2)'
            }}>
              <div 
                className="progress-glow"
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #8b5cf6, #a855f7)',
                  borderRadius: '7px',
                  transition: 'width 0.5s ease'
                }} 
              />
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              color: '#64748b',
              fontSize: '14px'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={16} color="#10b981" />
                {completedLessons} of {totalLessons} completed
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Target size={16} color="#f59e0b" />
                {totalLessons - completedLessons} remaining
              </span>
            </div>
          </div>
        )}

        {/* What You'll Learn */}
        <div style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Target size={20} color="#3b82f6" />
            </div>
            What You'll Learn
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '12px'
          }}>
            {course.course_modules?.slice(0, 6).map((module, idx) => (
              <div key={module.id} style={{
                padding: '1rem 1.25rem',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.3s ease'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <CheckCircle size={16} color="#10b981" />
                </div>
                <span style={{
                  color: '#e2e8f0',
                  fontSize: '14px',
                  fontWeight: '500',
                  lineHeight: '1.4'
                }}>
                  {module.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Course Curriculum */}
        <div style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <BookMarked size={20} color="#f59e0b" />
            </div>
            Course Curriculum
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {course.course_modules?.map((module, moduleIndex) => {
              const moduleLessons = module.course_lessons || [];
              const completedInModule = moduleLessons.filter(lesson => 
                lessonProgress[lesson.id]?.status === 'completed'
              ).length;

              return (
                <div key={module.id} style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                  <button
                    onClick={() => toggleModule(module.id)}
                    className="module-button"
                    style={{
                      width: '100%',
                      padding: '1.25rem',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        marginBottom: '8px'
                      }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '36px',
                          height: '36px',
                          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.15))',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          color: '#60a5fa',
                          borderRadius: '10px',
                          fontSize: '14px',
                          fontWeight: '700',
                          fontFamily: 'monospace'
                        }}>
                          {String(moduleIndex + 1).padStart(2, '0')}
                        </span>
                        <h4 style={{
                          fontSize: '1.1rem',
                          fontWeight: '600',
                          color: '#fff',
                          margin: 0
                        }}>
                          {module.title}
                        </h4>
                      </div>
                      {module.description && (
                        <p style={{
                          color: '#64748b',
                          fontSize: '14px',
                          margin: '0 0 0 50px',
                          lineHeight: '1.5'
                        }}>
                          {module.description}
                        </p>
                      )}
                      <div style={{
                        display: 'flex',
                        gap: '20px',
                        marginTop: '10px',
                        marginLeft: '50px',
                        fontSize: '13px',
                        color: '#64748b'
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <BookOpen size={14} />
                          {moduleLessons.length} lessons
                        </span>
                        {module.estimated_duration_minutes && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Clock size={14} />
                            {module.estimated_duration_minutes} min
                          </span>
                        )}
                        {completedInModule > 0 && (
                          <span style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px',
                            color: '#10b981'
                          }}>
                            <CheckCircle size={14} />
                            {completedInModule}/{moduleLessons.length}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s ease',
                      transform: expandedModules[module.id] ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}>
                      <ChevronDown size={18} color="#64748b" />
                    </div>
                  </button>

                  {expandedModules[module.id] && moduleLessons.length > 0 && (
                    <div style={{
                      padding: '0 1.25rem 1.25rem 1.25rem',
                      borderTop: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                      {moduleLessons.map((lesson, lessonIndex) => {
                        const progress = lessonProgress[lesson.id];
                        const isCompleted = progress?.status === 'completed';
                        const isInProgress = progress?.status === 'in_progress';
                        const typeStyle = getLessonTypeColor(lesson.lesson_type);

                        return (
                          <div key={lesson.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px',
                            padding: '14px',
                            marginTop: '8px',
                            background: isCompleted ? 'rgba(16, 185, 129, 0.08)' : 
                                       isInProgress ? 'rgba(59, 130, 246, 0.08)' : 
                                       'rgba(255, 255, 255, 0.02)',
                            borderRadius: '12px',
                            border: `1px solid ${isCompleted ? 'rgba(16, 185, 129, 0.2)' : 
                                                 isInProgress ? 'rgba(59, 130, 246, 0.2)' : 
                                                 'rgba(255, 255, 255, 0.05)'}`
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '28px',
                              height: '28px',
                              borderRadius: '8px',
                              background: isCompleted ? 'rgba(16, 185, 129, 0.15)' :
                                         isInProgress ? 'rgba(59, 130, 246, 0.15)' :
                                         'rgba(255, 255, 255, 0.05)',
                              flexShrink: 0
                            }}>
                              {getLessonIcon(lesson)}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{
                                color: '#e2e8f0',
                                fontSize: '14px',
                                fontWeight: '500',
                                marginBottom: '4px'
                              }}>
                                {lessonIndex + 1}. {lesson.title}
                              </div>
                              <div style={{
                                display: 'flex',
                                gap: '12px',
                                fontSize: '12px',
                                color: '#64748b'
                              }}>
                                <span style={{
                                  padding: '2px 8px',
                                  background: typeStyle.bg,
                                  border: `1px solid ${typeStyle.border}`,
                                  borderRadius: '6px',
                                  color: typeStyle.color,
                                  textTransform: 'capitalize',
                                  fontWeight: '500'
                                }}>
                                  {lesson.lesson_type || 'text'}
                                </span>
                                {lesson.estimated_duration_minutes && (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Clock size={12} />
                                    {lesson.estimated_duration_minutes} min
                                  </span>
                                )}
                              </div>
                            </div>
                            {isCompleted && (
                              <div style={{
                                padding: '4px 10px',
                                background: 'rgba(16, 185, 129, 0.15)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                borderRadius: '8px',
                                color: '#10b981',
                                fontSize: '11px',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <CheckCircle size={12} />
                                Done
                              </div>
                            )}
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

        {/* Start Learning CTA */}
        <div style={styles.ctaCard}>
          <div style={{ marginBottom: '1.5rem' }}>
            <Trophy size={48} color="#8b5cf6" style={{ marginBottom: '1rem' }} className="float-animation" />
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#fff',
              marginBottom: '0.5rem'
            }}>
              {completedLessons > 0 ? 'Continue Your Journey' : 'Ready to Begin?'}
            </h3>
            <p style={{ color: '#64748b', fontSize: '15px' }}>
              {completedLessons > 0 
                ? `You've completed ${completedLessons} lessons. Keep up the momentum!`
                : 'Start your learning journey and unlock new skills!'}
            </p>
          </div>
          <button
            onClick={() => {
              if (allLessons.length > 0) {
                // Find first incomplete lesson or start from beginning
                const nextLesson = allLessons.find(l => 
                  lessonProgress[l.id]?.status !== 'completed'
                ) || allLessons[0];
                setSelectedLesson(nextLesson);
                setShowOutline(false);
              }
            }}
            style={styles.ctaButton}
            className="cta-button"
          >
            <PlayCircle size={22} />
            {completedLessons > 0 ? 'Continue Learning' : 'Start Learning'}
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    );
  };

  // Loading State
  if (loading) {
    return (
      <div style={{
        ...styles.pageContainer,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <style>{keyframes}</style>
        <div style={styles.gridOverlay} />
        
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 10 }}>
          <div style={{
            position: 'relative',
            width: '100px',
            height: '100px',
            margin: '0 auto 24px'
          }}>
            <div className="radar-ring" style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: '2px solid rgba(59, 130, 246, 0.3)'
            }} />
            <div className="radar-ring-delayed" style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: '2px solid rgba(59, 130, 246, 0.3)'
            }} />
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '50px',
              height: '50px',
              background: 'rgba(15, 23, 42, 0.9)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid rgba(59, 130, 246, 0.5)'
            }}>
              <BookOpen size={24} color="#3b82f6" />
            </div>
          </div>
          
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '20px',
            marginBottom: '16px'
          }}>
            <div className="pulse-dot" style={{
              width: '8px',
              height: '8px',
              background: '#3b82f6',
              borderRadius: '50%'
            }} />
            <span style={{ 
              color: '#3b82f6', 
              fontSize: '12px', 
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '2px'
            }}>
              Loading
            </span>
          </div>
          
          <h2 style={{ 
            fontSize: '1.5rem', 
            fontWeight: '700', 
            color: '#fff',
            marginBottom: '8px'
          }}>
            Preparing Course
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            Loading your learning materials...
          </p>
        </div>
      </div>
    );
  }

  // Course Not Found
  if (!course) {
    return (
      <div style={{
        ...styles.pageContainer,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <style>{keyframes}</style>
        <div style={styles.gridOverlay} />
        
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 10 }}>
          <Shield size={64} color="#64748b" style={{ marginBottom: '1.5rem' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff', marginBottom: '1rem' }}>
            Course Not Found
          </h2>
          <p style={{ color: '#64748b', marginBottom: '2rem' }}>
            The course you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => navigate('/learns')}
            style={{
              ...styles.ctaButton,
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)'
            }}
          >
            <ArrowLeft size={20} />
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.pageContainer}>
      <style>{keyframes}</style>
      
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

      {/* Top Navigation Bar */}
      <div style={styles.topNav}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/learns')}
            style={styles.backButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
              e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
              e.currentTarget.style.color = '#3b82f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#94a3b8';
            }}
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
          
          <div style={styles.navTitle}>
            <div style={styles.hexBadgeSmall} className="hexagon-badge">
              <svg style={{ position: 'absolute', width: '100%', height: '100%' }} viewBox="0 0 40 46">
                <polygon 
                  points="20,1 38,12 38,34 20,45 2,34 2,12" 
                  fill="rgba(15, 23, 42, 0.9)"
                  stroke="rgba(59, 130, 246, 0.5)"
                  strokeWidth="1.5"
                />
              </svg>
              <span style={{ position: 'relative', zIndex: 2, fontSize: '1.2rem' }}>
                {course.icon_emoji || '📚'}
              </span>
            </div>
            <div>
              <h2 style={{
                fontSize: '1.1rem',
                fontWeight: '700',
                margin: 0,
                color: '#fff'
              }}>
                {course.title}
              </h2>
              <p style={{
                fontSize: '13px',
                color: '#64748b',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>{course.level}</span>
                <span>•</span>
                <span>{course.total_lessons} Lessons</span>
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setShowOutline(!showOutline)}
            style={{
              padding: '10px 18px',
              background: showOutline 
                ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(168, 85, 247, 0.15))' 
                : 'rgba(255, 255, 255, 0.05)',
              color: showOutline ? '#a78bfa' : '#94a3b8',
              border: `1px solid ${showOutline ? 'rgba(139, 92, 246, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}
          >
            <BookMarked size={16} />
            {showOutline ? 'Hide Outline' : 'Show Outline'}
          </button>

          {enrollment && (
            <div style={{
              padding: '10px 18px',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(168, 85, 247, 0.1))',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <div style={{
                width: '32px',
                height: '6px',
                background: 'rgba(15, 23, 42, 0.8)',
                borderRadius: '3px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${calculateProgress()}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #8b5cf6, #a855f7)',
                  borderRadius: '3px'
                }} />
              </div>
              <span style={{
                fontSize: '14px',
                fontWeight: '700',
                color: '#a78bfa',
                fontFamily: 'monospace'
              }}>
                {calculateProgress()}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden'
      }}>
        {/* Sidebar */}
        <div style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: '700',
              color: '#fff',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              <Layers size={16} color="#3b82f6" />
              Course Content
            </h3>
          </div>

          <div style={{ padding: '1rem' }}>
            {course.course_modules?.map((module, moduleIndex) => (
              <div key={module.id} style={{ marginBottom: '8px' }}>
                <button
                  onClick={() => toggleModule(module.id)}
                  className="module-button"
                  style={{
                    ...styles.moduleButton,
                    background: expandedModules[module.id] 
                      ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.05))'
                      : 'rgba(255, 255, 255, 0.03)',
                    borderColor: expandedModules[module.id] 
                      ? 'rgba(59, 130, 246, 0.2)'
                      : 'rgba(255, 255, 255, 0.08)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px',
                      background: 'rgba(59, 130, 246, 0.15)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      color: '#60a5fa',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '700',
                      fontFamily: 'monospace'
                    }}>
                      {moduleIndex + 1}
                    </span>
                    <span style={{ 
                      fontWeight: '600', 
                      fontSize: '14px',
                      color: '#e2e8f0'
                    }}>
                      {module.title}
                    </span>
                  </div>
                  <ChevronDown 
                    size={16} 
                    color="#64748b"
                    style={{
                      transform: expandedModules[module.id] ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s ease'
                    }}
                  />
                </button>

                {expandedModules[module.id] && (
                  <div style={{ paddingLeft: '12px', marginTop: '4px' }}>
                    {module.course_lessons?.map((lesson, lessonIndex) => {
                      const isSelected = selectedLesson?.id === lesson.id;
                      const progress = lessonProgress[lesson.id];
                      const isCompleted = progress?.status === 'completed';
                      const isInProgress = progress?.status === 'in_progress';
                      
                      return (
                        <button
                          key={lesson.id}
                          onClick={() => setSelectedLesson({ ...lesson, moduleId: module.id })}
                          className="lesson-button"
                          style={{
                            ...styles.lessonButton,
                            background: isSelected 
                              ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.1))'
                              : isCompleted 
                                ? 'rgba(16, 185, 129, 0.08)'
                                : isInProgress
                                  ? 'rgba(59, 130, 246, 0.08)'
                                  : 'transparent',
                            border: isSelected 
                              ? '1px solid rgba(59, 130, 246, 0.4)'
                              : isCompleted
                                ? '1px solid rgba(16, 185, 129, 0.2)'
                                : '1px solid transparent',
                            color: isSelected ? '#60a5fa' : '#94a3b8'
                          }}
                        >
                          {getLessonIcon(lesson)}
                          <span style={{ 
                            flex: 1, 
                            fontSize: '13px',
                            fontWeight: isSelected ? '600' : '500'
                          }}>
                            {lessonIndex + 1}. {lesson.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div style={styles.mainContent}>
          {showOutline ? (
            renderCourseOutline()
          ) : selectedLesson ? (
            <div style={styles.lessonContainer}>
              {/* Lesson Header */}
              <div style={styles.lessonHeader}>
                {(() => {
                  const typeStyle = getLessonTypeColor(selectedLesson.lesson_type);
                  return (
                    <div style={{
                      ...styles.lessonTypeBadge,
                      background: typeStyle.bg,
                      border: `1px solid ${typeStyle.border}`,
                      color: typeStyle.color
                    }}>
                      {selectedLesson.lesson_type === 'video' && <Video size={14} />}
                      {selectedLesson.lesson_type === 'coding' && <Code size={14} />}
                      {selectedLesson.lesson_type === 'project' && <Zap size={14} />}
                      {!selectedLesson.lesson_type && <FileText size={14} />}
                      {selectedLesson.lesson_type || 'Text'}
                    </div>
                  );
                })()}
                
                <h2 style={styles.lessonTitle}>
                  {selectedLesson.title}
                </h2>
                
                {selectedLesson.description && (
                  <p style={{
                    color: '#64748b',
                    fontSize: '1rem',
                    marginBottom: '1rem',
                    lineHeight: '1.6'
                  }}>
                    {selectedLesson.description}
                  </p>
                )}
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  color: '#64748b',
                  fontSize: '14px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={16} />
                    {selectedLesson.estimated_duration_minutes || 10} minutes
                  </div>
                  {lessonProgress[selectedLesson.id]?.status === 'completed' && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: '#10b981',
                      padding: '4px 12px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '8px',
                      fontWeight: '600'
                    }}>
                      <CheckCircle size={14} />
                      Completed
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic Lesson Content */}
              {renderLessonContent()}

              {/* Lesson Navigation */}
              <div style={styles.navigationButtons}>
                <button
                  onClick={navigateToPreviousLesson}
                  disabled={isFirstLesson()}
                  className="nav-button"
                  style={{
                    ...styles.navButton,
                    background: isFirstLesson() ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.05)',
                    color: isFirstLesson() ? '#475569' : '#94a3b8',
                    border: `1px solid ${isFirstLesson() ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.1)'}`,
                    cursor: isFirstLesson() ? 'not-allowed' : 'pointer',
                    opacity: isFirstLesson() ? 0.5 : 1
                  }}
                >
                  <ArrowLeft size={18} />
                  Previous Lesson
                </button>
                
                <button
                  onClick={markLessonAsCompleted}
                  disabled={isLastLesson() && lessonProgress[selectedLesson.id]?.status === 'completed'}
                  className="nav-button"
                  style={{
                    ...styles.navButton,
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    color: '#fff',
                    boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)',
                    opacity: (isLastLesson() && lessonProgress[selectedLesson.id]?.status === 'completed') ? 0.5 : 1,
                    cursor: (isLastLesson() && lessonProgress[selectedLesson.id]?.status === 'completed') ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isLastLesson() ? (
                    <>
                      <Trophy size={18} />
                      Complete Course
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      Complete & Next
                      <ChevronRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              padding: '4rem 2rem',
              color: '#64748b'
            }}>
              <BookOpen size={64} style={{ marginBottom: '1.5rem', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#94a3b8', marginBottom: '0.5rem' }}>
                Select a Lesson
              </h3>
              <p style={{ fontSize: '14px' }}>
                Choose a lesson from the sidebar to begin learning
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseLearn;