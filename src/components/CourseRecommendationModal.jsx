// frontend/src/components/CourseRecommendationModal.jsx
// UPDATED - Combined view for all beginner languages
import React, { useState, useEffect } from 'react';
import { BookOpen, Clock, Award, ChevronRight, Sparkles, CheckCircle, Trophy, Code2 } from 'lucide-react';

const CourseRecommendationModal = ({ 
  languages, // ✅ NOW ACCEPTS ARRAY OF ALL BEGINNER LANGUAGES
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
      
      // ✅ Load courses for ALL beginner languages in parallel
      const coursesPromises = languages.map(async (lang) => {
        try {
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

          const data = await response.json();
          
          if (data.success && data.resources) {
            const internalCourses = data.resources.filter(
              resource => resource.provider?.toLowerCase() === 'internal_course'
            );
            return {
              language: lang,
              courses: internalCourses
            };
          }
          
          return {
            language: lang,
            courses: []
          };
        } catch (err) {
          console.error(`Error loading courses for ${lang.name}:`, err);
          return {
            language: lang,
            courses: []
          };
        }
      });

      const results = await Promise.all(coursesPromises);
      
      // Convert array to object keyed by language_id
      const coursesMap = {};
      results.forEach(({ language, courses }) => {
        coursesMap[language.language_id] = {
          language,
          courses
        };
      });

      setCoursesByLanguage(coursesMap);
      
    } catch (err) {
      console.error('Error loading courses:', err);
      setError('Unable to load courses');
    } finally {
      setLoading(false);
    }
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
      console.error('Error enrolling in course:', err);
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
    console.log('💾 Continue clicked - Saved courses:', Array.from(savedCourses));
    onContinue(Array.from(savedCourses));
  };

  const handleSkipClick = () => {
    console.log('⏭️ Skip clicked');
    onSkip();
  };

  const getProficiencyBadge = (score) => {
    if (score >= 90) return { icon: '👑', color: '#8b5cf6', title: 'Expert Developer' };
    if (score >= 75) return { icon: '🚀', color: '#3b82f6', title: 'Advanced Developer' };
    if (score >= 60) return { icon: '⭐', color: '#10b981', title: 'Intermediate Developer' };
    return { 
      icon: '🌱', 
      color: '#f59e0b', 
      title: 'Beginner Developer',
      message: 'Everyone starts somewhere! Let\'s build your foundation together.'
    };
  };

  // Calculate total courses across all languages
  const totalCoursesAvailable = Object.values(coursesByLanguage).reduce(
    (sum, { courses }) => sum + courses.length, 
    0
  );

  return (
    <>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={styles.overlay}>
        <div style={styles.modal}>
          {/* 🎯 HEADER SECTION */}
          <div style={styles.header}>
            <div style={styles.headerBadge}>
              <Trophy size={32} color="#f59e0b" />
            </div>
            <div style={styles.headerContent}>
              <p style={styles.headerLabel}>🏆 ASSESSMENT COMPLETE</p>
              <h2 style={styles.headerTitle}>
                {languages.length === 1 
                  ? 'BEGINNER DEVELOPER' 
                  : `${languages.length} LANGUAGES - BEGINNER LEVEL`}
              </h2>
              
              {/* Show all languages */}
              <p style={styles.languageText}>
                {languages.map(l => l.name).join(', ')}
              </p>
              
              {/* Stats Row */}
              <div style={styles.statsRow}>
                <div style={styles.statBadge}>
                  <span style={{ ...styles.statValue, color: '#f59e0b' }}>
                    {languages.length}
                  </span>
                  <span style={styles.statLabel}>
                    {languages.length === 1 ? 'Language' : 'Languages'}
                  </span>
                </div>
                <div style={styles.statDivider} />
                <div style={styles.statBadge}>
                  <span style={{ ...styles.statValue, color: '#22c55e' }}>
                    {challengesPassed}/{totalChallenges}
                  </span>
                  <span style={styles.statLabel}>Passed</span>
                </div>
                <div style={styles.statDivider} />
                <div style={styles.statBadge}>
                  <span style={{ ...styles.statValue, color: '#3b82f6' }}>
                    {totalCoursesAvailable}
                  </span>
                  <span style={styles.statLabel}>Courses</span>
                </div>
              </div>

              {/* Motivational Message */}
              <p style={styles.motivationalText}>
                Everyone starts somewhere! Let's build your foundation together.
              </p>
            </div>
          </div>

          {/* Divider */}
          <div style={styles.sectionDivider} />

          {/* 📚 COURSES SECTION */}
          <div style={styles.content}>
            <div style={styles.courseHeaderSection}>
              <div style={styles.courseHeaderIcon}>
                <Sparkles size={24} color="#3b82f6" />
              </div>
              <div>
                <h3 style={styles.sectionTitle}>Your Personalized Learning Path</h3>
                <p style={styles.sectionSubtitle}>
                  Based on your assessment results, we've curated courses for each language to help you level up!
                </p>
              </div>
            </div>

            {loading ? (
              <div style={styles.loadingContainer}>
                <div style={styles.spinner} />
                <p style={styles.loadingText}>Finding the perfect courses for you...</p>
              </div>
            ) : error || totalCoursesAvailable === 0 ? (
              <div style={styles.emptyContainer}>
                <div style={styles.emptyIcon}>📚</div>
                <h3 style={styles.emptyTitle}>
                  {error ? 'Unable to Load Courses' : 'No Courses Available Yet'}
                </h3>
                <p style={styles.emptyText}>
                  {error 
                    ? 'We encountered an issue loading courses. Don\'t worry, you can explore courses later from your dashboard!' 
                    : 'Our course library is being prepared for you. Don\'t worry, you can explore courses later from your dashboard!'}
                </p>
                <button 
                  onClick={handleContinue} 
                  style={{ ...styles.button, ...styles.primaryButton }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(59, 130, 246, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(59, 130, 246, 0.3)';
                  }}
                >
                  Continue to Dashboard
                  <ChevronRight size={18} />
                </button>
              </div>
            ) : (
              <>
                {/* ✅ RENDER COURSES GROUPED BY LANGUAGE */}
                {Object.entries(coursesByLanguage).map(([langId, { language, courses }]) => (
                  courses.length > 0 && (
                    <div key={langId} style={styles.languageSection}>
                      {/* Language Header */}
                      <div style={styles.languageHeader}>
                        <Code2 size={20} color="#3b82f6" />
                        <h4 style={styles.languageSectionTitle}>
                          {language.name} Courses
                        </h4>
                        <span style={styles.languageCourseCount}>
                          {courses.length} {courses.length === 1 ? 'course' : 'courses'}
                        </span>
                      </div>

                      {/* Courses Grid for this Language */}
                      <div style={styles.coursesGrid}>
                        {courses.map((course, index) => (
                          <div 
                            key={index} 
                            style={{
                              ...styles.courseCard,
                              animation: `slideUp 0.5s ease-out ${index * 0.1}s both`
                            }}
                          >
                            <div style={styles.courseCardHeader}>
                              <div style={styles.courseIcon}>
                                {course.icon || '📚'}
                              </div>
                              <div style={styles.courseInfo}>
                                <h3 style={styles.courseTitle}>{course.title}</h3>
                                <p style={styles.courseDescription}>{course.description}</p>
                              </div>
                            </div>

                            <div style={styles.courseMeta}>
                              <div style={styles.metaItem}>
                                <Clock size={14} />
                                <span>{course.duration || 'Self-paced'}</span>
                              </div>
                              {course.lessonCount && (
                                <div style={styles.metaItem}>
                                  <BookOpen size={14} />
                                  <span>{course.lessonCount} lessons</span>
                                </div>
                              )}
                              <div style={styles.metaItem}>
                                <Award size={14} />
                                <span>{course.difficulty || 'Beginner'}</span>
                              </div>
                            </div>

                            <button
                              onClick={() => handleEnrollCourse(course)}
                              disabled={isEnrolled(course) || isEnrolling(course)}
                              style={{
                                ...styles.enrollButton,
                                ...(isEnrolled(course) ? styles.enrolledButton : {}),
                                ...(isEnrolling(course) ? styles.enrollingButton : {})
                              }}
                            >
                              {isEnrolling(course) ? (
                                <>
                                  <div style={styles.smallSpinner} />
                                  Enrolling...
                                </>
                              ) : isEnrolled(course) ? (
                                <>
                                  <CheckCircle size={16} />
                                  Enrolled
                                </>
                              ) : (
                                <>
                                  <BookOpen size={16} />
                                  Enroll Now
                                </>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ))}

                {/* Action Buttons */}
                <div style={styles.actions}>
                  <button
                    onClick={handleSkipClick}
                    style={{ ...styles.button, ...styles.secondaryButton }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    }}
                  >
                    Skip for Now
                  </button>
                  <button
                    onClick={handleContinue}
                    style={{ ...styles.button, ...styles.primaryButton }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 30px rgba(59, 130, 246, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 20px rgba(59, 130, 246, 0.3)';
                    }}
                  >
                    {savedCourses.size > 0 
                      ? `Continue with ${savedCourses.size} Course${savedCourses.size > 1 ? 's' : ''}` 
                      : 'Continue to Dashboard'}
                    <ChevronRight size={18} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// ===== STYLES =====
const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px'
  },
  modal: {
    width: '100%',
    maxWidth: '900px',
    maxHeight: '90vh',
    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(7, 11, 20, 0.98) 100%)',
    borderRadius: '24px',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  header: {
    padding: '2.5rem 2rem 2rem',
    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.9) 100%)',
    borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
    display: 'flex',
    gap: '1.5rem',
    alignItems: 'flex-start'
  },
  headerBadge: {
    width: '80px',
    height: '80px',
    borderRadius: '20px',
    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.3) 100%)',
    border: '2px solid rgba(251, 191, 36, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 10px 30px rgba(251, 191, 36, 0.2)'
  },
  headerContent: {
    flex: 1
  },
  headerLabel: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#10b981',
    margin: '0 0 8px 0',
    textTransform: 'uppercase',
    letterSpacing: '1.5px'
  },
  headerTitle: {
    fontSize: '28px',
    fontWeight: '900',
    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    color: 'white',
    margin: '0 0 4px 0',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
  languageText: {
    fontSize: '16px',
    color: '#94a3b8',
    margin: '0 0 1.5rem 0',
    fontWeight: '500'
  },
  statsRow: {
    display: 'flex',
    gap: '24px',
    justifyContent: 'flex-start',
    alignItems: 'center',
    margin: '0 0 1rem 0',
    padding: '1rem',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.05)'
  },
  statBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px'
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '700',
    fontFamily: 'monospace'
  },
  statLabel: {
    fontSize: '11px',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontWeight: '600'
  },
  statDivider: {
    width: '1px',
    height: '40px',
    background: 'linear-gradient(180deg, transparent, rgba(59, 130, 246, 0.3), transparent)'
  },
  motivationalText: {
    fontSize: '14px',
    color: '#94a3b8',
    lineHeight: '1.6',
    margin: 0,
    fontStyle: 'italic'
  },
  sectionDivider: {
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.3), transparent)',
    margin: 0
  },
  content: {
    padding: '2rem',
    overflowY: 'auto',
    flex: 1
  },
  courseHeaderSection: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    marginBottom: '2rem',
    padding: '1rem',
    background: 'rgba(59, 130, 246, 0.05)',
    borderRadius: '12px',
    border: '1px solid rgba(59, 130, 246, 0.1)'
  },
  courseHeaderIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'white',
    margin: '0 0 4px 0'
  },
  sectionSubtitle: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: 0,
    lineHeight: '1.5'
  },
  // ✅ NEW: Language Section Styles
  languageSection: {
    marginBottom: '2.5rem'
  },
  languageHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '1rem',
    padding: '12px 16px',
    background: 'rgba(59, 130, 246, 0.1)',
    borderRadius: '10px',
    border: '1px solid rgba(59, 130, 246, 0.2)'
  },
  languageSectionTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'white',
    margin: 0,
    flex: 1
  },
  languageCourseCount: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  coursesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px'
  },
  courseCard: {
    padding: '1.5rem',
    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(7, 11, 20, 0.9) 100%)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    borderRadius: '16px',
    transition: 'all 0.3s ease',
    cursor: 'default'
  },
  courseCardHeader: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px'
  },
  courseIcon: {
    fontSize: '32px',
    lineHeight: 1,
    flexShrink: 0
  },
  courseInfo: {
    flex: 1
  },
  courseTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'white',
    margin: '0 0 8px 0'
  },
  courseDescription: {
    fontSize: '13px',
    color: '#94a3b8',
    margin: 0,
    lineHeight: '1.5'
  },
  courseMeta: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap'
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#64748b'
  },
  enrollButton: {
    width: '100%',
    padding: '12px',
    borderRadius: '10px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    color: 'white',
    transition: 'all 0.3s ease'
  },
  enrolledButton: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    cursor: 'default'
  },
  enrollingButton: {
    opacity: 0.7,
    cursor: 'not-allowed'
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    paddingTop: '1rem',
    marginTop: '1rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
  },
  button: {
    padding: '14px 28px',
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
  },
  secondaryButton: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#94a3b8'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    padding: '60px'
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid rgba(59, 130, 246, 0.2)',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  },
  smallSpinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
    animation: 'spin 0.6s linear infinite'
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: '16px'
  },
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    padding: '60px 40px',
    textAlign: 'center'
  },
  emptyIcon: {
    fontSize: '64px',
    opacity: 0.6
  },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'white',
    margin: 0
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: '16px',
    lineHeight: '1.6',
    margin: 0,
    maxWidth: '500px'
  }
};

export default CourseRecommendationModal;