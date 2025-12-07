// frontend/src/components/CoursesTab.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

const CoursesTab = () => {
  const navigate = useNavigate();
  const [unenrolledCourses, setUnenrolledCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  useEffect(() => {
    fetchUnenrolledCourses();
  }, []);

  const fetchUnenrolledCourses = async () => {
    setLoadingCourses(true);
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      
      // Fetch all courses
      const coursesResponse = await fetch(`${API_URL}/courses`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const coursesData = await coursesResponse.json();
      
      // Fetch user's enrollments
      const enrollmentsResponse = await fetch(`${API_URL}/courses/my-courses`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const enrollmentsData = await enrollmentsResponse.json();
      
      if (coursesData.success && enrollmentsData.success) {
        // Get enrolled course IDs
        const enrolledIds = new Set(
          enrollmentsData.enrollments.map(e => e.course_id)
        );
        
        // Filter out enrolled courses
        const unenrolled = coursesData.courses.filter(
          course => !enrolledIds.has(course.id) && course.is_published
        );
        
        setUnenrolledCourses(unenrolled);
      }
    } catch (err) {
      console.error('Error fetching unenrolled courses:', err);
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleEnrollInCourse = async (courseId) => {
    try {
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
        // Navigate to the course
        navigate(`/course/${courseId}`);
      }
    } catch (err) {
      console.error('Error enrolling in course:', err);
      alert('Failed to enroll in course');
    }
  };

  return (
    <div>
      <h3 style={styles.sectionTitle}>
        <BookOpen size={24} style={{ color: '#a855f7' }} />
        Available Courses
      </h3>
      <p style={styles.sectionDescription}>
        Internal courses recommended during onboarding that you haven't enrolled in yet.
      </p>

      {loadingCourses ? (
        <div style={styles.loadingContainer}>
          <div style={styles.loadingText}>
            Loading courses...
          </div>
        </div>
      ) : unenrolledCourses.length === 0 ? (
        <div style={styles.emptyState}>
          <BookOpen size={48} style={{ color: '#9ca3af', marginBottom: '16px' }} />
          <h4 style={styles.emptyStateTitle}>
            No Available Courses
          </h4>
          <p style={styles.emptyStateText}>
            You're already enrolled in all recommended courses, or no courses are available yet.
          </p>
        </div>
      ) : (
        <div style={styles.coursesGrid}>
          {unenrolledCourses.map((course) => (
            <div
              key={course.id}
              style={styles.courseCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#8b5cf6';
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(139, 92, 246, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Course Icon/Emoji */}
              <div style={styles.courseIcon}>
                {course.icon_emoji || '📚'}
              </div>

              {/* Course Title */}
              <h4 style={styles.courseTitle}>
                {course.title}
              </h4>

              {/* Course Description */}
              <p style={styles.courseDescription}>
                {course.short_description || course.description}
              </p>

              {/* Course Metadata */}
              <div style={styles.metadataContainer}>
                {/* Difficulty Level */}
                <span style={{
                  ...styles.badge,
                  backgroundColor: course.level === 'Beginner' ? 'rgba(34, 197, 94, 0.2)' :
                                course.level === 'Intermediate' ? 'rgba(251, 191, 36, 0.2)' :
                                'rgba(239, 68, 68, 0.2)',
                  color: course.level === 'Beginner' ? '#22c55e' :
                         course.level === 'Intermediate' ? '#fbbf24' :
                         '#ef4444'
                }}>
                  {course.level || 'Beginner'}
                </span>

                {/* Duration */}
                <span style={{
                  ...styles.badge,
                  backgroundColor: 'rgba(59, 130, 246, 0.2)',
                  color: '#3b82f6'
                }}>
                  {course.estimated_duration_hours}h
                </span>

                {/* Category */}
                <span style={{
                  ...styles.badge,
                  backgroundColor: 'rgba(168, 85, 247, 0.2)',
                  color: '#a855f7'
                }}>
                  {course.category}
                </span>
              </div>

              {/* Course Stats */}
              <div style={styles.statsContainer}>
                <div style={styles.statsText}>
                  {course.total_modules || 0} modules • {course.total_lessons || 0} lessons
                </div>
                {course.enrollment_count !== undefined && (
                  <div style={styles.statsText}>
                    {course.enrollment_count} enrolled
                  </div>
                )}
              </div>

              {/* Enroll Button */}
              <button
                onClick={() => handleEnrollInCourse(course.id)}
                style={styles.enrollButton}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <BookOpen size={16} />
                Enroll Now
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  sectionTitle: {
    color: 'white',
    marginBottom: '15px',
    fontSize: '24px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  sectionDescription: {
    color: '#d1d5db',
    marginBottom: '20px',
    fontSize: '14px',
    lineHeight: '1.6'
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '300px'
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: '16px'
  },
  emptyState: {
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(168, 85, 247, 0.1))',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '40px',
    textAlign: 'center',
    marginTop: '20px'
  },
  emptyStateTitle: {
    color: 'white',
    fontSize: '18px',
    marginBottom: '8px'
  },
  emptyStateText: {
    color: '#9ca3af',
    fontSize: '14px'
  },
  coursesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
    marginTop: '20px'
  },
  courseCard: {
    background: 'linear-gradient(135deg, rgba(26, 28, 32, 0.95), rgba(20, 22, 26, 0.95))',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '20px',
    transition: 'all 0.3s ease',
    cursor: 'pointer'
  },
  courseIcon: {
    fontSize: '32px',
    marginBottom: '12px'
  },
  courseTitle: {
    color: 'white',
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '8px',
    lineHeight: '1.4'
  },
  courseDescription: {
    color: '#9ca3af',
    fontSize: '14px',
    lineHeight: '1.6',
    marginBottom: '16px',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden'
  },
  metadataContainer: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '16px'
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600'
  },
  statsContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '12px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    marginBottom: '16px'
  },
  statsText: {
    color: '#9ca3af',
    fontSize: '12px'
  },
  enrollButton: {
    width: '100%',
    background: 'linear-gradient(to right, #8b5cf6, #7c3aed)',
    color: 'white',
    border: 'none',
    padding: '12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  }
};

export default CoursesTab;