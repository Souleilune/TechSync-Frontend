// src/pages/AdminCourseEditor.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Edit, Trash2, Save, BookOpen, 
  FileText, Video, Code, CheckSquare, ChevronDown, 
  ChevronRight, Clock, Eye, EyeOff 
} from 'lucide-react';
import './AdminCourseEditor.css';

function AdminCourseEditor() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState(new Set());
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);

  useEffect(() => {
    if (courseId) {
      fetchCourseDetails();
    }
  }, [courseId]);

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setCourse(data.data);
        setModules(data.data.course_modules || []);
      }
    } catch (error) {
      console.error('Error fetching course:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (moduleId) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const handleDeleteModule = async (moduleId) => {
    if (!window.confirm('Delete this module and all its lessons?')) return;

    try {
      const response = await fetch(`/api/admin/courses/modules/${moduleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        fetchCourseDetails();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error deleting module:', error);
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    if (!window.confirm('Delete this lesson?')) return;

    try {
      const response = await fetch(`/api/admin/courses/lessons/${lessonId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        fetchCourseDetails();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error deleting lesson:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading course...</div>;
  }

  if (!course) {
    return <div className="error">Course not found</div>;
  }

  return (
    <div className="admin-course-editor">
      <div className="editor-header">
        <button className="back-btn" onClick={() => navigate('/admin/courses')}>
          <ArrowLeft className="icon" /> Back to Courses
        </button>

        <div className="course-header-info">
          <h1>
            <span className="course-emoji">{course.icon_emoji}</span>
            {course.title}
          </h1>
          <div className="course-meta">
            <span className={`badge badge-${course.level?.toLowerCase()}`}>
              {course.level}
            </span>
            <span className="meta-item">
              <BookOpen className="icon" /> {course.total_modules || 0} Modules
            </span>
            <span className="meta-item">
              <FileText className="icon" /> {course.total_lessons || 0} Lessons
            </span>
            <span className="meta-item">
              <Clock className="icon" /> {course.estimated_duration_hours}h
            </span>
            <span className={`status-badge ${course.is_published ? 'published' : 'draft'}`}>
              {course.is_published ? <><Eye className="icon" /> Published</> : <><EyeOff className="icon" /> Draft</>}
            </span>
          </div>
        </div>

        <button 
          className="btn-primary"
          onClick={() => {
            setSelectedModule(null);
            setShowModuleModal(true);
          }}
        >
          <Plus className="icon" /> Add Module
        </button>
      </div>

      {/* Quick Action Tips */}
      {modules.length === 0 && (
        <div className="quick-tips">
          <h3>🚀 Quick Start Guide</h3>
          <ol>
            <li>Click "Add Module" to create Week 1</li>
            <li>Add lessons to each module</li>
            <li>Publish modules when ready</li>
            <li>Repeat for all 8 weeks</li>
          </ol>
        </div>
      )}

      {/* Course Progress */}
      {modules.length > 0 && (
        <div className="course-progress-card">
          <div className="progress-header">
            <h3>Course Progress</h3>
            <span className="progress-percentage">
              {Math.round((modules.length / 8) * 100)}% Complete
            </span>
          </div>
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${Math.min((modules.length / 8) * 100, 100)}%` }}
            />
          </div>
          <div className="progress-stats">
            <div className="progress-stat">
              <span className="stat-number">{modules.length}</span>
              <span className="stat-label">Modules</span>
            </div>
            <div className="progress-stat">
              <span className="stat-number">{course.total_lessons || 0}</span>
              <span className="stat-label">Lessons</span>
            </div>
            <div className="progress-stat">
              <span className="stat-number">
                {modules.filter(m => m.is_published).length}
              </span>
              <span className="stat-label">Published</span>
            </div>
            <div className="progress-stat">
              <span className="stat-number">{course.estimated_duration_hours}h</span>
              <span className="stat-label">Duration</span>
            </div>
          </div>
        </div>
      )}

      <div className="modules-list">
        {modules.length === 0 ? (
          <div className="no-modules">
            <BookOpen className="icon-large" />
            <h3>No modules yet</h3>
            <p>Get started by creating your first module (Week 1)</p>
            <button 
              className="btn-primary"
              onClick={() => {
                setSelectedModule(null);
                setShowModuleModal(true);
              }}
            >
              <Plus className="icon" /> Create First Module
            </button>
            <div className="help-text">
              <p><strong>💡 Tip:</strong> For an 8-week course, create 8 modules</p>
              <p>Each module can contain multiple lessons (text, video, coding exercises, quizzes)</p>
            </div>
          </div>
        ) : (
          modules
            .sort((a, b) => a.order_index - b.order_index)
            .map((module, index) => (
              <div key={module.id} className="module-card">
                <div className="module-header">
                  <button
                    className="expand-btn"
                    onClick={() => toggleModule(module.id)}
                  >
                    {expandedModules.has(module.id) ? (
                      <ChevronDown className="icon" />
                    ) : (
                      <ChevronRight className="icon" />
                    )}
                  </button>

                  <div className="module-info">
                    <div className="module-title">
                      <span className="module-number">Week {index + 1}</span>
                      <h3>{module.title}</h3>
                    </div>
                    {module.description && (
                      <p className="module-description">{module.description}</p>
                    )}
                    <div className="module-meta">
                      <span>{module.course_lessons?.length || 0} lessons</span>
                      {module.estimated_duration_minutes && (
                        <span>{module.estimated_duration_minutes} min</span>
                      )}
                      {module.is_published ? (
                        <span className="status-published"><Eye className="icon-small" /> Published</span>
                      ) : (
                        <span className="status-draft"><EyeOff className="icon-small" /> Draft</span>
                      )}
                    </div>
                  </div>

                  <div className="module-actions">
                    <button
                      className="btn-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedModule(module);
                        setShowModuleModal(true);
                      }}
                      title="Edit Module"
                    >
                      <Edit className="icon" />
                    </button>
                    <button
                      className="btn-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedModule(module);
                        setSelectedLesson(null);
                        setShowLessonModal(true);
                      }}
                      title="Add Lesson"
                    >
                      <Plus className="icon" />
                    </button>
                    <button
                      className="btn-icon danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteModule(module.id);
                      }}
                      title="Delete Module"
                    >
                      <Trash2 className="icon" />
                    </button>
                  </div>
                </div>

                {expandedModules.has(module.id) && (
                  <div className="lessons-list">
                    {module.course_lessons && module.course_lessons.length > 0 ? (
                      module.course_lessons
                        .sort((a, b) => a.order_index - b.order_index)
                        .map((lesson, lessonIndex) => (
                          <div key={lesson.id} className="lesson-item">
                            <div className="lesson-icon">
                              {lesson.lesson_type === 'video' && <Video className="icon" />}
                              {lesson.lesson_type === 'text' && <FileText className="icon" />}
                              {lesson.lesson_type === 'coding' && <Code className="icon" />}
                              {lesson.lesson_type === 'quiz' && <CheckSquare className="icon" />}
                            </div>

                            <div className="lesson-info">
                              <div className="lesson-title">
                                <span className="lesson-number">{lessonIndex + 1}.</span>
                                {lesson.title}
                              </div>
                              <div className="lesson-meta">
                                <span className={`lesson-type lesson-type-${lesson.lesson_type}`}>
                                  {lesson.lesson_type}
                                </span>
                                {lesson.estimated_duration_minutes && (
                                  <span><Clock className="icon-tiny" /> {lesson.estimated_duration_minutes} min</span>
                                )}
                                {lesson.is_free && (
                                  <span className="free-badge">FREE</span>
                                )}
                              </div>
                            </div>

                            <div className="lesson-actions">
                              <button
                                className="btn-icon-small"
                                onClick={() => {
                                  setSelectedModule(module);
                                  setSelectedLesson(lesson);
                                  setShowLessonModal(true);
                                }}
                                title="Edit Lesson"
                              >
                                <Edit className="icon" />
                              </button>
                              <button
                                className="btn-icon-small danger"
                                onClick={() => handleDeleteLesson(lesson.id)}
                                title="Delete Lesson"
                              >
                                <Trash2 className="icon" />
                              </button>
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="no-lessons">
                        <p>No lessons yet. Add your first lesson to this module.</p>
                        <button
                          className="btn-secondary"
                          onClick={() => {
                            setSelectedModule(module);
                            setSelectedLesson(null);
                            setShowLessonModal(true);
                          }}
                        >
                          <Plus className="icon" /> Add Lesson
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
        )}
      </div>

      {/* Modals */}
      {showModuleModal && (
        <ModuleModal
          courseId={courseId}
          module={selectedModule}
          onClose={() => {
            setShowModuleModal(false);
            setSelectedModule(null);
          }}
          onSuccess={() => {
            setShowModuleModal(false);
            setSelectedModule(null);
            fetchCourseDetails();
          }}
        />
      )}

      {showLessonModal && (
        <LessonModal
          module={selectedModule}
          lesson={selectedLesson}
          onClose={() => {
            setShowLessonModal(false);
            setSelectedModule(null);
            setSelectedLesson(null);
          }}
          onSuccess={() => {
            setShowLessonModal(false);
            setSelectedModule(null);
            setSelectedLesson(null);
            fetchCourseDetails();
          }}
        />
      )}
    </div>
  );
}

// Module Modal Component
function ModuleModal({ courseId, module, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: module?.title || '',
    description: module?.description || '',
    order_index: module?.order_index || 0,
    estimated_duration_minutes: module?.estimated_duration_minutes || 0,
    is_published: module?.is_published ?? true
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Ensure numbers are properly formatted
      const submitData = {
        ...formData,
        order_index: parseInt(formData.order_index) || 0,
        estimated_duration_minutes: parseInt(formData.estimated_duration_minutes) || 0
      };

      const url = module
        ? `/api/admin/courses/modules/${module.id}`
        : `/api/admin/courses/${courseId}/modules`;

      const response = await fetch(url, {
        method: module ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(submitData)
      });

      const data = await response.json();
      if (data.success) {
        onSuccess();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error saving module:', error);
      alert('Error saving module');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{module ? 'Edit Module' : 'Create New Module'}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Module Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Setting up Development Environment"
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of what this module covers"
              rows="3"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Order Index *</label>
              <input
                type="number"
                value={formData.order_index}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  order_index: e.target.value === '' ? '' : parseInt(e.target.value) || 0
                })}
                min="0"
                required
              />
            </div>

            <div className="form-group">
              <label>Duration (minutes)</label>
              <input
                type="number"
                value={formData.estimated_duration_minutes}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  estimated_duration_minutes: e.target.value === '' ? '' : parseInt(e.target.value) || 0
                })}
                min="0"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.is_published}
                onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
              />
              Publish module
            </label>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              <Save className="icon" /> {submitting ? 'Saving...' : 'Save Module'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Lesson Modal Component
function LessonModal({ module, lesson, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: lesson?.title || '',
    description: lesson?.description || '',
    content: lesson?.content || '',
    lesson_type: lesson?.lesson_type || 'text',
    video_url: lesson?.video_url || '',
    code_template: lesson?.code_template || '',
    order_index: lesson?.order_index || 0,
    estimated_duration_minutes: lesson?.estimated_duration_minutes || 0,
    is_free: lesson?.is_free ?? false,
    is_published: lesson?.is_published ?? true
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Ensure numbers are properly formatted
      const submitData = {
        ...formData,
        order_index: parseInt(formData.order_index) || 0,
        estimated_duration_minutes: parseInt(formData.estimated_duration_minutes) || 0
      };

      const url = lesson
        ? `/api/admin/courses/lessons/${lesson.id}`
        : `/api/admin/courses/modules/${module.id}/lessons`;

      const response = await fetch(url, {
        method: lesson ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(submitData)
      });

      const data = await response.json();
      if (data.success) {
        onSuccess();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error saving lesson:', error);
      alert('Error saving lesson');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{lesson ? 'Edit Lesson' : 'Create New Lesson'}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Lesson Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Installing Node.js and Setting up Environment"
              required
            />
          </div>

          <div className="form-group">
            <label>Short Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the lesson"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Lesson Type *</label>
              <select
                value={formData.lesson_type}
                onChange={(e) => setFormData({ ...formData, lesson_type: e.target.value })}
              >
                <option value="text">Text</option>
                <option value="video">Video</option>
                <option value="coding">Coding Exercise</option>
                <option value="quiz">Quiz</option>
                <option value="project">Project</option>
              </select>
            </div>

            <div className="form-group">
              <label>Duration (minutes) *</label>
              <input
                type="number"
                value={formData.estimated_duration_minutes}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  estimated_duration_minutes: e.target.value === '' ? '' : parseInt(e.target.value) || 0
                })}
                min="1"
                required
              />
            </div>

            <div className="form-group">
              <label>Order Index *</label>
              <input
                type="number"
                value={formData.order_index}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  order_index: e.target.value === '' ? '' : parseInt(e.target.value) || 0
                })}
                min="0"
                required
              />
            </div>
          </div>

          {formData.lesson_type === 'video' && (
            <div className="form-group">
              <label>Video URL</label>
              <input
                type="url"
                value={formData.video_url}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
          )}

          {formData.lesson_type === 'coding' && (
            <div className="form-group">
              <label>Code Template</label>
              <textarea
                value={formData.code_template}
                onChange={(e) => setFormData({ ...formData, code_template: e.target.value })}
                placeholder="// Starting code for the exercise"
                rows="6"
                style={{ fontFamily: 'monospace' }}
              />
            </div>
          )}

          <div className="form-group">
            <label>Lesson Content (Markdown) *</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Write your lesson content here in Markdown format..."
              rows="12"
              required
            />
            <small>Supports Markdown formatting</small>
          </div>

          <div className="form-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.is_free}
                onChange={(e) => setFormData({ ...formData, is_free: e.target.checked })}
              />
              Free preview lesson
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.is_published}
                onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
              />
              Publish lesson
            </label>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              <Save className="icon" /> {submitting ? 'Saving...' : 'Save Lesson'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminCourseEditor;