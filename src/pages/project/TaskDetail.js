import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { taskService } from '../../services/taskService';
import { projectService } from '../../services/projectService';
import CommentsContainer from '../../components/Comments/CommentsContainer';
import { Code, Send, CheckCircle, AlertCircle, History, User, Clock, X, Edit2 } from 'lucide-react';

const TaskDetail = () => {
    const { projectId, taskId } = useParams();
    const navigate = useNavigate();
    
    const [task, setTask] = useState(null);
    const [project, setProject] = useState(null);
    const [projectMembers, setProjectMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [submissionHistory, setSubmissionHistory] = useState([]);
    const [loadingSubmissions, setLoadingSubmissions] = useState(false);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [showSubmissionModal, setShowSubmissionModal] = useState(false);
    

    // Use useCallback to fix dependency warnings
    const fetchTaskData = useCallback(async () => {
        try {
            const response = await taskService.getTask(projectId, taskId);
            setTask(response.data.task);
            setEditForm(response.data.task);
        } catch (error) {
            console.error('Error fetching task:', error);
            setError('Failed to load task details');
        }
    }, [projectId, taskId]);

    const fetchProjectData = useCallback(async () => {
        try {
            // Fetch project details
            const projectResponse = await projectService.getProjectById(projectId);
            setProject(projectResponse.data.project);

            // Fetch project members 
            try {
                const membersResponse = await projectService.getProjectMembers(projectId);
                setProjectMembers(membersResponse.data.members || []);
            } catch (memberError) {
                console.log('Could not fetch project members:', memberError);
                setProjectMembers([]);
            }
        } catch (error) {
            console.error('Error fetching project data:', error);
            setError('Failed to load project details');
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        if (projectId && taskId) {
            fetchTaskData();
            fetchProjectData();
            fetchSubmissions();
        }
    }, [projectId, taskId, fetchTaskData, fetchProjectData]);

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await taskService.updateTask(projectId, taskId, editForm);
            setTask(response.data.task);
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating task:', error);
            alert('Failed to update task');
        }
    };

    const fetchSubmissions = useCallback(async () => {
    try {
        setLoadingSubmissions(true);
        const response = await taskService.getTaskSubmissions(projectId, taskId);
        
        if (response && response.data && response.data.submissions) {
            setSubmissionHistory(response.data.submissions);
            console.log('✅ Loaded submissions:', response.data.submissions);
        }
    } catch (error) {
        console.error('Error fetching submissions:', error);
        // Don't show error to user, just log it
        // Submission history will show "No submissions yet"
    } finally {
        setLoadingSubmissions(false);
    }
}, [projectId, taskId]);

    const handleCodeSubmit = async (e) => {
    e.preventDefault();
    
    if (!codeSubmission.trim()) {
        setEvaluationResult({
            score: 0,
            feedback: '⚠️ Please enter your code before submitting.',
            details: { languageName: 'N/A' }
        });
        return;
    }

    try {
        setSubmitting(true);
        setEvaluationResult(null);
        
        const response = await taskService.submitTaskCode(projectId, taskId, {
            submitted_code: codeSubmission
        });

        const evaluation = response.data.data?.evaluation || response.data.evaluation;
        
        if (evaluation) {
            setEvaluationResult(evaluation);
            await fetchTaskData();
            await fetchSubmissions(); // ADD THIS - Refresh submission list
            setCodeSubmission('');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        setEvaluationResult({
            score: 0,
            feedback: `❌ ${error.response?.data?.message || 'Failed to submit'}`,
            details: { languageName: 'Error' }
        });
    } finally {
        setSubmitting(false);
    }
};

const handleViewSubmission = (submission) => {
    setSelectedSubmission(submission);
    setShowSubmissionModal(true);
};

const handleEditSubmission = (submission) => {
    setCodeSubmission(submission.submitted_code);
    setShowSubmissionModal(false);
    // Scroll to code editor
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

    

    const handleStatusChange = async (newStatus) => {
    try {
        console.log('🔄 Updating task status to:', newStatus);
        
        const response = await taskService.updateTask(projectId, taskId, {
            status: newStatus
        });

        if (response && response.data && response.data.task) {
            setTask(response.data.task);
            console.log('✅ Task status updated successfully');
            
            // ✅ LOG ACTIVITY FOR STATUS CHANGES
            try {
                let activityType = '';
                let actionText = '';
                
                if (newStatus === 'completed') {
                    activityType = 'task_completed';
                    actionText = 'completed task';
                } else if (newStatus === 'in_progress') {
                    activityType = 'task_started';
                    actionText = 'started task';
                }
                
                if (activityType) {
                    await projectService.logActivity(projectId, {
                        action: actionText,
                        target: task.title,
                        type: activityType,
                        metadata: { 
                            taskId: task.id,
                            newStatus: newStatus
                        }
                    });
                    console.log(`✅ Activity logged: ${actionText}`);
                }
            } catch (activityError) {
                console.error('Failed to log activity:', activityError);
            }
        }

    } catch (error) {
        console.error('💥 Error updating status:', error);
        alert(`Failed to update status: ${error.response?.data?.message || error.message}`);
    }
};
    const formatDate = (dateString) => {
        if (!dateString) return 'Not set';
        return new Date(dateString).toLocaleDateString();
    };

    const getStatusColor = (status) => {
        const colors = {
            'todo': '#6c757d',
            'in_progress': '#007bff',
            'in_review': '#ffc107',
            'completed': '#28a745',
            'blocked': '#dc3545'
        };
        return colors[status] || '#6c757d';
    };

    const getPriorityColor = (priority) => {
        const colors = {
            'low': '#28a745',
            'medium': '#ffc107',
            'high': '#fd7e14',
            'urgent': '#dc3545'
        };
        return colors[priority] || '#6c757d';
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <h2>Loading task details...</h2>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.errorContainer}>
                <h2>Error: {error}</h2>
                <button onClick={() => navigate(`/project/${projectId}/tasks`)}>
                    Back to Tasks
                </button>
            </div>
        );
    }

    if (!task) {
        return (
            <div style={styles.errorContainer}>
                <h2>Task not found</h2>
                <button onClick={() => navigate(`/project/${projectId}/tasks`)}>
                    Back to Tasks
                </button>
            </div>
        );
    }

    // Get project owner from project data for mentions
    const projectOwner = project ? {
        id: project.owner_id,
        full_name: project.users?.full_name,
        username: project.users?.username,
        email: project.users?.email,
        avatar_url: project.users?.avatar_url
    } : null;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button 
                    style={styles.backButton}
                    onClick={() => navigate(`/project/${projectId}/tasks`)}
                >
                    ← Back to Tasks
                </button>
                
                {!isEditing && (
                    <button
                        style={styles.editButton}
                        onClick={() => setIsEditing(true)}
                    >
                        Edit Task
                    </button>
                )}
            </div>

            <div style={styles.content}>
                <div style={styles.taskSection}>
                    {isEditing ? (
                        <form onSubmit={handleEditSubmit} style={styles.editForm}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Title *</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={editForm.title || ''}
                                    onChange={handleInputChange}
                                    style={styles.input}
                                    required
                                />
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Status</label>
                                    <select
                                        name="status"
                                        value={editForm.status || 'todo'}
                                        onChange={handleInputChange}
                                        style={styles.select}
                                    >
                                        <option value="todo">To Do</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="in_review">In Review</option>
                                        <option value="completed">Completed</option>
                                        <option value="blocked">Blocked</option>
                                    </select>
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Priority</label>
                                    <select
                                        name="priority"
                                        value={editForm.priority || 'medium'}
                                        onChange={handleInputChange}
                                        style={styles.select}
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="urgent">Urgent</option>
                                    </select>
                                </div>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Description</label>
                                <textarea
                                    name="description"
                                    value={editForm.description || ''}
                                    onChange={handleInputChange}
                                    placeholder="Describe the task..."
                                    style={styles.textarea}
                                />
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Estimated Hours</label>
                                    <input
                                        type="number"
                                        name="estimated_hours"
                                        value={editForm.estimated_hours || ''}
                                        onChange={handleInputChange}
                                        style={styles.input}
                                        min="0"
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Due Date</label>
                                    <input
                                        type="date"
                                        name="due_date"
                                        value={editForm.due_date ? 
                                            new Date(editForm.due_date).toISOString().split('T')[0] : ''}
                                        onChange={handleInputChange}
                                        style={styles.input}
                                    />
                                </div>
                            </div>

                            <div style={styles.formActions}>
                                <button type="submit" style={styles.saveButton}>
                                    Save Changes
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setIsEditing(false)}
                                    style={styles.cancelButton}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div>
                            <h1 style={styles.title}>{task.title}</h1>
                            
                            <div style={styles.metaInfo}>
                                <div style={styles.badges}>
                                    <span style={{
                                        ...styles.badge,
                                        backgroundColor: getStatusColor(task.status),
                                        color: task.status === 'in_review' ? '#000' : '#fff'
                                    }}>
                                        {task.status?.replace('_', ' ')}
                                    </span>
                                    
                                    <span style={{
                                        ...styles.badge,
                                        backgroundColor: getPriorityColor(task.priority)
                                    }}>
                                        {task.priority} priority
                                    </span>
                                </div>

                                <div style={styles.statusButtons}>
                                    <button
                                        style={{
                                            ...styles.statusButton,
                                            backgroundColor: '#6c757d'
                                        }}
                                        onClick={() => handleStatusChange('todo')}
                                    >
                                        To Do
                                    </button>
                                    <button
                                        style={{
                                            ...styles.statusButton,
                                            backgroundColor: '#007bff'
                                        }}
                                        onClick={() => handleStatusChange('in_progress')}
                                    >
                                        In Progress
                                    </button>
                                    <button
                                        style={{
                                            ...styles.statusButton,
                                            backgroundColor: '#ffc107',
                                            color: '#000'
                                        }}
                                        onClick={() => handleStatusChange('in_review')}
                                    >
                                        In Review
                                    </button>
                                    <button
                                        style={{
                                            ...styles.statusButton,
                                            backgroundColor: '#28a745'
                                        }}
                                        onClick={() => handleStatusChange('completed')}
                                    >
                                        Completed
                                    </button>
                                    <button
                                        style={{
                                            ...styles.statusButton,
                                            backgroundColor: '#dc3545'
                                        }}
                                        onClick={() => handleStatusChange('blocked')}
                                    >
                                        Blocked
                                    </button>
                                </div>
                            </div>

                            {task.description && (
                                <div style={styles.description}>
                                    <h3>Description</h3>
                                    <p style={styles.descriptionText}>{task.description}</p>
                                </div>
                            )}

                            <div style={styles.taskMeta}>
                                <div style={styles.metaItem}>
                                    <strong>Task Type:</strong> {task.task_type || 'Development'}
                                </div>
                                <div style={styles.metaItem}>
                                    <strong>Created:</strong> {formatDate(task.created_at)}
                                </div>
                                {task.due_date && (
                                    <div style={styles.metaItem}>
                                        <strong>Due Date:</strong> {formatDate(task.due_date)}
                                    </div>
                                )}
                                {task.estimated_hours && (
                                    <div style={styles.metaItem}>
                                        <strong>Estimated Hours:</strong> {task.estimated_hours}
                                    </div>
                                )}
                                {task.assigned_user && (
                                    <div style={styles.metaItem}>
                                        <strong>Assigned to:</strong> {task.assigned_user.full_name}
                                    </div>
                                )}
                                {task.creator && (
                                    <div style={styles.metaItem}>
                                        <strong>Created by:</strong> {task.creator.full_name}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <div style={{
    ...styles.description,
    marginTop: '24px'
}}>

                    <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '16px'
    }}>
        <Code size={20} style={{ color: '#00D4FF' }} />
        <h3 style={{ margin: 0, color: '#00D4FF'}}>Submit Your Code</h3>
    </div>

    <form onSubmit={handleCodeSubmit}>
        <div style={{
            marginBottom: '16px'
        }}>
            <textarea
                value={codeSubmission}
                onChange={(e) => setCodeSubmission(e.target.value)}
                placeholder="Paste your code here... The system will provide syntax guidance based on the project's programming language."
                style={{
                    width: '100%',
                    minHeight: '300px',
                    padding: '16px',
                    backgroundColor: '#1a1d24',
                    border: '1px solid #30363d',
                    borderRadius: '8px',
                    color: '#e6edf3',
                    fontSize: '14px',
                    fontFamily: 'Monaco, Courier, monospace',
                    resize: 'vertical',
                    lineHeight: '1.6'
                }}
                disabled={submitting}
            />
        </div>

        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
        }}>
            <button
                type="submit"
                disabled={submitting || !codeSubmission.trim()}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    backgroundColor: submitting || !codeSubmission.trim() ? '#444' : '#00D4FF',
                    color: submitting || !codeSubmission.trim() ? '#888' : '#0F1116',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: submitting || !codeSubmission.trim() ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease'
                }}
            >
                <Send size={16} />
                {submitting ? 'Evaluating...' : 'Submit Code'}
            </button>

            <div style={{
                fontSize: '12px',
                color: '#8b949e',
                flex: 1
            }}>
                <AlertCircle size={14} style={{ display: 'inline', marginRight: '4px' }} />
                Code will be evaluated for syntax compliance - it will NOT reject your submission, only provide quality feedback.
            </div>
        </div>
    </form>

    {/* Evaluation Result Display */}
    {evaluationResult && (
        <div style={{
            marginTop: '20px',
            padding: '16px',
            backgroundColor: evaluationResult.score >= 70 ? 'rgba(46, 160, 67, 0.1)' : 'rgba(248, 113, 113, 0.1)',
            border: `1px solid ${evaluationResult.score >= 70 ? '#2ea043' : '#f87171'}`,
            borderRadius: '8px'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px'
            }}>
                {evaluationResult.score >= 70 ? (
                    <CheckCircle size={20} style={{ color: '#2ea043' }} />
                ) : (
                    <AlertCircle size={20} style={{ color: '#f87171' }} />
                )}
                <h4 style={{
                    margin: 0,
                    color: evaluationResult.score >= 70 ? '#2ea043' : '#f87171'
                }}>
                    Code Quality Score: {evaluationResult.score}/100
                </h4>
            </div>
            
            <p style={{
                margin: '8px 0',
                fontSize: '14px',
                lineHeight: '1.6',
                color: '#e6edf3'
            }}>
                {evaluationResult.feedback}
            </p>

            {evaluationResult.details && (
                <div style={{
                    marginTop: '12px',
                    fontSize: '13px',
                    color: '#8b949e'
                }}>
                    <div><strong>Language:</strong> {evaluationResult.details.languageName}</div>
                    {evaluationResult.details.foundFeatures && evaluationResult.details.foundFeatures.length > 0 && (
                        <div style={{ marginTop: '8px' }}>
                            <strong>Strengths Found:</strong>
                            <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                                {evaluationResult.details.foundFeatures.slice(0, 5).map((feature, index) => (
                                    <li key={index}>{feature}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    )}
</div>

<div style={{
    marginTop: '32px',
    padding: '24px',
    backgroundColor: '#1a1d24',
    borderRadius: '12px',
    border: '1px solid #30363d'
}}>
    <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '16px'
    }}>
        <History size={20} style={{ color: '#00D4FF' }} />
        <h3 style={{ margin: 0, color: '#e6edf3' }}>Submission History</h3>
        <span style={{
            marginLeft: 'auto',
            fontSize: '14px',
            color: '#8b949e'
        }}>
            {submissionHistory.length} {submissionHistory.length === 1 ? 'submission' : 'submissions'}
        </span>
    </div>

    {loadingSubmissions ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#8b949e' }}>
            Loading submissions...
        </div>
    ) : submissionHistory.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#8b949e' }}>
            No submissions yet. Be the first to submit code!
        </div>
    ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {submissionHistory.map((submission) => (
                <div
                    key={submission.id}
                    style={{
                        padding: '16px',
                        backgroundColor: '#0d1117',
                        border: '1px solid #30363d',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#00D4FF';
                        e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#30363d';
                        e.currentTarget.style.transform = 'translateX(0)';
                    }}
                    onClick={() => handleViewSubmission(submission)}
                >
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '8px'
                    }}>
                        <div style={{ flex: 1 }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '4px'
                            }}>
                                <User size={16} style={{ color: '#8b949e' }} />
                                <span style={{
                                    color: '#e6edf3',
                                    fontWeight: '600',
                                    fontSize: '14px'
                                }}>
                                    {submission.users?.full_name || submission.users?.username || 'Unknown User'}
                                </span>
                            </div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '12px',
                                color: '#8b949e'
                            }}>
                                <Clock size={14} />
                                {formatDateTime(submission.submitted_at)}
                            </div>
                        </div>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            {submission.automated_review_score !== null && (
                                <div style={{
                                    padding: '4px 12px',
                                    backgroundColor: submission.automated_review_score >= 70 
                                        ? 'rgba(46, 160, 67, 0.1)' 
                                        : 'rgba(248, 113, 113, 0.1)',
                                    border: `1px solid ${submission.automated_review_score >= 70 ? '#2ea043' : '#f87171'}`,
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: submission.automated_review_score >= 70 ? '#2ea043' : '#f87171'
                                }}>
                                    Score: {submission.automated_review_score}
                                </div>
                            )}
                            
                            <div style={{
                                padding: '4px 12px',
                                backgroundColor: submission.status === 'approved' 
                                    ? 'rgba(46, 160, 67, 0.1)' 
                                    : submission.status === 'rejected'
                                    ? 'rgba(248, 113, 113, 0.1)'
                                    : 'rgba(255, 193, 7, 0.1)',
                                border: `1px solid ${
                                    submission.status === 'approved' 
                                        ? '#2ea043' 
                                        : submission.status === 'rejected'
                                        ? '#f87171'
                                        : '#ffc107'
                                }`,
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: submission.status === 'approved' 
                                    ? '#2ea043' 
                                    : submission.status === 'rejected'
                                    ? '#f87171'
                                    : '#ffc107',
                                textTransform: 'capitalize'
                            }}>
                                {submission.status}
                            </div>
                        </div>
                    </div>

                    <div style={{
                        marginTop: '8px',
                        padding: '8px',
                        backgroundColor: '#161b22',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: '#8b949e',
                        fontFamily: 'Monaco, Courier, monospace',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {submission.submitted_code.substring(0, 100)}...
                    </div>
                </div>
            ))}
        </div>
    )}
