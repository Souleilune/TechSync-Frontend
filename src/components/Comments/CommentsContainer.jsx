import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import CommentsList from './CommentsList';
import CommentForm from './CommentForm';
import LoadingSpinner from '../UI/LoadingSpinner';
import './Comments.css';

// ✅ FIX: Get API URL from environment variable
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const CommentsContainer = ({ taskId, projectMembers = [], projectOwner = null }) => {
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
    });
    const [error, setError] = useState(null);
    const { user } = useAuth();
    const commentsEndRef = useRef(null);

    const fetchComments = useCallback(async (page = 1) => {
        try {
            setLoading(true);
            setError(null);

            // ✅ FIX: Use full API URL instead of relative path
            const response = await fetch(
                `${API_URL}/comments/task/${taskId}?page=${page}&limit=${pagination.limit}`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch comments');
            }

            if (page === 1) {
                setComments(data.comments || []);
            } else {
                setComments(prev => [...prev, ...(data.comments || [])]);
            }
            
            setPagination(data.pagination || {
                page: parseInt(page),
                limit: parseInt(pagination.limit),
                total: 0,
                pages: 0
            });

        } catch (error) {
            console.error('Error fetching comments:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }, [taskId, pagination.limit]);

    useEffect(() => {
        if (taskId) {
            fetchComments();
        }
    }, [taskId, fetchComments]);

    const handleCommentCreated = (newComment) => {
        console.log('📥 New comment received:', newComment);
        setComments(prev => [newComment, ...prev]);
        setPagination(prev => ({
            ...prev,
            total: prev.total + 1
        }));
        
        scrollToTop();
    };

    const handleCommentUpdated = (updatedComment) => {
        setComments(prev => prev.map(comment => 
            comment.id === updatedComment.id ? updatedComment : comment
        ));
    };

    const handleCommentDeleted = (commentId) => {
        setComments(prev => prev.filter(comment => comment.id !== commentId));
        setPagination(prev => ({
            ...prev,
            total: Math.max(0, prev.total - 1)
        }));
    };

    const loadMoreComments = () => {
        if (pagination.page < pagination.pages && !loading) {
            fetchComments(pagination.page + 1);
        }
    };

    const scrollToTop = () => {
        if (commentsEndRef.current) {
            commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    if (loading && comments.length === 0) {
        return (
            <div className="comments-container">
                <div className="comments-header">
                    <h3>Comments</h3>
                </div>
                <div className="loading-container">
                    <LoadingSpinner />
                </div>
            </div>
        );
    }

    return (
        <div className="comments-container">
            <div className="comments-header">
                <h3>Comments ({pagination.total})</h3>
            </div>

            {error && (
                <div className="error-message">
                    <p>{error}</p>
                    <button onClick={() => fetchComments()} className="btn-secondary">
                        Try Again
                    </button>
                </div>
            )}

            <CommentForm
                taskId={taskId}
                projectMembers={projectMembers}
                projectOwner={projectOwner}
                onCommentCreated={handleCommentCreated}
                placeholder="Add a comment..."
            />

            <div ref={commentsEndRef} />

            {comments.length > 0 ? (
                <>
                    <CommentsList
                        comments={comments}
                        taskId={taskId}
                        projectMembers={projectMembers}
                        projectOwner={projectOwner}
                        currentUser={user}
                        onCommentUpdated={handleCommentUpdated}
                        onCommentDeleted={handleCommentDeleted}
                    />

                    {pagination.page < pagination.pages && (
                        <div className="load-more-container">
                            <button
                                onClick={loadMoreComments}
                                disabled={loading}
                                className="btn-secondary"
                            >
                                {loading ? 'Loading...' : 'Load More Comments'}
                            </button>
                        </div>
                    )}
                </>
            ) : (
                !loading && (
                    <div className="no-comments">
                        <p>No comments yet. Be the first to comment!</p>
                    </div>
                )
            )}
        </div>
    );
};

export default CommentsContainer;