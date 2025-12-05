// frontend/src/components/CourseRecommendationModal.jsx
import React, { useState, useEffect } from 'react';
import { BookOpen, ExternalLink, Clock, Award, ChevronRight, Sparkles, Target, CheckCircle } from 'lucide-react';

const CourseRecommendationModal = ({ 
  language, 
  proficiencyLevel, 
  score,
  onContinue, 
  onSkip 
}) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savedCourses, setSavedCourses] = useState(new Set());
  const [enrolling, setEnrolling] = useState(new Set());

  useEffect(() => {
    if (proficiencyLevel === 'beginner') {
      loadCourseRecommendations();
    }
  }, [language, proficiencyLevel]);

  const loadCourseRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_URL}/recommendations/challenge-failure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          challengeId: 'onboarding-assessment',
          attemptCount: 15, // High count to ensure beginner resources
          programmingLanguageId: language.language_id,
          difficultyLevel: 'beginner'
        })
      });

      const data = await response.json();
      
      if (data.success && data.resources) {
        // Filter for internal courses only
        const internalCourses = data.resources.filter(
          resource => resource.provider?.toLowerCase() === 'internal_course'
        );
        setCourses(internalCourses);
      } else {
        throw new Error('Failed to load course recommendations');
      }
    } catch (err) {
      console.error('Error loading courses:', err);
      setError('Failed to load course recommendations');
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
    onContinue(Array.from(savedCourses));
  };

  if (proficiencyLevel !== 'beginner') {
    // Not a beginner, skip course recommendations
    onContinue([]);
    return null;
  }

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
      `}</style>

      <div style={styles.overlay}>
        <div style={styles.modal}>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.headerIcon}>
              <Sparkles size={32} color="#3b82f6" />
            </div>
            <h2 style={styles.title}>Personalized Learning Path</h2>
            <p style={styles.subtitle}>
              Based on your <span style={{ color: '#3b82f6', fontWeight: '700' }}>{score}%</span> score, 
              we've identified you as a <span style={{ color: '#fbbf24', fontWeight: '700' }}>Beginner</span> in {language.name}.
              <br/>Here are some courses to help you level up! 🚀
            </p>
          </div>

          {/* Content */}
          <div style={styles.content}>
            {loading ? (
              <div style={styles.loadingContainer}>
                <div style={styles.spinner} />
                <p style={styles.loadingText}>Finding the perfect courses for you...</p>
              </div>
            ) : error ? (
              <div style={styles.errorContainer}>
                <p style={styles.errorText}>{error}</p>
                <button onClick={handleContinue} style={{ ...styles.button, ...styles.primaryButton }}>
                  Continue Anyway
                </button>
              </div>
            ) : courses.length === 0 ? (
              <div style={styles.emptyContainer}>
                <p style={styles.emptyText}>No courses available at the moment.</p>
                <button onClick={handleContinue} style={{ ...styles.button, ...styles.primaryButton }}>
                  Continue
                </button>
              </div>
            ) : (
              <>
                <div style={styles.coursesGrid}>
                  {courses.map((course, index) => (
                    <div key={index} style={styles.courseCard}>
                      <div style={styles.courseHeader}>
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

                <div style={styles.actions}>
                  <button
                    onClick={onSkip}
                    style={{ ...styles.button, ...styles.secondaryButton }}
                  >
                    Skip for Now
                  </button>
                  <button
                    onClick={handleContinue}
                    style={{ ...styles.button, ...styles.primaryButton }}
                  >
                    {savedCourses.size > 0 
                      ? `Continue with ${savedCourses.size} Course${savedCourses.size > 1 ? 's' : ''}` 
                      : 'Continue'}
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

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '20px',
    animation: 'fadeIn 0.3s ease-out'
  },
  modal: {
    backgroundColor: '#0f1419',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '900px',
    maxHeight: '90vh',
    overflow: 'hidden',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    padding: '2rem',
    borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
    background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.1) 0%, transparent 100%)',
    textAlign: 'center'
  },
  headerIcon: {
    width: '64px',
    height: '64px',
    margin: '0 auto 1rem',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: '28px',
    fontWeight: '800',
    color: 'white',
    margin: '0 0 12px 0',
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  subtitle: {
    fontSize: '16px',
    color: '#94a3b8',
    lineHeight: '1.6',
    margin: 0
  },
  content: {
    padding: '2rem',
    overflowY: 'auto',
    flex: 1
  },
  coursesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '2rem'
  },
  courseCard: {
    padding: '1.5rem',
    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(7, 11, 20, 0.9) 100%)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    borderRadius: '16px',
    transition: 'all 0.3s ease'
  },
  courseHeader: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px'
  },
  courseIcon: {
    fontSize: '32px',
    lineHeight: 1
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
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    padding: '60px'
  },
  errorText: {
    color: '#fca5a5',
    fontSize: '16px',
    textAlign: 'center'
  },
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    padding: '60px'
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: '16px',
    textAlign: 'center'
  }
};

export default CourseRecommendationModal;