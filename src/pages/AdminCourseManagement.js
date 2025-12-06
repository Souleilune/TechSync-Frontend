// src/pages/AdminCourseManagement.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, Plus, Search, Filter, Edit, Trash2, Copy, 
  Eye, EyeOff, BarChart3, Users, Star, Clock 
} from 'lucide-react';
import './AdminCourseManagement.css';

function AdminCourseManagement() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    level: '',
    is_published: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  useEffect(() => {
    fetchCourses();
    fetchStats();
  }, [filters, pagination.page]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      
      // Build query params, excluding empty values
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };

      // Only add filters if they have values
      if (filters.search) params.search = filters.search;
      if (filters.category) params.category = filters.category;
      if (filters.level) params.level = filters.level;
      if (filters.is_published) params.is_published = filters.is_published;

      const queryParams = new URLSearchParams(params);

      const response = await fetch(`/api/admin/courses?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setCourses(data.data.courses);
        setPagination(prev => ({
          ...prev,
          ...data.data.pagination
        }));
      } else {
        console.error('API Error:', data.message);
        alert(data.message || 'Failed to fetch courses');
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      alert('Error fetching courses. Please check console.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/courses/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        alert('Course deleted successfully');
        fetchCourses();
        fetchStats();
      } else {
        alert(data.message || 'Failed to delete course');
      }
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('Error deleting course');
    }
  };

  const handleDuplicateCourse = async (courseId) => {
    const newTitle = prompt('Enter title for the duplicated course:');
    const newSlug = prompt('Enter slug for the duplicated course:');

    if (!newTitle || !newSlug) return;

    try {
      const response = await fetch(`/api/admin/courses/${courseId}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ new_title: newTitle, new_slug: newSlug })
      });

      const data = await response.json();
      if (data.success) {
        alert('Course duplicated successfully');
        fetchCourses();
      } else {
        alert(data.message || 'Failed to duplicate course');
      }
    } catch (error) {
      console.error('Error duplicating course:', error);
      alert('Error duplicating course');
    }
  };

  const handleTogglePublish = async (course) => {
    try {
      const response = await fetch(`/api/admin/courses/${course.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ is_published: !course.is_published })
      });

      const data = await response.json();
      if (data.success) {
        fetchCourses();
      }
    } catch (error) {
      console.error('Error toggling publish status:', error);
    }
  };

  return (
    <div className="admin-course-management">
      <div className="admin-header">
        <div>
          <h1><BookOpen className="icon" /> Course Management</h1>
          <p>Manage all courses, modules, and lessons</p>
        </div>
        <button 
          className="btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="icon" /> Create Course
        </button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <BookOpen className="stat-icon" />
            <div className="stat-content">
              <div className="stat-value">{stats.total_courses}</div>
              <div className="stat-label">Total Courses</div>
            </div>
          </div>

          <div className="stat-card">
            <Eye className="stat-icon" />
            <div className="stat-content">
              <div className="stat-value">{stats.published_courses}</div>
              <div className="stat-label">Published</div>
            </div>
          </div>

          <div className="stat-card">
            <Users className="stat-icon" />
            <div className="stat-content">
              <div className="stat-value">{stats.total_enrollments}</div>
              <div className="stat-label">Total Enrollments</div>
            </div>
          </div>

          <div className="stat-card">
            <Star className="stat-icon" />
            <div className="stat-content">
              <div className="stat-value">{stats.average_rating}</div>
              <div className="stat-label">Avg Rating</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <Search className="icon" />
          <input
            type="text"
            placeholder="Search courses..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>

        <select
          value={filters.category}
          onChange={(e) => handleFilterChange('category', e.target.value)}
        >
          <option value="">All Categories</option>
          <option value="Programming">Programming</option>
          <option value="Web Development">Web Development</option>
          <option value="Mobile Development">Mobile Development</option>
          <option value="Database">Database</option>
          <option value="DevOps">DevOps</option>
        </select>

        <select
          value={filters.level}
          onChange={(e) => handleFilterChange('level', e.target.value)}
        >
          <option value="">All Levels</option>
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
        </select>

        <select
          value={filters.is_published}
          onChange={(e) => handleFilterChange('is_published', e.target.value)}
        >
          <option value="">All Status</option>
          <option value="true">Published</option>
          <option value="false">Draft</option>
        </select>
      </div>

      {/* Courses Table */}
      <div className="courses-table-container">
        {loading ? (
          <div className="loading">Loading courses...</div>
        ) : courses.length === 0 ? (
          <div className="no-data">No courses found</div>
        ) : (
          <table className="courses-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Category</th>
                <th>Level</th>
                <th>Modules</th>
                <th>Lessons</th>
                <th>Enrollments</th>
                <th>Rating</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map(course => (
                <tr 
                  key={course.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/admin/courses/${course.id}/edit`)}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td>
                    <div className="course-info">
                      <span className="course-emoji">{course.icon_emoji || '📚'}</span>
                      <div>
                        <div className="course-title">{course.title}</div>
                        <div className="course-slug">{course.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td>{course.category}</td>
                  <td>
                    <span className={`badge badge-${course.level?.toLowerCase()}`}>
                      {course.level}
                    </span>
                  </td>
                  <td>
                    <span className={course.total_modules > 0 ? 'count-badge success' : 'count-badge'}>
                      {course.total_modules || 0}
                    </span>
                  </td>
                  <td>
                    <span className={course.total_lessons > 0 ? 'count-badge success' : 'count-badge'}>
                      {course.total_lessons || 0}
                    </span>
                  </td>
                  <td>{course.enrollment_count || 0}</td>
                  <td>
                    <div className="rating">
                      <Star className="icon-small" />
                      {course.average_rating?.toFixed(1) || '0.0'}
                    </div>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button
                      className={`status-toggle ${course.is_published ? 'published' : 'draft'}`}
                      onClick={() => handleTogglePublish(course)}
                    >
                      {course.is_published ? (
                        <><Eye className="icon-small" /> Published</>
                      ) : (
                        <><EyeOff className="icon-small" /> Draft</>
                      )}
                    </button>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="actions">
                      <button
                        className="btn-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/courses/${course.id}/edit`);
                        }}
                        title="Edit Course & Lessons"
                      >
                        <Edit className="icon" />
                      </button>
                      <button
                        className="btn-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateCourse(course.id);
                        }}
                        title="Duplicate"
                      >
                        <Copy className="icon" />
                      </button>
                      <button
                        className="btn-icon danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCourse(course.id);
                        }}
                        title="Delete"
                      >
                        <Trash2 className="icon" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={pagination.page === 1}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
          >
            Previous
          </button>
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            disabled={pagination.page === pagination.totalPages}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
          >
            Next
          </button>
        </div>
      )}

      {/* Create Course Modal */}
      {showCreateModal && (
        <CreateCourseModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchCourses();
            fetchStats();
          }}
        />
      )}
    </div>
  );
}

