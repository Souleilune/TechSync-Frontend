// frontend/src/pages/CourseLearn.js - Enhanced with Course Outline
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, PlayCircle, CheckCircle, Lock, BookOpen, 
  Clock, ChevronRight, ChevronDown, Code, FileText, Video,
  Award, Target, BookMarked, Layers, Sparkles, TrendingUp
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
  const [showOutline, setShowOutline] = useState(true); // NEW: Show outline by default

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchCourseDetails();
  }, [courseId]);

  useEffect(() => {
    if (selectedLesson && enrollment) {
      markLessonAsStarted(selectedLesson.id);
      setShowOutline(false); // Hide outline when lesson selected
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
        
        // Create flat array of all lessons for navigation
        const lessons = [];
        data.course.course_modules?.forEach(module => {
          module.course_lessons?.forEach(lesson => {
            lessons.push({ ...lesson, moduleId: module.id });
          });
        });
        setAllLessons(lessons);
        
        // Don't auto-select lesson - show outline first
        // Expand first module for preview
        if (data.course.course_modules && data.course.course_modules.length > 0) {
          const firstModule = data.course.course_modules[0];
          setExpandedModules({ [firstModule.id]: true });
        }
      }

      // Fetch enrollment/progress
      const progressResponse = await fetch(`${API_URL}/courses/${courseId}/progress`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const progressData = await progressResponse.json();
      
      if (progressData.success) {
        setEnrollment(progressData.enrollment);
        
        // Build lesson progress map
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
      return <PlayCircle size={16} style={{ color: '#60a5fa' }} />;
    } else {
      // Icon based on lesson type
      switch(lesson.lesson_type) {
        case 'video':
          return <Video size={16} style={{ color: '#6b7280' }} />;
        case 'coding':
        case 'project':
          return <Code size={16} style={{ color: '#6b7280' }} />;
        default:
          return <FileText size={16} style={{ color: '#6b7280' }} />;
      }
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

  const renderLessonContent = () => {
    if (!selectedLesson) return null;

    const { lesson_type, video_url, content, code_template } = selectedLesson;

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
              borderRadius: '12px'
            }}>
              <iframe
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  borderRadius: '12px'
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
            <div style={{
              backgroundColor: '#1a1d24',
              borderRadius: '12px',
              padding: '2rem',
              lineHeight: '1.8',
              color: '#e5e7eb'
            }}>
              <h3 style={{ 
                fontSize: '1.25rem', 
                fontWeight: '600', 
                marginBottom: '1rem',
                color: '#fff'
              }}>
                Lesson Notes
              </h3>
              <div style={{ whiteSpace: 'pre-wrap' }}>
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
            <div style={{
              backgroundColor: '#1a1d24',
              borderRadius: '12px',
              padding: '2rem',
              marginBottom: '2rem',
              lineHeight: '1.8',
              color: '#e5e7eb'
            }}>
              <h3 style={{ 
                fontSize: '1.25rem', 
                fontWeight: '600', 
                marginBottom: '1rem',
                color: '#fff'
              }}>
                📝 Instructions
              </h3>
              <div style={{ whiteSpace: 'pre-wrap' }}>
                {content}
              </div>
            </div>
          )}

          <div style={{
            backgroundColor: '#1a1d24',
            borderRadius: '12px',
            padding: '2rem'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h3 style={{ 
                fontSize: '1.25rem', 
                fontWeight: '600',
                color: '#fff'
              }}>
                💻 Code Template
              </h3>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(code_template);
                  alert('Code copied to clipboard!');
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#2d3748',
                  color: '#60a5fa',
                  border: '1px solid #60a5fa',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                Copy Code
              </button>
            </div>
            <pre style={{
              backgroundColor: '#0d1117',
              padding: '1.5rem',
              borderRadius: '8px',
              overflow: 'auto',
              fontSize: '0.875rem',
              lineHeight: '1.6',
              border: '1px solid #2d3748'
            }}>
              <code style={{ color: '#e5e7eb' }}>
                {code_template}
              </code>
            </pre>
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#60a5fa15',
              border: '1px solid #60a5fa',
              borderRadius: '8px',
              color: '#60a5fa',
              fontSize: '0.875rem'
            }}>
              <strong>💡 Tip:</strong> Copy this code to your local editor and complete the TODOs to finish the exercise!
            </div>
          </div>
        </>
      );
    }

    // TEXT LESSON (default)
    return (
      <div style={{
        backgroundColor: '#1a1d24',
        borderRadius: '12px',
        padding: '2rem'
      }}>
        {content ? (
          <div style={{ 
            lineHeight: '1.8', 
            color: '#e5e7eb',
            whiteSpace: 'pre-wrap'
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
          <div>
            <p style={{ marginBottom: '1rem' }}>
              Lesson content will be available here. Stay tuned!
            </p>
            <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>
              Full lesson content coming soon.
            </p>
          </div>
        )}
      </div>
    );
  };

  // ✨ NEW: Render Course Outline
  const renderCourseOutline = () => {
    if (!course) return null;

    const totalLessons = allLessons.length;
    const completedLessons = allLessons.filter(lesson => 
      lessonProgress[lesson.id]?.status === 'completed'
    ).length;

    return (
      <div style={{
        padding: '2rem',
        maxWidth: '900px',
        margin: '0 auto'
      }}>
        {/* Hero Section */}
        <div style={{
          marginBottom: '3rem',
          textAlign: 'center'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#8b5cf620',
            color: '#8b5cf6',
            borderRadius: '20px',
            fontSize: '0.875rem',
            fontWeight: '600',
            marginBottom: '1rem'
          }}>
            <Sparkles size={16} />
            COURSE OVERVIEW
          </div>
          
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            color: '#fff',
            marginBottom: '1rem',
            lineHeight: '1.2'
          }}>
            {course.icon_emoji && <span style={{ marginRight: '0.5rem' }}>{course.icon_emoji}</span>}
            {course.title}
          </h1>
          
          <p style={{
            fontSize: '1.125rem',
            color: '#9ca3af',
            maxWidth: '700px',
            margin: '0 auto 2rem',
            lineHeight: '1.6'
          }}>
            {course.description}
          </p>

          {/* Course Stats */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '2rem',
            flexWrap: 'wrap'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#60a5fa'
            }}>
              <Layers size={20} />
              <span style={{ fontWeight: '600' }}>{course.total_modules} Modules</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#10b981'
            }}>
              <BookOpen size={20} />
              <span style={{ fontWeight: '600' }}>{totalLessons} Lessons</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#f59e0b'
            }}>
              <Clock size={20} />
              <span style={{ fontWeight: '600' }}>{course.estimated_duration_hours} Hours</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#8b5cf6'
            }}>
              <Award size={20} />
              <span style={{ fontWeight: '600' }}>{course.level}</span>
            </div>
          </div>
        </div>

        {/* Progress Card */}
        {enrollment && (
          <div style={{
            backgroundColor: '#1a1d24',
            border: '2px solid #8b5cf6',
            borderRadius: '16px',
            padding: '2rem',
            marginBottom: '3rem'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <TrendingUp size={24} color="#8b5cf6" />
                Your Progress
              </h3>
              <span style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                color: '#8b5cf6'
              }}>
                {calculateProgress()}%
              </span>
            </div>
            
            <div style={{
              width: '100%',
              height: '12px',
              backgroundColor: '#0f172a',
              borderRadius: '6px',
              overflow: 'hidden',
              marginBottom: '1rem'
            }}>
              <div style={{
                width: `${calculateProgress()}%`,
                height: '100%',
                backgroundColor: '#8b5cf6',
                borderRadius: '6px',
                transition: 'width 0.3s ease'
              }} />
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              color: '#9ca3af',
              fontSize: '0.875rem'
            }}>
              <span>{completedLessons} of {totalLessons} lessons completed</span>
              <span>{totalLessons - completedLessons} lessons remaining</span>
            </div>
          </div>
        )}

        {/* What You'll Learn */}
        <div style={{
          backgroundColor: '#1a1d24',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <h3 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#fff',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Target size={24} color="#60a5fa" />
            What You'll Learn
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem'
          }}>
            {course.course_modules?.slice(0, 4).map((module, idx) => (
              <div key={module.id} style={{
                padding: '1rem',
                backgroundColor: '#0f172a',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem'
              }}>
                <CheckCircle size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{
                  color: '#e5e7eb',
                  fontSize: '0.95rem',
                  lineHeight: '1.5'
                }}>
                  {module.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Course Curriculum */}
        <div style={{
          backgroundColor: '#1a1d24',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <h3 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#fff',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <BookMarked size={24} color="#f59e0b" />
            Course Curriculum
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {course.course_modules?.map((module, moduleIndex) => {
              const moduleLessons = module.course_lessons || [];
              const completedInModule = moduleLessons.filter(lesson => 
                lessonProgress[lesson.id]?.status === 'completed'
              ).length;

              return (
                <div key={module.id} style={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid #2d3748'
                }}>
                  <button
                    onClick={() => toggleModule(module.id)}
                    style={{
                      width: '100%',
                      padding: '1.25rem',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        marginBottom: '0.5rem'
                      }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          backgroundColor: '#60a5fa20',
                          color: '#60a5fa',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                          fontWeight: '700'
                        }}>
                          {moduleIndex + 1}
                        </span>
                        <h4 style={{
                          fontSize: '1.125rem',
                          fontWeight: '600',
                          color: '#fff',
                          margin: 0
                        }}>
                          {module.title}
                        </h4>
                      </div>
                      {module.description && (
                        <p style={{
                          color: '#9ca3af',
                          fontSize: '0.875rem',
                          margin: '0.5rem 0 0 0',
                          paddingLeft: '48px'
                        }}>
                          {module.description}
                        </p>
                      )}
                      <div style={{
                        display: 'flex',
                        gap: '1.5rem',
                        marginTop: '0.75rem',
                        paddingLeft: '48px',
                        fontSize: '0.875rem',
                        color: '#6b7280'
                      }}>
                        <span>{moduleLessons.length} lessons</span>
                        {module.estimated_duration_minutes && (
                          <span>{module.estimated_duration_minutes} min</span>
                        )}
                        {completedInModule > 0 && (
                          <span style={{ color: '#10b981' }}>
                            {completedInModule}/{moduleLessons.length} completed
                          </span>
                        )}
                      </div>
                    </div>
                    {expandedModules[module.id] ? (
                      <ChevronDown size={20} color="#9ca3af" />
                    ) : (
                      <ChevronRight size={20} color="#9ca3af" />
                    )}
                  </button>

                  {expandedModules[module.id] && moduleLessons.length > 0 && (
                    <div style={{
                      padding: '0 1.25rem 1.25rem 1.25rem',
                      borderTop: '1px solid #2d3748'
                    }}>
                      {moduleLessons.map((lesson, lessonIndex) => {
                        const progress = lessonProgress[lesson.id];
                        const isCompleted = progress?.status === 'completed';
                        const isInProgress = progress?.status === 'in_progress';

                        return (
                          <div key={lesson.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '0.75rem',
                            marginTop: '0.5rem',
                            backgroundColor: isCompleted ? '#10b98110' : isInProgress ? '#60a5fa10' : 'transparent',
                            borderRadius: '8px',
                            border: `1px solid ${isCompleted ? '#10b981' : isInProgress ? '#60a5fa' : 'transparent'}`
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '24px',
                              height: '24px',
                              flexShrink: 0
                            }}>
                              {getLessonIcon(lesson)}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{
                                color: '#e5e7eb',
                                fontSize: '0.9375rem',
                                fontWeight: '500'
                              }}>
                                {lessonIndex + 1}. {lesson.title}
                              </div>
                              <div style={{
                                display: 'flex',
                                gap: '1rem',
                                marginTop: '0.25rem',
                                fontSize: '0.8125rem',
                                color: '#6b7280'
                              }}>
                                <span style={{ textTransform: 'capitalize' }}>
                                  {lesson.lesson_type || 'text'}
                                </span>
                                {lesson.estimated_duration_minutes && (
                                  <span>{lesson.estimated_duration_minutes} min</span>
                                )}
                                {isCompleted && (
                                  <span style={{ color: '#10b981', fontWeight: '500' }}>
                                    ✓ Completed
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

        {/* Start Learning CTA */}
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          backgroundColor: '#8b5cf615',
          border: '2px solid #8b5cf6',
          borderRadius: '16px'
        }}>
          <button
            onClick={() => {
              if (allLessons.length > 0) {
                setSelectedLesson(allLessons[0]);
                setShowOutline(false);
              }
            }}
            style={{
              padding: '1rem 2.5rem',
              backgroundColor: '#8b5cf6',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1.125rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.75rem',
              boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)',
              transition: 'all 0.2s ease'
            }}
          >
            <PlayCircle size={24} />
            {completedLessons > 0 ? 'Continue Learning' : 'Start Learning'}
          </button>
          <p style={{
            marginTop: '1rem',
            color: '#9ca3af',
            fontSize: '0.875rem'
          }}>
            Ready to begin your journey? Let's get started!
          </p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        color: '#fff'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #2d3748',
            borderTop: '4px solid #60a5fa',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <p>Loading course...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        color: '#fff'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p>Course not found</p>
          <button
            onClick={() => navigate('/learns')}
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#60a5fa',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: '#fff'
    }}>
      {/* Top Navigation Bar */}
      <div style={{
        height: '70px',
        backgroundColor: '#1a1d24',
        borderBottom: '1px solid #2d3748',
        display: 'flex',
        alignItems: 'center',
        padding: '0 2rem',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => navigate('/learns')}
            style={{
              padding: '0.5rem',
              backgroundColor: '#2d3748',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              margin: 0
            }}>
              {course.title}
            </h2>
            <p style={{
              fontSize: '0.875rem',
              color: '#9ca3af',
              margin: 0
            }}>
              {course.level} • {course.total_lessons} Lessons
            </p>
          </div>
        </div>

        {/* ✨ NEW: Toggle Outline Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => setShowOutline(!showOutline)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: showOutline ? '#8b5cf6' : '#2d3748',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            <BookMarked size={16} />
            {showOutline ? 'Hide Outline' : 'Show Outline'}
          </button>

          {enrollment && (
            <div style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#2d3748',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: '600'
            }}>
              Progress: {calculateProgress()}%
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
        {/* Sidebar - Course Modules */}
        <div style={{
          width: '350px',
          backgroundColor: '#1a1d24',
          borderRight: '1px solid #2d3748',
          overflow: 'auto'
        }}>
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: '600',
              marginBottom: '1rem',
              color: '#fff'
            }}>
              Course Content
            </h3>

            {course.course_modules?.map((module, moduleIndex) => (
              <div key={module.id} style={{ marginBottom: '0.5rem' }}>
                <button
                  onClick={() => toggleModule(module.id)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: '#2d3748',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textAlign: 'left',
                    marginBottom: '0.5rem'
                  }}
                >
                  <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>
                    {moduleIndex + 1}. {module.title}
                  </span>
                  {expandedModules[module.id] ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </button>

                {expandedModules[module.id] && (
                  <div style={{ paddingLeft: '1rem' }}>
                    {module.course_lessons?.map((lesson, lessonIndex) => {
                      const isSelected = selectedLesson?.id === lesson.id;
                      const progress = lessonProgress[lesson.id];
                      
                      return (
                        <button
                          key={lesson.id}
                          onClick={() => setSelectedLesson({ ...lesson, moduleId: module.id })}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            backgroundColor: isSelected ? '#60a5fa15' : 'transparent',
                            color: isSelected ? '#60a5fa' : '#9ca3af',
                            border: isSelected ? '1px solid #60a5fa' : '1px solid transparent',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            textAlign: 'left',
                            marginBottom: '0.25rem',
                            fontSize: '0.8125rem'
                          }}
                        >
                          {getLessonIcon(lesson)}
                          <span style={{ flex: 1 }}>
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
        <div style={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: '#0f172a'
        }}>
          {/* ✨ NEW: Show Outline or Lesson Content */}
          {showOutline ? (
            renderCourseOutline()
          ) : selectedLesson ? (
            <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
              {/* Lesson Header */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{
                  display: 'inline-block',
                  padding: '0.25rem 0.75rem',
                  backgroundColor: '#60a5fa20',
                  color: '#60a5fa',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  marginBottom: '1rem',
                  textTransform: 'capitalize'
                }}>
                  {selectedLesson.lesson_type || 'Text'}
                </div>
                <h2 style={{
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  marginBottom: '0.5rem'
                }}>
                  {selectedLesson.title}
                </h2>
                <p style={{
                  color: '#9ca3af',
                  fontSize: '1rem',
                  marginBottom: '1rem'
                }}>
                  {selectedLesson.description}
                </p>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  color: '#6b7280',
                  fontSize: '0.875rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={14} />
                    {selectedLesson.estimated_duration_minutes} minutes
                  </div>
                  {lessonProgress[selectedLesson.id]?.status === 'completed' && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      color: '#10b981'
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
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '2rem',
                paddingTop: '2rem',
                borderTop: '1px solid #2d3748'
              }}>
                <button
                  onClick={navigateToPreviousLesson}
                  disabled={isFirstLesson()}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: isFirstLesson() ? '#1a1d24' : '#2d3748',
                    color: isFirstLesson() ? '#6b7280' : '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: isFirstLesson() ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                    opacity: isFirstLesson() ? 0.5 : 1
                  }}
                >
                  ← Previous Lesson
                </button>
                <button
                  onClick={markLessonAsCompleted}
                  disabled={isLastLesson() && lessonProgress[selectedLesson.id]?.status === 'completed'}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#60a5fa',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    opacity: (isLastLesson() && lessonProgress[selectedLesson.id]?.status === 'completed') ? 0.5 : 1
                  }}
                >
                  {isLastLesson() ? 'Complete Course' : 'Mark as Complete & Next →'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              color: '#6b7280'
            }}>
              <BookOpen size={64} style={{ margin: '0 auto 1rem' }} />
              <p style={{ fontSize: '1.125rem' }}>
                Select a lesson from the sidebar to begin learning
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseLearn;