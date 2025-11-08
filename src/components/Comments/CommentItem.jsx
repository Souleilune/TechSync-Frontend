import React, { useState, useEffect, useCallback } from 'react';
import CommentItem from './CommentItem';
import CommentForm from './CommentForm';
import LoadingSpinner from '../UI/LoadingSpinner';

// ✅ FIX: Get API URL from environment variable
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const CommentReplies = ({ 
    parentCommentId, 
    taskId,
    projectMembers,
    projectOwner = null,
    currentUser, 
    onCommentUpdated, 
    onCommentDeleted,
    showReplyForm,
    onReplyFormToggle
}) => {
    const [replies, setReplies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchReplies = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // ✅ FIX: Use full API URL instead of relative path
            const response = await fetch(`${API_URL}/comments/${parentCommentId}/replies`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch replies');
            }

            setReplies(data.replies);

        } catch (error) {
            console.error('Error fetching replies:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }, [parentCommentId]);

    useEffect(() => {
        fetchReplies();
    }, [fetchReplies]);

    const handleReplyCreated = (newReply) => {
        setReplies(prev => [...prev, newReply]);
        onReplyFormToggle(false);
    };

    const handleReplyUpdated = (updatedReply) => {
        setReplies(prev => prev.map(reply => 
            reply.id === updatedReply.id ? updatedReply : reply
        ));
        if (onCommentUpdated) {
            onCommentUpdated(updatedReply);
        }
    };

    const handleReplyDeleted = (replyId) => {
        setReplies(prev => prev.filter(reply => reply.id !== replyId));
        if (onCommentDeleted) {
            onCommentDeleted(replyId);
        }
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    if (error) {
        return (
            <div className="replies-error">
                <p>Error loading replies: {error}</p>
            </div>
        );
    }

    return (
        <div className="comment-replies">
            {showReplyForm && (
                <CommentForm
                    taskId={taskId}
                    parentCommentId={parentCommentId}
                    projectMembers={projectMembers}
                    projectOwner={projectOwner}
                    onCommentCreated={handleReplyCreated}
                    onCancel={() => onReplyFormToggle(false)}
                    placeholder="Write a reply..."
                    submitButtonText="Reply"
                />
            )}

            {replies.length > 0 && (
                <div className="replies-list">
                    {replies.map(reply => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            taskId={taskId}
                            projectMembers={projectMembers}
                            projectOwner={projectOwner}
                            currentUser={currentUser}
                            onCommentUpdated={handleReplyUpdated}
                            onCommentDeleted={handleReplyDeleted}
                            isReply={true}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default CommentReplies;