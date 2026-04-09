import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useParams } from 'react-router-dom';
import LikeButton from '../components/LikeButton';
import Loader from '../components/Loader';
import ReplyForm from '../components/ReplyForm';
import CommentThread from '../components/CommentThread';
import { Avatar } from '../components/ui/avatar';
import { useAuth } from '../context/AuthContext';
import { createPostComment, fetchPostById, fetchPostComments, getLikeStatus, likePost, replyToComment, unlikePost } from '../services/api';
import { joinPost, onLikeUpdated } from '../services/socket';

export default function PostDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const currentUserId = String(user?.userId || '');

    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingComments, setLoadingComments] = useState(true);
    const [updatingLike, setUpdatingLike] = useState(false);
    const [error, setError] = useState('');

    const commentCount = useMemo(() => {
        const walk = (items) => (Array.isArray(items) ? items.reduce((total, item) => total + 1 + walk(item.replies), 0) : 0);
        return walk(comments);
    }, [comments]);

    useEffect(() => {
        let active = true;

        async function loadPost() {
            setLoading(true);
            setError('');

            try {
                const [postData, thread] = await Promise.all([
                    fetchPostById(id),
                    fetchPostComments(id)
                ]);
                const likeStatus = await getLikeStatus(id, currentUserId).catch(() => null);

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
                    isLiked: likedBy.includes(currentUserId)
                };
            });
        });

        return () => stopLikeUpdated();
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
        return <Loader count={4} />;
    }

    if (error) {
        return (
            <div className="glass-card p-8 text-center">
                <p className="text-lg font-semibold text-rose-300">{error}</p>
                <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="mt-5 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700"
                >
                    Back to Home
                </button>
            </div>
        );
    }

    if (!post) {
        return null;
    }

    return (
        <>
            <motion.article
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="glass-card mx-auto max-w-4xl space-y-8 p-6 sm:p-8"
            >
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link to="/" className="text-sm text-cyan-300 transition hover:text-cyan-200">
                        ← Back to feed
                    </Link>
                    <LikeButton
                        isLiked={Boolean(post.isLiked)}
                        likes={Number(post.likes) || 0}
                        onToggle={handleLikeToggle}
                        disabled={updatingLike}
                    />
                </div>

                <div>
                    <h2 className="text-2xl font-semibold text-white sm:text-3xl">{post.title}</h2>
                    <p className="mt-5 whitespace-pre-line text-base leading-8 text-slate-300">{post.body}</p>
                    {post.imageUrl && (
                        <img src={post.imageUrl} alt={post.title} className="mt-5 max-h-[30rem] w-full rounded-2xl object-cover" />
                    )}
                    {Array.isArray(post.hashtags) && post.hashtags.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            {post.hashtags.map((tag) => (
                                <span
                                    key={tag}
                                    className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-200"
                                >
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="rounded-2xl border border-slate-700/50 bg-slate-900/70 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Author</p>
                    <div className="mt-3 flex items-center gap-3">
                        <Avatar
                            name={post.authorName || post.author?.name}
                            src={post.author?.profilePic || post.author?.imageUrl || ''}
                            online={Boolean(post.author?.isOnline)}
                            className="h-12 w-12"
                        />
                        <div>
                            {(post.authorName || post.author?.name) && (
                                <h3 className="text-lg font-semibold text-white">{post.authorName || post.author?.name}</h3>
                            )}
                            {(post.authorEmail || post.author?.email || post.authorUsername || post.author?.username) && (
                                <p className="text-sm text-slate-300">
                                    {post.authorEmail || post.author?.email || post.authorUsername || post.author?.username}
                                </p>
                            )}
                            {(post.authorUsername || post.author?.username) && (
                                <p className="text-sm text-slate-400">@{post.authorUsername || post.author?.username}</p>
                            )}
                        </div>
                    </div>
                </div>

                <section>
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <h4 className="text-xl font-semibold text-white">Comments ({commentCount})</h4>
                    </div>

                    <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                        <h5 className="text-sm font-semibold text-white">Add a comment</h5>
                        <div className="mt-3">
                            <ReplyForm placeholder="Share your thoughts..." submitLabel="Post comment" onSubmit={handleAddComment} />
                        </div>
                    </div>

                    {loadingComments ? (
                        <Loader count={2} />
                    ) : (
                        <div className="space-y-4">
                            {comments.map((comment) => (
                                <motion.div
                                    key={comment.commentId}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.25 }}
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
