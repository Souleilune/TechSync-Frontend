import React, { useState } from 'react';
import MentionInput from './MentionInput';
import CommentReplies from './CommentReplies';

// ✅ FIX: Get API URL from environment variable
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const CommentItem = ({ 
    comment, 
    taskId,
    projectMembers, 
    projectOwner = null,
    currentUser, 
    onCommentUpdated, 
    onCommentDeleted,
    isReply = false
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [showReplies, setShowReplies] = useState(false);
    const [showReplyForm, setShowReplyForm] = useState(false);

    // ✅ CRITICAL: Validate comment has required data
    if (!comment || !comment.id) {
        console.error('❌ CommentItem: Invalid comment data', comment);
        return null;
    }

    const isAuthor = currentUser && comment.user_id === currentUser.id;

    const handleEditClick = () => {
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
    };

    const handleSaveEdit = async (newContent, newMentions) => {
        try {
            const response = await fetch(`${API_URL}/comments/${comment.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    content: newContent,
                    mentions: newMentions
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update comment');
            }

            onCommentUpdated(data.comment);
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating comment:', error);
            alert('Failed to update comment');
        }
    };

    const handleDeleteClick = async () => {
        if (!window.confirm('Are you sure you want to delete this comment?')) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/comments/${comment.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete comment');
            }

            onCommentDeleted(comment.id);
        } catch (error) {
            console.error('Error deleting comment:', error);
            alert('Failed to delete comment');
        }
    };

    const handleReplyClick = () => {
        setShowReplyForm(!showReplyForm);
        if (!showReplyForm) {
            setShowReplies(true);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return date.toLocaleDateString();
    };

    const getAuthorName = (userId) => {
        if (!userId) return 'Unknown User';
        
        // Try comment.author first (from backend)
        if (comment.author) {
            return comment.author.full_name || comment.author.username || 'User';
        }
        
        // Check if it's the project owner
        if (projectOwner && projectOwner.id === userId) {
            return projectOwner.full_name || projectOwner.username || 'Project Owner';
        }
        
        // Check in project members
        const member = projectMembers.find(m => m.users?.id === userId);
        if (member) {
            return member.users.full_name || member.users.username || 'Team Member';
        }
        
        return 'User';
    };

    const getAuthorRole = (userId) => {
        if (!userId) return 'member';
        
        if (projectOwner && projectOwner.id === userId) {
            return 'owner';
        }
        
        const member = projectMembers.find(m => m.users?.id === userId);
        return member ? member.role : 'member';
    };

    // ✅ CRITICAL: Validate UUID format before rendering CommentReplies
    const isValidUUID = (id) => {
        if (!id) return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(id);
    };

    const shouldShowReplies = (showReplies || showReplyForm) && 
                              !isReply && 
                              comment.id && 
                              isValidUUID(comment.id);

    if (isEditing) {
        return (
            <div className={`comment-item ${isReply ? 'comment-reply' : ''}`}>
                <EditCommentForm
                    initialContent={comment.content}
                    projectMembers={projectMembers}
                    projectOwner={projectOwner}
                    onSubmit={handleSaveEdit}
                    onCancel={handleCancelEdit}
                />
            </div>
        );
    }

    return (
        <div className={`comment-item ${isReply ? 'comment-reply' : ''}`}>
            <div className="comment-header">
                <div className="comment-author">
                    <span className="author-name">{getAuthorName(comment.user_id)}</span>
                    <span className={`author-role role-${getAuthorRole(comment.user_id)}`}>
                        {getAuthorRole(comment.user_id)}
                    </span>
                    {comment.is_edited && (
                        <span className="edited-badge">(edited)</span>
                    )}
                </div>
                <div className="comment-meta">
                    <span className="comment-date">{formatDate(comment.created_at)}</span>
                </div>
            </div>

            <div className="comment-content">
                {comment.content}
            </div>

            {comment.mentions && Array.isArray(comment.mentions) && comment.mentions.length > 0 && (
                <div className="comment-mentions">
                    <span className="mentions-label">Mentioned:</span>
                    {comment.mentions.map((userId, index) => (
                        <span key={`${userId}-${index}`} className="mention-badge">
                            @{getAuthorName(userId)}
                        </span>
                    ))}
                </div>
            )}

            <div className="comment-actions">
                {!isReply && (
                    <button
                        onClick={handleReplyClick}
                        className="btn-text btn-reply"
                    >
                        Reply
                    </button>
                )}

                {isAuthor && (
                    <>
                        <button
                            onClick={handleEditClick}
                            className="btn-text btn-edit"
                        >
                            Edit
                        </button>
                        <button
                            onClick={handleDeleteClick}
                            className="btn-text btn-delete"
                        >
                            Delete
                        </button>
                    </>
                )}

                {!isReply && comment.reply_count > 0 && !showReplies && (
                    <button
                        onClick={() => setShowReplies(true)}
                        className="btn-text btn-show-replies"
                    >
                        View {comment.reply_count} {comment.reply_count === 1 ? 'reply' : 'replies'}
                    </button>
                )}

                {!isReply && showReplies && comment.reply_count > 0 && (
                    <button
                        onClick={() => setShowReplies(false)}
                        className="btn-text btn-hide-replies"
                    >
                        Hide {comment.reply_count} {comment.reply_count === 1 ? 'reply' : 'replies'}
                    </button>
                )}
            </div>

            {shouldShowReplies ? (
                <CommentReplies
                    parentCommentId={comment.id}
                    taskId={taskId || comment.task_id}
                    projectMembers={projectMembers}
                    projectOwner={projectOwner}
                    currentUser={currentUser}
                    onCommentUpdated={onCommentUpdated}
                    onCommentDeleted={onCommentDeleted}
                    showReplyForm={showReplyForm}
                    onReplyFormToggle={setShowReplyForm}
                />
            ) : null}
        </div>
    );
};

const EditCommentForm = ({ 
    initialContent, 
    projectMembers, 
    projectOwner = null,
    onSubmit, 
    onCancel 
}) => {
    const [content, setContent] = useState(initialContent);
    const [mentions, setMentions] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim()) return;

        setIsSubmitting(true);
        try {
            await onSubmit(content, mentions);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="edit-comment-form">
            <MentionInput
                value={content}
                onChange={setContent}
                onMentionsChange={setMentions}
                projectMembers={projectMembers}
                projectOwner={projectOwner}
                placeholder="Edit your comment..."
                disabled={isSubmitting}
            />
            <div className="edit-form-actions">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="btn-text"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={!content.trim() || isSubmitting}
                    className="btn-primary"
                >
                    {isSubmitting ? 'Saving...' : 'Save'}
                </button>
            </div>
        </form>
    );
};

export default CommentItem;