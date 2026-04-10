import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useParams } from 'react-router-dom';
import CommentThread from '../components/CommentThread';
import LikeButton from '../components/LikeButton';
import Loader from '../components/Loader';
import ReadingProgress from '../components/ReadingProgress';
import ReplyForm from '../components/ReplyForm';
import { Avatar } from '../components/ui/avatar';
import { useAuth } from '../context/AuthContext';
import {
    createPostComment,
    fetchPostById,
    fetchPostComments,
    getLikeStatus,
    likePost,
    replyToComment,
    unlikePost
} from '../services/api';
import { joinPost, onCommentCreated, onLikeUpdated } from '../services/socket';

function appendReplyToTree(list, parentCommentId, reply) {
    return (Array.isArray(list) ? list : []).map((entry) => {
        if (Number(entry.commentId) === Number(parentCommentId)) {
            const replies = Array.isArray(entry.replies) ? entry.replies : [];
            return {
                ...entry,
                replies: [...replies, reply]
            };
        }

        return {
            ...entry,
            replies: appendReplyToTree(entry.replies, parentCommentId, reply)
        };
    });
}

export default function PostDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const currentUserId = Number(user?.userId || 0);

    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingComments, setLoadingComments] = useState(true);
    const [updatingLike, setUpdatingLike] = useState(false);
    const [error, setError] = useState('');

    const commentCount = useMemo(() => {
        const walk = (items) => (Array.isArray(items)
            ? items.reduce((total, item) => total + 1 + walk(item.replies), 0)
            : 0);
        return walk(comments);
    }, [comments]);

    useEffect(() => {
        let active = true;

        async function loadPost() {
            setLoading(true);
            setError('');

            try {
                const [postData, thread] = await Promise.all([fetchPostById(id), fetchPostComments(id)]);
                const likeStatus = currentUserId
                    ? await getLikeStatus(id, currentUserId).catch(() => null)
                    : null;

                if (!active) {
                    return;
                }

                setPost({
                    ...postData,
                    likes: Number(likeStatus?.totalLikes ?? postData?.likes ?? 0),
                    likedBy: Array.isArray(postData?.likedBy) ? postData.likedBy : [],
                    isLiked: Boolean(likeStatus?.isLiked)
                });
                setComments(Array.isArray(thread) ? thread : []);
                joinPost(Number(id));
            } catch (requestError) {
                if (active) {
                    setError(requestError.message || 'Failed to load post details');
                }
            } finally {
                if (active) {
                    setLoading(false);
                    setLoadingComments(false);
                }
            }
        }

        loadPost();

        return () => {
            active = false;
        };
    }, [currentUserId, id]);

    useEffect(() => {
        const stopLikeUpdated = onLikeUpdated((payload) => {
            if (!payload?.postId || Number(payload.postId) !== Number(id)) {
                return;
            }

            setPost((current) => {
                if (!current) {
                    return current;
                }

                const likedBy = Array.isArray(payload.likedBy) ? payload.likedBy : [];
                return {
                    ...current,
                    likes: Number(payload.totalLikes) || 0,
                    likedBy,
                    isLiked: likedBy.map(Number).includes(Number(currentUserId))
                };
            });
        });

        const stopCommentCreated = onCommentCreated((payload) => {
            if (!payload?.postId || Number(payload.postId) !== Number(id)) {
                return;
            }

            const incoming = payload?.comment;
            if (!incoming?.commentId) {
                return;
            }

            if (Number(payload?.parentCommentId) > 0) {
                setComments((current) => appendReplyToTree(current, payload.parentCommentId, { ...incoming, replies: [] }));
                return;
            }

            setComments((current) => {
                const list = Array.isArray(current) ? current : [];
                if (list.some((entry) => Number(entry.commentId) === Number(incoming.commentId))) {
                    return list;
                }

                return [...list, { ...incoming, replies: [] }];
            });
        });

        return () => {
            stopLikeUpdated();
            stopCommentCreated();
        };
    }, [currentUserId, id]);

    const handleLikeToggle = async () => {
        if (!post || updatingLike) {
            return;
        }

        const shouldLike = !post.isLiked;
        const snapshot = post;

        setUpdatingLike(true);
        setPost((current) => ({
            ...current,
            isLiked: shouldLike,
            likes: Math.max(0, Number(current.likes || 0) + (shouldLike ? 1 : -1))
        }));

        try {
            if (shouldLike) {
                await likePost(post.postId, user?.userId);
            } else {
                await unlikePost(post.postId, user?.userId);
            }
            toast.success(shouldLike ? 'Post liked' : 'Post unliked');
        } catch (requestError) {
            setPost(snapshot);
            toast.error(requestError.message || 'Failed to update like');
        } finally {
            setUpdatingLike(false);
        }
    };

    const reloadComments = async () => {
        const thread = await fetchPostComments(id);
        setComments(Array.isArray(thread) ? thread : []);
    };

    const handleAddComment = async (body) => {
        await createPostComment(id, body);
        await reloadComments();
        toast.success('Comment posted');
    };

    const handleReply = async (commentId, body) => {
        await replyToComment(commentId, body);
        await reloadComments();
        toast.success('Reply posted');
    };

    if (loading) {
        return <Loader count={3} />;
    }

    if (error) {
        return (
            <div className="rounded-2xl border border-[var(--accent-red)]/40 bg-[var(--accent-red)]/8 p-6 text-center">
                <p className="font-body text-lg italic text-[var(--accent-red)]">{error}</p>
                <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="mt-4 rounded-full border border-[var(--border-soft)] px-4 py-2 ui-font text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)] hover:border-[var(--accent-red)] hover:text-[var(--accent-red)]"
                >
                    Back to feed
                </button>
            </div>
        );
    }

    if (!post) {
        return null;
    }

    return (
        <>
            <ReadingProgress />
            <motion.article initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-5xl space-y-8">
                <header className="space-y-3">
                    <Link to="/" className="ui-font text-xs uppercase tracking-[0.14em] text-[var(--accent-red)] hover:underline">Back to feed</Link>
                    <h1 className="font-display text-[clamp(3rem,9vw,5.4rem)] leading-[0.88] text-[var(--text-primary)]">{post.title}</h1>
                    <div className="flex items-center justify-between gap-3 border-b border-[var(--border-soft)] pb-3">
                        <div className="inline-flex items-center gap-3">
                            <Avatar
                                name={post.authorName || post.author?.name}
                                src={post.author?.profilePic || post.author?.imageUrl || ''}
                                online={Boolean(post.author?.isOnline)}
                                className="h-10 w-10 border border-[var(--border-soft)]"
                            />
                            <span className="ui-font text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                                @{post.authorUsername || post.author?.username || `user-${post.userId}`}
                            </span>
                        </div>
                        <LikeButton isLiked={Boolean(post.isLiked)} likes={Number(post.likes) || 0} onToggle={handleLikeToggle} disabled={updatingLike} />
                    </div>
                </header>

                <section className="mx-auto max-w-[680px]">
                    <p className="whitespace-pre-line font-body text-xl leading-9 text-[var(--text-primary)]">{post.body}</p>
                    {post.imageUrl && <img src={post.imageUrl} alt={post.title} className="mt-6 max-h-[38rem] w-full rounded-2xl object-cover" />}
                </section>

                <section className="space-y-4">
                    <h2 className="font-display text-5xl text-[var(--text-primary)]">Comments ({commentCount})</h2>

                    <div className="rounded-2xl border border-[var(--border-soft)] p-4">
                        <ReplyForm placeholder="Share your thoughts..." submitLabel="Post comment" onSubmit={handleAddComment} />
                    </div>

                    {loadingComments ? (
                        <Loader count={2} />
                    ) : (
                        <div className="space-y-3">
                            {comments.map((comment, index) => (
                                <motion.div
                                    key={comment.commentId}
                                    initial={{ opacity: 0, x: -22 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.35, delay: index * 0.04 }}
                                >
                                    <CommentThread comment={comment} onReply={handleReply} />
                                </motion.div>
                            ))}
                        </div>
                    )}
                </section>
            </motion.article>
        </>
    );
}