</div>

{/* Submission Detail Modal */}
{showSubmissionModal && selectedSubmission && (
    <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
    }}
    onClick={() => setShowSubmissionModal(false)}
    >
        <div style={{
            backgroundColor: '#0d1117',
            borderRadius: '12px',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            border: '1px solid #30363d'
        }}
        onClick={(e) => e.stopPropagation()}
        >
            {/* Modal Header */}
            <div style={{
                padding: '20px 24px',
                borderBottom: '1px solid #30363d',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'sticky',
                top: 0,
                backgroundColor: '#0d1117',
                zIndex: 1
            }}>
                <div>
                    <h3 style={{ margin: 0, color: '#e6edf3', marginBottom: '4px' }}>
                        Code Submission
                    </h3>
                    <div style={{ fontSize: '14px', color: '#8b949e' }}>
                        By {selectedSubmission.users?.full_name || 'Unknown'} • {formatDateTime(selectedSubmission.submitted_at)}
                    </div>
                </div>
                <button
                    onClick={() => setShowSubmissionModal(false)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#8b949e',
                        cursor: 'pointer',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <X size={24} />
                </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
                {/* Score and Status */}
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginBottom: '20px',
                    flexWrap: 'wrap'
                }}>
                    {selectedSubmission.automated_review_score !== null && (
                        <div style={{
                            padding: '12px 16px',
                            backgroundColor: selectedSubmission.automated_review_score >= 70 
                                ? 'rgba(46, 160, 67, 0.1)' 
                                : 'rgba(248, 113, 113, 0.1)',
                            border: `1px solid ${selectedSubmission.automated_review_score >= 70 ? '#2ea043' : '#f87171'}`,
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: selectedSubmission.automated_review_score >= 70 ? '#2ea043' : '#f87171'
                        }}>
                            Quality Score: {selectedSubmission.automated_review_score}/100
                        </div>
                    )}
                    
                    <div style={{
                        padding: '12px 16px',
                        backgroundColor: 'rgba(255, 193, 7, 0.1)',
                        border: '1px solid #ffc107',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#ffc107',
                        textTransform: 'capitalize'
                    }}>
                        Status: {selectedSubmission.status}
                    </div>
                </div>

                {/* Feedback */}
                {selectedSubmission.automated_feedback && (
                    <div style={{
                        marginBottom: '20px',
                        padding: '16px',
                        backgroundColor: '#161b22',
                        borderRadius: '8px',
                        border: '1px solid #30363d'
                    }}>
                        <h4 style={{ margin: '0 0 8px 0', color: '#e6edf3', fontSize: '14px' }}>
                            Automated Feedback
                        </h4>
                        <p style={{ margin: 0, color: '#8b949e', fontSize: '14px', lineHeight: '1.6' }}>
                            {selectedSubmission.automated_feedback}
                        </p>
                    </div>
                )}

                {/* Code */}
                <div style={{
                    marginBottom: '20px'
                }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#e6edf3', fontSize: '14px' }}>
                        Submitted Code
                    </h4>
                    <pre style={{
                        margin: 0,
                        padding: '16px',
                        backgroundColor: '#161b22',
                        borderRadius: '8px',
                        border: '1px solid #30363d',
                        color: '#e6edf3',
                        fontSize: '13px',
                        fontFamily: 'Monaco, Courier, monospace',
                        overflow: 'auto',
                        maxHeight: '400px',
                        lineHeight: '1.6'
                    }}>
{selectedSubmission.submitted_code}
                    </pre>
                </div>

                {/* Actions */}
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'flex-end'
                }}>
                    <button
                        onClick={() => handleEditSubmission(selectedSubmission)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            backgroundColor: '#00D4FF',
                            color: '#0F1116',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        <Edit2 size={16} />
                        Load into Editor
                    </button>
                    <button
                        onClick={() => setShowSubmissionModal(false)}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#21262d',
                            color: '#e6edf3',
                            border: '1px solid #30363d',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    </div>
)}

                {/* Comments Section */}
                <div style={styles.commentsSection}>
                    <CommentsContainer 
                        taskId={taskId}
                        projectMembers={projectMembers}
                        projectOwner={projectOwner}
                    />
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: {
        padding: '20px',
        maxWidth: '1200px',
        margin: '0 auto'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid #e1e5e9'
    },
    backButton: {
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px'
    },
    editButton: {
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px'
    },
    content: {
        display: 'grid',
        gap: '32px'
    },
    taskSection: {
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '8px',
        border: '1px solid #e1e5e9',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    commentsSection: {
        // Comments container will have its own styling
    },
    title: {
        fontSize: '32px',
        fontWeight: '600',
        color: '#2c3e50',
        margin: '0 0 16px 0'
    },
    metaInfo: {
        marginBottom: '24px'
    },
    badges: {
        display: 'flex',
        gap: '8px',
        marginBottom: '16px'
    },
    badge: {
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        textTransform: 'uppercase'
    },
    statusButtons: {
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap'
    },
    statusButton: {
        color: 'white',
        border: 'none',
        padding: '6px 12px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: '500'
    },
    description: {
        marginBottom: '24px'
    },
    descriptionText: {
        lineHeight: '1.6',
        color: '#495057',
        fontSize: '16px',
        whiteSpace: 'pre-wrap'
    },
    taskMeta: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '12px',
        backgroundColor: '#f8f9fa',
        padding: '16px',
        borderRadius: '6px'
    },
    metaItem: {
        fontSize: '14px',
        color: '#495057'
    },
    // Edit form styles
    editForm: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column'
    },
    formRow: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px'
    },
    label: {
        marginBottom: '5px',
        fontWeight: '500',
        color: '#333'
    },
    input: {
        padding: '10px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '14px'
    },
    textarea: {
        padding: '10px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '14px',
        resize: 'vertical',
        minHeight: '100px'
    },
    select: {
        padding: '10px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '14px'
    },
    formActions: {
        display: 'flex',
        gap: '12px',
        justifyContent: 'flex-end'
    },
    saveButton: {
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        padding: '10px 20px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px'
    },
    cancelButton: {
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        padding: '10px 20px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px'
    },
    loadingContainer: {
        textAlign: 'center',
        padding: '60px',
        color: '#6c757d'
    },
    errorContainer: {
        textAlign: 'center',
        padding: '60px',
        color: '#dc3545'
    }
};

export default TaskDetail;