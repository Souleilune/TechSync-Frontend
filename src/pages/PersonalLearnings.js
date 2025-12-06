// frontend/src/pages/PersonalLearnings.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Youtube, Github, ExternalLink, Trash2, Clock, Star, GraduationCap, BookMarked } from 'lucide-react';

const PersonalLearnings = ({ userId }) => {
  const navigate = useNavigate();
  const [learnings, setLearnings] = useState([]);
  const [bookmarkedArticles, setBookmarkedArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enrollments, setEnrollments] = useState(new Map());
  const [allResources, setAllResources] = useState([]); // ✅ NEW: Combined resources
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'courses', 'articles'


  useEffect(() => {
    if (userId) {
      fetchLearnings();
      fetchEnrollments();
      fetchBookmarkedArticles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ✅ NEW: Merge learnings and enrollments whenever either changes
  useEffect(() => {
    const enrolledCourses = transformEnrollmentsToResources(enrollments);
    const combined = [...learnings, ...enrolledCourses];
    
    // Remove duplicates (if a course is both saved and enrolled, keep only one)
    const uniqueResources = combined.filter((resource, index, self) => {
      const courseId = getCourseId(resource.resource);
      if (!courseId) return true; // Keep non-course resources
      
      // For courses, keep only first occurrence by courseId
      return index === self.findIndex(r => {
        const rCourseId = getCourseId(r.resource);
        return rCourseId === courseId;
      });
    });
    
    setAllResources(uniqueResources);
  }, [learnings, enrollments]);

  // ✅ NEW: Transform enrollments to resource format
  const transformEnrollmentsToResources = (enrollmentsMap) => {
    const enrolledCourses = [];
    enrollmentsMap.forEach((enrollmentData, courseId) => {
      const course = enrollmentData.course;
      if (course) {
        enrolledCourses.push({
          id: `enrollment-${enrollmentData.id}`,
          savedAt: enrollmentData.enrolledAt || new Date(),
          resource: {
            provider: 'INTERNAL_COURSE',
            type: 'course',
            title: course.title,
            description: course.short_description || course.description,
            url: `/courses/${courseId}/learn`,
            courseId: courseId,
            difficulty: course.level,
            duration: `${course.estimated_duration_hours} hours`,
            lessonCount: course.total_lessons,
            moduleCount: course.total_modules,
            icon: course.icon_emoji || '📚'
          },
          difficulty: course.level,
          isEnrolledCourse: true // flag to identify enrolled courses
        });
      }
    });
    return enrolledCourses;
  };

  // ✅ UPDATED: Store full course data
  const fetchEnrollments = async () => {
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_URL}/courses/my-courses`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      
      if (data.success && data.enrollments) {
        const enrollmentMap = new Map(
          data.enrollments.map(enrollment => [
            enrollment.course_id,
            {
              id: enrollment.id,
              progress: enrollment.progress_percentage || 0,
              lastAccessed: enrollment.last_accessed_at,
              enrolledAt: enrollment.enrolled_at,
              course: enrollment.courses // ✅ Store full course object!
            }
          ])
        );
        setEnrollments(enrollmentMap);
      }
    } catch (err) {
      console.error('Error fetching enrollments:', err);
    }
  };

  const fetchLearnings = async () => {
    setLoading(true);
    setError(null);
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_URL}/recommendations/personal-learnings/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setLearnings(data.learnings || []);
      } else {
        setError(data.error || 'Failed to load saved resources');
      }
    } catch (err) {
      console.error('Error fetching learnings:', err);
      setError('Failed to load saved resources');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookmarkedArticles = async () => {
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_URL}/recommendations/bookmarked-articles/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setBookmarkedArticles(data.bookmarkedArticles || []);
      }
    } catch (err) {
      console.error('Error fetching bookmarked articles:', err);
    }
  };

  // ✅ UPDATED: Handle removal for both saved resources and enrolled courses
  const handleRemove = async (activityId, isEnrolledCourse, courseId) => {
    if (isEnrolledCourse) {
      // For enrolled courses, we need to unenroll
      if (!window.confirm('Are you sure you want to unenroll from this course? Your progress will be kept.'))
        return;
      
      try {
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        // Note: You'll need to add an unenroll endpoint in the backend
        // For now, we'll just remove from state (delete enrollment)
        const response = await fetch(`${API_URL}/courses/${courseId}/enrollment`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        const data = await response.json();
        
        if (data.success) {
          // Remove from enrollments
          const newEnrollments = new Map(enrollments);
          newEnrollments.delete(courseId);
          setEnrollments(newEnrollments);
        }
      } catch (err) {
        console.error('Error unenrolling from course:', err);
        alert('Failed to unenroll from course');
      }
    } else {
      // Existing removal logic for saved resources
      if (!window.confirm('Are you sure you want to remove this resource?'))
        return;

      try {
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${API_URL}/recommendations/personal-learnings/${activityId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        const data = await response.json();
        
        if (data.success) {
          setLearnings(learnings.filter(l => l.id !== activityId));
        }
      } catch (err) {
        console.error('Error removing learning:', err);
        alert('Failed to remove resource');
      }
    }
  };

  const handleRemoveBookmark = async (articleId) => {
    if (!window.confirm('Are you sure you want to remove this bookmark?'))
      return;

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_URL}/recommendations/bookmark-article`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ articleId })
      });

      const data = await response.json();
      
      if (data.success) {
        setBookmarkedArticles(bookmarkedArticles.filter(article => article.id !== articleId));
      }
    } catch (err) {
      console.error('Error removing bookmark:', err);
      alert('Failed to remove bookmark');
    }
  };

  const isInternalCourse = (resource) => {
    return resource?.provider?.toLowerCase() === 'internal_course';
  };

  const getCourseId = (resource) => {
    console.log('🔍 Getting course ID from resource:', resource);
    
    if (resource?.url && isInternalCourse(resource)) {
      const match = resource.url.match(/\/courses?\/([^/]+)/);
      const courseId = match ? match[1] : null;
      console.log('📍 Extracted course ID from URL:', courseId);
      return courseId;
    }
    
    const courseId = resource?.courseId || null;
    console.log('📍 Course ID from resource.courseId:', courseId);
    return courseId;
  };

  const isEnrolled = (resource) => {
    const courseId = getCourseId(resource);
    return courseId && enrollments.has(courseId);
  };

  const getEnrollmentData = (resource) => {
    const courseId = getCourseId(resource);
    return courseId ? enrollments.get(courseId) : null;
  };

  const getButtonText = (resource) => {
    if (isInternalCourse(resource)) {
      return isEnrolled(resource) ? 'Go to Course' : 'Start Course';
    }
    return 'View Resource';
  };

  const handleCourseClick = async (resource) => {
    const courseId = getCourseId(resource);
    console.log('🎯 handleCourseClick - Course ID:', courseId);
    console.log('🎯 handleCourseClick - Resource:', resource);
    
    if (courseId && isInternalCourse(resource)) {
      const enrolled = isEnrolled(resource);
      console.log('📚 Is enrolled:', enrolled);
      
      if (!enrolled) {
        try {
          const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
          console.log('📝 Enrolling in course:', courseId);
          const response = await fetch(`${API_URL}/courses/${courseId}/enroll`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          });
          const data = await response.json();
          
          if (data.success) {
            console.log('✅ Successfully enrolled');
            const enrollmentMap = new Map(enrollments);
            enrollmentMap.set(courseId, {
              id: data.enrollment?.id,
              progress: 0,
              lastAccessed: new Date()
            });
            setEnrollments(enrollmentMap);
          } else {
            console.error('❌ Enrollment failed:', data);
          }
        } catch (err) {
          console.error('❌ Error enrolling in course:', err);
          alert('Failed to enroll in course');
          return;
        }
      }
      
      const targetPath = `/course/${courseId}/learn`;
      console.log('🚀 Navigating to:', targetPath);
      navigate(targetPath);
    } else if (resource?.url) {
      console.log('🔗 Opening external URL:', resource.url);
      window.open(resource.url, '_blank', 'noopener,noreferrer');
    } else {
      console.error('❌ No course ID or URL found');
    }
  };

  const getProviderIcon = (provider) => {
    switch(provider?.toLowerCase()) {
      case 'youtube': return <Youtube size={16} />;
      case 'github': return <Github size={16} />;
      case 'internal_course': return <GraduationCap size={16} />;
      default: return <BookOpen size={16} />;
    }
  };

  const getProviderColor = (provider) => {
    const colors = {
      'youtube': '#ff0000',
      'github': '#333',
      'dev.to': '#0a0a23',
      'freecodecamp': '#0a0a23',
      'internal_course': '#3b82f6'
    };
    return colors[provider?.toLowerCase()] || '#3b82f6';
  };

  const getProviderBadgeStyle = (provider) => {
    if (provider?.toLowerCase() === 'internal_course') {
      return {
        backgroundColor: '#3b82f615',
        color: '#3b82f6',
        border: '1px solid #3b82f6'
      };
    }
    return {
      backgroundColor: `${getProviderColor(provider)}15`,
      color: getProviderColor(provider)
    };
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading your saved resources...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <p style={styles.errorText}>{error}</p>
          <button onClick={fetchLearnings} style={styles.retryButton}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>My Personal Learnings</h1>
          <p style={styles.subtitle}>
            Resources and courses you've saved to help improve your skills
          </p>
        </div>
        <div style={styles.statsContainer}>
          <div style={styles.statBox}>
            <GraduationCap size={24} color="#3b82f6" />
            <div>
              <div style={styles.statNumber}>{enrollments.size}</div>
              <div style={styles.statLabel}>Enrolled Courses</div>
            </div>
          </div>
          <div style={styles.statBox}>
            <BookOpen size={24} color="#10b981" />
            <div>
              <div style={styles.statNumber}>{allResources.length}</div>
              <div style={styles.statLabel}>Total Resources</div>
            </div>
          </div>
          <div style={styles.statBox}>
            <BookMarked size={24} color="#8b5cf6" />
            <div>
              <div style={styles.statNumber}>{bookmarkedArticles.length}</div>
              <div style={styles.statLabel}>Bookmarked Articles</div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ UPDATED: Check allResources instead of learnings */}
      {allResources.length === 0 && bookmarkedArticles.length === 0 ? (
        <div style={styles.emptyState}>
          <BookOpen size={64} color="#6b7280" />
          <h2 style={styles.emptyTitle}>No saved resources yet</h2>
          <p style={styles.emptyText}>
            When you enroll in courses, bookmark articles, or save learning resources, they'll appear here for easy access.
          </p>
        </div>
      ) : (
        <>
          {/* Bookmarked Articles Section */}
          {bookmarkedArticles.length > 0 && (
            <>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>
                  <BookMarked size={20} style={{ marginRight: '0.5rem' }} />
                  Bookmarked Articles
                </h2>
              </div>
              <div style={styles.grid}>
                {bookmarkedArticles.map((article) => (
                  <div key={article.id} style={styles.card}>
                    <div style={styles.providerBadge}>
                      <BookMarked size={14} />
                      <span>DEV.TO</span>
                    </div>

                    <h3 style={styles.resourceTitle}>{article.title}</h3>

                    {article.description && (
                      <p style={styles.resourceDescription}>
                        {article.description.substring(0, 150)}...
                      </p>
                    )}

                    <div style={styles.resourceMeta}>
                      {article.user?.name && (
                        <span style={styles.metaItem}>By {article.user.name}</span>
                      )}
                      {article.reading_time_minutes && (
                        <span style={styles.metaItem}>
                          <Clock size={14} />
                          {article.reading_time_minutes} min
                        </span>
                      )}
                    </div>

                    <div style={styles.cardActions}>
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.viewButton}
                      >
                        <ExternalLink size={16} />
                        Read Article
                      </a>

                      <button
                        onClick={() => handleRemoveBookmark(article.id)}
                        style={styles.removeButton}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ✅ UPDATED: My Courses & Saved Resources Section */}
          {allResources.length > 0 && (
            <>
              {bookmarkedArticles.length > 0 && (
                <div style={styles.sectionHeader}>
                  <h2 style={styles.sectionTitle}>
                    <BookOpen size={20} style={{ marginRight: '0.5rem' }} />
                    My Courses & Saved Resources
                  </h2>
                </div>
              )}
              <div style={styles.grid}>
                {/* ✅ UPDATED: Use allResources instead of learnings */}
                {allResources.map((learning) => {
            const resource = learning.resource || {};
            const provider = resource.provider || 'unknown';
            const isCourse = isInternalCourse(resource);
            const enrolled = isEnrolled(resource);
            const enrollmentData = getEnrollmentData(resource);
            const progress = enrollmentData?.progress || 0;
            const isEnrolledCourse = learning.isEnrolledCourse || false; // ✅ Check if it's an enrolled course
            
            return (
            <div
              key={learning.id}
              style={{
                ...styles.card,
                ...(isCourse ? styles.courseCard : {}),
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '380px',
              }}
            >
              <div style={{ flexGrow: 1 }}>
                <div
                  style={{
                    ...styles.providerBadge,
                    ...getProviderBadgeStyle(provider),
                  }}
                >
                  {getProviderIcon(provider)}
                  <span style={{ textTransform: 'uppercase' }}>
                    {isCourse ? 'COURSE' : provider}
                  </span>
                </div>

                {learning.difficulty && (
                  <div style={styles.difficultyBadge}>{learning.difficulty}</div>
                )}

                {isCourse && resource.icon && (
                  <div style={styles.courseIcon}>{resource.icon}</div>
                )}

                <h3 style={styles.resourceTitle}>
                  {resource.title || 'Untitled Resource'}
                </h3>

                {resource.description && (
                  <p style={styles.resourceDescription}>
                    {resource.description.length > 150
                      ? resource.description.substring(0, 150) + '...'
                      : resource.description}
                  </p>
                )}

                {isCourse && (
                  <div style={styles.courseMeta}>
                    {resource.duration && (
                      <span style={styles.metaItem}>
                        <Clock size={14} />
                        {resource.duration}
                      </span>
                    )}
                    {resource.lessonCount && (
                      <span style={styles.metaItem}>
                        <BookOpen size={14} />
                        {resource.lessonCount} lessons
                      </span>
                    )}
                  </div>
                )}

                {!isCourse && (
                  <div style={styles.resourceMeta}>
                    {resource.author && (
                      <span style={styles.metaItem}>By {resource.author}</span>
                    )}
                    {resource.readTime && (
                      <span style={styles.metaItem}>
                        <Clock size={14} />
                        {resource.readTime} min
                      </span>
                    )}
                    {resource.reactions && (
                      <span style={styles.metaItem}>
                        <Star size={14} />
                        {resource.reactions}
                      </span>
                    )}
                  </div>
                )}

                {isCourse && enrolled && (
                  <div style={styles.progressContainer}>
                    <div style={styles.progressHeader}>
                      <span style={styles.progressLabel}>Progress</span>
                      <span style={styles.progressPercent}>{Math.round(progress)}%</span>
                    </div>
                    <div style={styles.progressBarBg}>
                      <div
                        style={{
                          ...styles.progressBarFill,
                          width: `${progress}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div style={styles.cardActions}>
                {isCourse ? (
                  <button
                    onClick={() => handleCourseClick(resource)}
                    style={{
                      ...styles.viewButton,
                      ...(enrolled ? styles.enrolledButton : {}),
                      flex: 1,
                    }}
                  >
                    {enrolled ? (
                      <GraduationCap size={16} />
                    ) : (
                      <ExternalLink size={16} />
                    )}
                    {getButtonText(resource)}
                  </button>
                ) : (
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ ...styles.viewButton, flex: 1 }}
                  >
                    <ExternalLink size={16} />
                    View Resource
                  </a>
                )}

                {/* ✅ UPDATED: Pass isEnrolledCourse flag to handleRemove */}
                <button
                  onClick={() => handleRemove(learning.id, isEnrolledCourse, getCourseId(resource))}
                  style={styles.removeButton}
                  title={isEnrolledCourse ? "Unenroll from course" : "Remove from saved resources"}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
          })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '2rem',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
    gap: '2rem',
    flexWrap: 'wrap'
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: 'white',
    margin: '0 0 0.5rem 0'
  },
  subtitle: {
    fontSize: '1rem',
    color: '#9ca3af',
    margin: 0
  },
  statsContainer: {
    display: 'flex',
    gap: '1rem'
  },
  statBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem 1.5rem',
    backgroundColor: '#1a1d24',
    borderRadius: '12px',
    border: '1px solid #2d3748'
  },
  statNumber: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: 'white'
  },
  statLabel: {
    fontSize: '0.875rem',
    color: '#9ca3af'
  },
  sectionHeader: {
    marginTop: '2rem',
    marginBottom: '1.5rem'
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '1.5rem',
    fontWeight: '600',
    color: 'white'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid #2d3748',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    marginTop: '1rem',
    color: '#9ca3af'
  },
  errorContainer: {
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: '#1a1d24',
    borderRadius: '12px',
    border: '1px solid #dc2626'
  },
  errorText: {
    color: '#dc2626',
    marginBottom: '1rem'
  },
  retryButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  emptyState: {
    textAlign: 'center',
    padding: '4rem 2rem',
    backgroundColor: '#1a1d24',
    borderRadius: '12px',
    border: '1px solid #2d3748'
  },
  emptyTitle: {
    fontSize: '1.5rem',
    color: 'white',
    margin: '1rem 0'
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: '1rem'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '1.5rem'
  },
  card: {
    backgroundColor: '#1a1d24',
    borderRadius: '12px',
    border: '1px solid #2d3748',
    padding: '1.5rem',
    transition: 'all 0.2s',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '420px'
  },
  courseCard: {
    backgroundColor: '#1a1d24'
  },
  providerBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600',
    marginBottom: '1rem'
  },
  difficultyBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '600',
    backgroundColor: '#3b82f615',
    color: '#3b82f6',
    textTransform: 'capitalize',
    marginLeft: '0.5rem',
    marginBottom: '1rem'
  },
  courseIcon: {
    fontSize: '2.5rem',
    marginBottom: '1rem'
  },
  resourceTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: 'white',
    margin: '0 0 0.75rem 0',
    lineHeight: '1.4'
  },
  resourceDescription: {
    fontSize: '0.875rem',
    color: '#9ca3af',
    lineHeight: '1.5',
    marginBottom: '1rem'
  },
  courseMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem',
    marginBottom: '1rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #334155'
  },
  resourceMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem',
    marginBottom: '1rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #334155'
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    fontSize: '0.875rem',
    color: '#6b7280'
  },
  progressContainer: {
    marginBottom: '1rem',
    padding: '1rem',
    backgroundColor: '#0F1116',
    borderRadius: '8px',
    border: '1px solid #2d3748'
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem'
  },
  progressLabel: {
    fontSize: '0.875rem',
    color: '#9ca3af',
    fontWeight: '500'
  },
  progressPercent: {
    fontSize: '0.875rem',
    color: '#60a5fa',
    fontWeight: '600'
  },
  progressBarBg: {
    width: '100%',
    height: '8px',
    backgroundColor: '#1a1d24',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#60a5fa',
    borderRadius: '4px',
    transition: 'width 0.3s ease'
  },
  cardActions: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center'
  },
  viewButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.75rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    textDecoration: 'none',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  enrolledButton: {
    backgroundColor: '#10b981'
  },
  removeButton: {
    padding: '0.75rem',
    backgroundColor: '#dc262615',
    color: '#dc2626',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  }
};

export default PersonalLearnings;