// Create Course Modal Component
function CreateCourseModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    short_description: '',
    level: 'Beginner',
    category: 'Programming',
    icon_emoji: '📚',
    estimated_duration_hours: 8,
    is_published: false,
    is_featured: false
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        alert('Course created successfully!');
        onSuccess();
      } else {
        alert(data.message || 'Failed to create course');
      }
    } catch (error) {
      console.error('Error creating course:', error);
      alert('Error creating course');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Course</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="course-form">
          <div className="form-group">
            <label>Course Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Slug *</label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
              placeholder="my-course-name"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="Programming">Programming</option>
                <option value="Web Development">Web Development</option>
                <option value="Mobile Development">Mobile Development</option>
                <option value="Database">Database</option>
                <option value="DevOps">DevOps</option>
              </select>
            </div>

            <div className="form-group">
              <label>Level *</label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Icon Emoji</label>
              <input
                type="text"
                value={formData.icon_emoji}
                onChange={(e) => setFormData({ ...formData, icon_emoji: e.target.value })}
                placeholder="📚"
              />
            </div>

            <div className="form-group">
              <label>Duration (hours) *</label>
              <input
                type="number"
                value={formData.estimated_duration_hours}
                onChange={(e) => setFormData({ ...formData, estimated_duration_hours: parseInt(e.target.value) })}
                min="1"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Short Description</label>
            <input
              type="text"
              value={formData.short_description}
              onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
              maxLength="500"
            />
          </div>

          <div className="form-group">
            <label>Full Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows="4"
              required
            />
          </div>

          <div className="form-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.is_published}
                onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
              />
              Publish immediately
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.is_featured}
                onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
              />
              Feature on homepage
            </label>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Creating...' : 'Create Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminCourseManagement;