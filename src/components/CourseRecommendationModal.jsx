// frontend/src/components/CourseRecommendationModal.jsx
// FIXED - Correctly handles API response from /recommendations/challenge-failure
import React, { useState, useEffect } from 'react';
import { BookOpen, Clock, Award, ChevronRight, Sparkles, CheckCircle, Trophy, Code2 } from 'lucide-react';

const CourseRecommendationModal = ({ 
  languages, // Array of all beginner languages
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
      
      console.log('📚 Loading courses for languages:', languages.map(l => l.name));
      
      // Load courses for ALL beginner languages in parallel
      const coursesPromises = languages.map(async (lang) => {
        try {
          console.log(`  🔍 Fetching courses for ${lang.name} (ID: ${lang.language_id})...`);
          
          const response = await fetch(`${API_URL}/recommendations/challenge-failure`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              challengeId: 'onboarding-assessment',
              attemptCount: 15, // High attempt count to prioritize internal courses
              programmingLanguageId: lang.language_id,
              difficultyLevel: 'beginner'
            })
          });

          if (response.status === 401) {
            throw new Error('Session expired');
          }

          if (!response.ok) {
            console.error(`  ❌ Failed to fetch courses for ${lang.name}:`, response.status);
            return {
              language: lang,
              courses: []
            };
          }

          const data = await response.json();
          
          console.log(`  📊 API Response for ${lang.name}:`, {
            success: data.success,
            recommendationsCount: data.recommendations?.length || 0,
            metadata: data.metadata
          });
          
          // ✅ FIX: The endpoint returns 'recommendations' not 'resources'
          if (data.success && data.recommendations) {
            // Filter for internal courses only
            const internalCourses = data.recommendations.filter(
              resource => resource.provider === 'internal_course' || 
                         resource.type === 'course' ||
                         resource.courseId // Has courseId means it's an internal course
            );
            
            console.log(`  ✅ Found ${internalCourses.length} courses for ${lang.name}`);
            
            return {
              language: lang,
              courses: internalCourses
            };
          }
          
          console.log(`  ⚠️ No courses found for ${lang.name}`);
          return {
            language: lang,
            courses: []
          };
        } catch (err) {
          console.error(`  ❌ Error loading courses for ${lang.name}:`, err);
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

      console.log('📊 Final courses map:', Object.entries(coursesMap).map(([id, data]) => ({
        language: data.language.name,
        courseCount: data.courses.length
      })));

      setCoursesByLanguage(coursesMap);
      
    } catch (err) {
      console.error('❌ Error loading courses:', err);
      setError('Unable to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollCourse = async (course) => {
    try {
      const courseId = extractCourseId(course);
      if (!courseId) {
        console.error('❌ No course ID found for:', course);
        return;
      }

      console.log('📝 Enrolling in course:', courseId);
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
        console.log('✅ Successfully enrolled in course:', courseId);
        setSavedCourses(prev => new Set(prev).add(courseId));
      } else {
        console.error('❌ Enrollment failed:', data);
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
    // Try multiple ways to get course ID
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
    console.log('💾 Continue clicked - Enrolled courses:', Array.from(savedCourses));
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

  // Calculate total available courses
  const totalCoursesAvailable = Object.values(coursesByLanguage).reduce(
    (total, { courses }) => total + courses.length, 
    0
  );

  if (!languages || languages.length === 0) {
    return null;
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* HEADER */}
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <Trophy size={32} color="#3b82f6" style={{ marginBottom: '12px' }} />
            <h2 style={styles.title}>Assessment Complete! 🎉</h2>
            <p style={styles.subtitle}>
              You've completed {challengesPassed} of {totalChallenges} assessments
            </p>
          </div>

          {/* Progress Indicator */}
          <div style={styles.progressContainer}>
            {languages.map((lang) => {
              const badge = getProficiencyBadge(lang.score);
              return (
                <div key={lang.language_id} style={styles.languageBadge}>
                  <span style={{ fontSize: '20px' }}>{badge.icon}</span>
                  <div style={styles.languageBadgeContent}>
                    <div style={styles.languageBadgeName}>{lang.name}</div>
                    <div style={{ ...styles.proficiencyTag, backgroundColor: `${badge.color}20`, color: badge.color }}>
                      {badge.title}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Beginner Message */}
          {languages.some(l => l.score < 60) && (
            <div style={styles.encouragementBox}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌱</div>
              <p style={styles.encouragementText}>
                <strong>New to {languages.length > 1 ? 'these languages' : languages[0].name}?</strong><br />
                {getProficiencyBadge(0).message}
              </p>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={styles.sectionDivider} />

        {/* COURSES SECTION */}
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
              {/* Render courses grouped by language */}
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

                    {/* Courses Grid */}
                    <div style={styles.coursesGrid}>
                      {courses.map((course, idx) => (
                        <div key={idx} style={styles.courseCard}>
                          {/* Course Header */}
                          <div style={styles.courseHeader}>
                            <div style={styles.courseIconContainer}>
                              <span style={styles.courseIcon}>{course.icon || '📚'}</span>
                            </div>
                            <div style={styles.courseHeaderText}>
                              <h5 style={styles.courseTitle}>{course.title}</h5>
                              <div style={styles.courseMeta}>
                                {course.difficulty && (
                                  <span style={styles.courseMetaItem}>
                                    <Award size={14} />
                                    {course.difficulty}
                                  </span>
                                )}
                                {course.duration && (
                                  <span style={styles.courseMetaItem}>
                                    <Clock size={14} />
                                    {course.duration}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Course Description */}
                          <p style={styles.courseDescription}>
                            {course.description || 'Comprehensive course to help you master the fundamentals.'}
                          </p>

                          {/* Course Stats */}
                          <div style={styles.courseStats}>
                            {course.moduleCount && (
                              <span style={styles.courseStat}>
                                <BookOpen size={14} />
                                {course.moduleCount} modules
                              </span>
                            )}
                            {course.lessonCount && (
                              <span style={styles.courseStat}>
                                <Code2 size={14} />
                                {course.lessonCount} lessons
                              </span>
                            )}
                          </div>

                          {/* Enroll Button */}
                          <button
                            onClick={() => handleEnrollCourse(course)}
                            disabled={isEnrolled(course) || isEnrolling(course)}
                            style={{
                              ...styles.enrollButton,
                              ...(isEnrolled(course) ? styles.enrolledButton : {}),
                              ...(isEnrolling(course) ? styles.enrollingButton : {})
                            }}
                          >
                            {isEnrolled(course) ? (
                              <>
                                <CheckCircle size={16} />
                                Enrolled
                              </>
                            ) : isEnrolling(course) ? (
                              <>
                                <div style={styles.buttonSpinner} />
                                Enrolling...
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
                    e.currentTarget.style.backgroundColor = '#374151';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
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
                  Continue {savedCourses.size > 0 && `(${savedCourses.size} enrolled)`}
                  <ChevronRight size={18} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Styles object (kept exactly the same as before)
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
    animation: 'fadeIn 0.3s ease-out'
  },
  modal: {
    backgroundColor: '#1a1d29',
    borderRadius: '24px',
    maxWidth: '900px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    animation: 'slideUp 0.4s ease-out',
    border: '1px solid rgba(139, 92, 246, 0.2)'
  },
  header: {
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    padding: '32px',
    borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
    textAlign: 'center'
  },
  headerContent: {
    marginBottom: '24px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#fff',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#94a3b8',
    margin: 0
  },
  progressContainer: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: '20px'
  },
  languageBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    padding: '12px 20px',
    borderRadius: '12px',
    border: '1px solid rgba(139, 92, 246, 0.2)'
  },
  languageBadgeContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  languageBadgeName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#fff'
  },
  proficiencyTag: {
    fontSize: '11px',
    fontWeight: '600',
    padding: '2px 8px',
    borderRadius: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  encouragementBox: {
    marginTop: '20px',
    padding: '20px',
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
    border: '1px solid rgba(251, 146, 60, 0.3)',
    borderRadius: '12px',
    textAlign: 'center'
  },
  encouragementText: {
    fontSize: '14px',
    color: '#fbbf24',
    margin: 0,
    lineHeight: '1.6'
  },
  sectionDivider: {
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.3), transparent)',
    margin: '0'
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '32px',
    backgroundColor: '#0f172a'
  },
  courseHeaderSection: {
    display: 'flex',
    gap: '16px',
    marginBottom: '28px',
    alignItems: 'flex-start'
  },
  courseHeaderIcon: {
    width: '48px',
    height: '48px',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    border: '2px solid rgba(59, 130, 246, 0.3)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  sectionTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#fff',
    margin: '0 0 8px 0'
  },
  sectionSubtitle: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: 0,
    lineHeight: '1.6'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    gap: '20px'
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid rgba(59, 130, 246, 0.2)',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    fontSize: '16px',
    color: '#94a3b8',
    margin: 0
  },
  emptyContainer: {
    textAlign: 'center',
    padding: '60px 20px'
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px'
  },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#fff',
    margin: '0 0 12px 0'
  },
  emptyText: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: '0 0 24px 0',
    lineHeight: '1.6',
    maxWidth: '500px',
    marginLeft: 'auto',
    marginRight: 'auto'
  },
  languageSection: {
    marginBottom: '32px'
  },
  languageHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
    padding: '12px 0',
    borderBottom: '2px solid rgba(59, 130, 246, 0.2)'
  },
  languageSectionTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#fff',
    margin: 0,
    flex: 1
  },
  languageCourseCount: {
    fontSize: '13px',
    color: '#64748b',
    fontWeight: '600',
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
    padding: '4px 12px',
    borderRadius: '12px'
  },
  coursesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px'
  },
  courseCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    border: '1px solid rgba(100, 116, 139, 0.2)',
    borderRadius: '16px',
    padding: '20px',
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    cursor: 'default',
    ':hover': {
      borderColor: 'rgba(59, 130, 246, 0.5)',
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)'
    }
  },
  courseHeader: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start'
  },
  courseIconContainer: {
    width: '40px',
    height: '40px',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  courseIcon: {
    fontSize: '20px'
  },
  courseHeaderText: {
    flex: 1,
    minWidth: 0
  },
  courseTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#fff',
    margin: '0 0 6px 0',
    lineHeight: '1.3',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical'
  },
  courseMeta: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  courseMetaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: '#94a3b8',
    fontWeight: '500'
  },
  courseDescription: {
    fontSize: '13px',
    color: '#cbd5e1',
    lineHeight: '1.6',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical'
  },
  courseStats: {
    display: 'flex',
    gap: '12px',
    paddingTop: '8px',
    borderTop: '1px solid rgba(100, 116, 139, 0.2)'
  },
  courseStat: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '500'
  },
  enrollButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: '#3b82f6',
    border: '1.5px solid rgba(59, 130, 246, 0.4)',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '4px'
  },
  enrolledButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    color: '#10b981',
    border: '1.5px solid rgba(16, 185, 129, 0.4)',
    cursor: 'not-allowed'
  },
  enrollingButton: {
    backgroundColor: 'rgba(100, 116, 139, 0.15)',
    color: '#64748b',
    border: '1.5px solid rgba(100, 116, 139, 0.4)',
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
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: '1px solid rgba(100, 116, 139, 0.2)'
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit'
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    color: '#fff',
    boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)'
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1.5px solid rgba(148, 163, 184, 0.3)'
  }
};

export default CourseRecommendationModal;