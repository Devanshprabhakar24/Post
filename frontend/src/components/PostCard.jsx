import { memo, useMemo } from 'react';
import { Heart, MessageCircle, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

// Gradient color schemes by topic
const GRADIENT_MAP = {
    design: { from: '#7b1fa2', to: '#ff5722', bg: 'linear-gradient(135deg, #7b1fa2 0%, #e91e63 50%, #ff5722 100%)' },
    startup: { from: '#004d40', to: '#26c6da', bg: 'linear-gradient(135deg, #004d40 0%, #00897b 60%, #26c6da 100%)' },
    nature: { from: '#1b5e20', to: '#f57f17', bg: 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 40%, #f57f17 100%)' },
    tech: { from: '#1a237e', to: '#2196f3', bg: 'linear-gradient(135deg, #1a237e 0%, #3949ab 50%, #2196f3 100%)' },
    health: { from: '#880e4f', to: '#e91e63', bg: 'linear-gradient(135deg, #880e4f 0%, #c2185b 50%, #e91e63 100%)' },
    food: { from: '#e65100', to: '#fdd835', bg: 'linear-gradient(135deg, #e65100 0%, #ff6f00 40%, #fdd835 100%)' },
    default: { from: '#5c6bc0', to: '#7986cb', bg: 'linear-gradient(135deg, #5c6bc0 0%, #7986cb 100%)' }
};

const AVATAR_COLORS = ['#7b1fa2', '#00695c', '#d32f2f', '#5c6bc0', '#ef6c00', '#f4511e', '#00897b'];

function getGradientByTopic(hashtags = []) {
    if (hashtags.includes('design') || hashtags.includes('uxdesign')) return GRADIENT_MAP.design;
    if (hashtags.includes('startup') || hashtags.includes('entrepreneurship')) return GRADIENT_MAP.startup;
    if (hashtags.includes('nature') || hashtags.includes('photography') || hashtags.includes('wildlife')) return GRADIENT_MAP.nature;
    if (hashtags.includes('tech') || hashtags.includes('technology')) return GRADIENT_MAP.tech;
    if (hashtags.includes('health') || hashtags.includes('wellness')) return GRADIENT_MAP.health;
    if (hashtags.includes('food') || hashtags.includes('recipe')) return GRADIENT_MAP.food;
    return GRADIENT_MAP.default;
}

function getAvatarColor(userId) {
    return AVATAR_COLORS[Number(userId || 0) % AVATAR_COLORS.length];
}

const TOPIC_META = {
    design: { emoji: '🎨', tag: 'Design Case Study', badge: 'Creator' },
    startup: { emoji: '🚀', tag: 'Milestone', badge: 'Verified' },
    nature: { emoji: '🌿', tag: 'Photo Essay', badge: 'Photographer' },
    tech: { emoji: '💻', tag: 'Tech Brief', badge: 'Builder' },
    health: { emoji: '💪', tag: 'Wellness Story', badge: 'Creator' },
    food: { emoji: '🍽️', tag: 'Food Story', badge: 'Creator' },
    default: { emoji: '✨', tag: 'Featured Story', badge: 'Creator' }
};

function resolveTopic(hashtags = [], title = '', body = '') {
    const pool = `${hashtags.join(' ')} ${title} ${body}`.toLowerCase();
    if (pool.includes('design') || pool.includes('ux') || pool.includes('ui')) return 'design';
    if (pool.includes('startup') || pool.includes('founder') || pool.includes('arr') || pool.includes('business')) return 'startup';
    if (pool.includes('nature') || pool.includes('travel') || pool.includes('wildlife') || pool.includes('photo')) return 'nature';
    if (pool.includes('tech') || pool.includes('ai') || pool.includes('code') || pool.includes('software')) return 'tech';
    if (pool.includes('health') || pool.includes('fitness') || pool.includes('wellness')) return 'health';
    if (pool.includes('food') || pool.includes('recipe') || pool.includes('cook')) return 'food';
    return 'default';
}


function PostCard({
    post,
    index = 0,
    query,
    onToggleLike,
    isLiking = false,
    onOpenPreview,
    onOpenDetails,
    canDelete = false,
    isOwnPost = false,
    onDelete,
    onTagClick,
    isLive = false,
    onOpenComments,
    onRepost,
    onShare,
    onFollowUser,
    showFollowButton = false,
    isFollowing = false,
    isFollowLoading = false
}) {
    const navigate = useNavigate();
    const displayName = post?.authorName || post?.author?.name || `User ${post?.userId}`;
    const displayHandle = post?.authorUsername || post?.author?.username || `user${post?.userId}`;
    const avatar = post?.author?.profilePic || post?.author?.imageUrl || '';
    const avatarColor = getAvatarColor(post?.userId);
    const likes = Number(post?.likes) || 0;
    const reposts = Number(post?.repostsCount ?? post?.sharesCount ?? 0) || 0;
    const hashtags = Array.isArray(post?.hashtags) ? post.hashtags : [];
    const topic = resolveTopic(hashtags, post?.title, post?.body);
    const gradient = getGradientByTopic(hashtags);
    const topicMeta = TOPIC_META[topic] || TOPIC_META.default;
    
    const timeAgo = useMemo(() => {
        if (!post?.createdAt) return 'recently';
        const timestamp = new Date(post.createdAt).getTime();
        if (!Number.isFinite(timestamp)) return 'recently';
        const diff = Date.now() - timestamp;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 1) return 'just now';
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    }, [post?.createdAt]);

    const reactionPills = ['❤', '👍', '🤩'];

    const HASHTAG_COLORS = {
        design: { bg: '#fce4ec', text: '#c2185b' },
        uxdesign: { bg: '#fce4ec', text: '#c2185b' },
        productdesign: { bg: '#ede7f6', text: '#4527a0' },
        spotify: { bg: '#e8f5e9', text: '#1b5e20' },
        startup: { bg: '#e0f2f1', text: '#004d40' },
        entrepreneurship: { bg: '#fff3e0', text: '#e65100' },
        india: { bg: '#e8eaf6', text: '#283593' },
        nature: { bg: '#e8f5e9', text: '#1b5e20' },
        photography: { bg: '#fbe9e7', text: '#bf360c' },
        wildlife: { bg: '#e3f2fd', text: '#0d47a1' },
        default: { bg: '#f0f0f0', text: '#555555' }
    };

    const getHashtagColor = (tag) => HASHTAG_COLORS[tag?.toLowerCase()] || HASHTAG_COLORS.default;

    const getPostUrl = () => {
        const path = `/posts/${post?.postId}`;
        if (typeof window !== 'undefined') {
            return `${window.location.origin}${path}`;
        }
        return path;
    };

    const handleComments = () => {
        if (typeof onOpenComments === 'function') {
            onOpenComments(post);
            return;
        }

        if (typeof onOpenDetails === 'function') {
            onOpenDetails(post);
            return;
        }

        if (post?.postId) {
            navigate(`/posts/${post.postId}`);
        }
    };

    const handleRepost = async () => {
        if (typeof onRepost === 'function') {
            await onRepost(post);
            return;
        }

        const url = getPostUrl();
        if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(url);
            toast.success('Post link copied for repost');
            return;
        }

        toast.success('Ready to repost');
    };

    const handleShare = async () => {
        if (typeof onShare === 'function') {
            await onShare(post);
            return;
        }

        const url = getPostUrl();
        if (navigator?.share) {
            try {
                await navigator.share({ title: post?.title || 'Post', text: post?.body || '', url });
                return;
            } catch (_error) {
                // Fall back to clipboard copy.
            }
        }

        if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(url);
            toast.success('Post link copied');
            return;
        }

        toast.success('Share action triggered');
    };

    const handleImagePreview = (event) => {
        if (typeof onOpenPreview === 'function') {
            onOpenPreview(post, event);
            return;
        }

        if (post?.postId) {
            navigate(`/posts/${post.postId}`);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.04 }}
            className="overflow-hidden rounded-lg border-[0.5px] border-[var(--border-light)] bg-[var(--bg-card)]"
        >
            {/* Post Header */}
            <div className="flex items-start justify-between gap-2.5 p-3 sm:gap-3 sm:p-4">
                <div className="flex flex-1 items-start gap-2.5 sm:gap-3">
                    <div
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white sm:h-11 sm:w-11"
                        style={{ backgroundColor: avatarColor }}
                    >
                        {avatar ? (
                            <img src={avatar} alt={displayName} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            displayName.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-1.5 sm:gap-2">
                            <p className="text-[13px] font-semibold text-[var(--text-primary)]">{displayName}</p>
                            <span
                                className="rounded-lg px-1.5 py-0.5 text-[9px] font-semibold sm:px-2 sm:text-[10px]"
                                style={{
                                    backgroundColor: getHashtagColor(topic).bg,
                                    color: getHashtagColor(topic).text
                                }}
                            >
                                ✦ {topicMeta.badge}
                            </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)]">@{displayHandle}</p>
                        <p className="mt-1 text-[10px] text-[var(--text-tertiary)]">{timeAgo} · 🌐 Public</p>
                    </div>
                </div>
                {showFollowButton && !isOwnPost && typeof onFollowUser === 'function' && (
                    <button
                        type="button"
                        onClick={() => onFollowUser(post)}
                        disabled={isFollowLoading}
                        className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                            isFollowing
                                ? 'border-[var(--border-soft)] text-[var(--text-secondary)] hover:border-[var(--accent-red)]/40 hover:text-[var(--accent-red)]'
                                : 'border-[var(--accent-red)] bg-[var(--accent-red)] text-white hover:opacity-90'
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                        {isFollowLoading ? '...' : (isFollowing ? 'Following' : 'Follow')}
                    </button>
                )}
            </div>

            {/* Post Text */}
            <div className="px-3 pb-3 sm:px-4">
                <button
                    onClick={() => onOpenDetails?.(post)}
                    className="block w-full text-left hover:opacity-80"
                >
                    <p className="text-[13px] leading-[1.6] text-[var(--text-secondary)]">{post?.body || post?.title}</p>
                </button>
            </div>

            {/* Image Block with Gradient */}
            {post?.imageUrl ? (
                <button type="button" onClick={handleImagePreview} className="block w-full text-left" aria-label="Open image preview">
                    <img src={post.imageUrl} alt={post?.title || 'Post'} className="h-[180px] w-full cursor-zoom-in object-cover sm:h-[200px]" loading="lazy" />
                </button>
            ) : (
                <div
                    className="relative flex h-[180px] w-full items-center justify-center overflow-hidden text-white sm:h-[200px]"
                    style={{ background: gradient.bg }}
                >
                    <div className="text-center z-10 px-4">
                        <div className="text-6xl mb-2">{topicMeta.emoji}</div>
                        <p className="text-white font-semibold text-base mb-1 line-clamp-1">{post?.title || 'Untitled Post'}</p>
                        <p className="text-white/70 text-xs line-clamp-1">{displayName}</p>
                    </div>
                    <div className="absolute left-3 top-3 rounded-full bg-black/55 px-2 py-1 text-[10px] text-white">
                        {topicMeta.tag}
                    </div>
                </div>
            )}

            {/* Hashtags */}
            <div className="flex flex-wrap gap-2 px-3 pb-2 pt-3 sm:px-4">
                {hashtags.slice(0, 3).map((tag) => {
                    const colors = getHashtagColor(tag);
                    return (
                        <button
                            key={tag}
                            onClick={() => onTagClick?.(tag)}
                            className="text-[11px] font-semibold px-3 py-1 rounded-full hover:opacity-80"
                            style={{
                                backgroundColor: colors.bg,
                                color: colors.text
                            }}
                        >
                            #{tag}
                        </button>
                    );
                })}
            </div>

            {/* Reaction Stats */}
            <div className="flex items-center gap-2 border-b-[0.5px] border-[var(--border-subtle)] px-3 py-2 text-[10px] text-[var(--text-tertiary)] sm:px-4 sm:text-[11px]">
                <div className="flex gap-1">
                    {reactionPills.map((pill, idx) => (
                        <div
                            key={idx}
                            className="flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] border-[var(--bg-card)] text-[10px]"
                            style={{ backgroundColor: idx === 0 ? '#e63946' : idx === 1 ? '#ff9800' : '#9c27b0' }}
                        >
                            {pill}
                        </div>
                    ))}
                </div>
                <span className="ml-0.5">{likes} reactions</span>
                <div className="flex-1" />
                <span>{post?.commentsCount ?? 0} comments · {reposts} reposts</span>
            </div>

            {/* Action Buttons */}
            <div className="flex px-1.5 py-1 sm:px-2">
                <button
                    onClick={() => onToggleLike(post)}
                    disabled={isLiking}
                    className={`flex flex-1 items-center justify-center gap-1 rounded-lg border-none py-2 text-[11px] font-medium transition sm:gap-2 sm:text-[12px] ${
                        post?.isLiked
                            ? 'text-[#e63946]'
                            : 'text-[var(--text-secondary)] hover:bg-red-50 dark:hover:bg-red-500/15'
                    }`}
                    aria-label={post?.isLiked ? 'Unlike post' : 'Like post'}
                >
                    <Heart size={16} fill={post?.isLiked ? 'currentColor' : 'none'} />
                    <span className="hidden sm:inline">{post?.isLiked ? 'Liked' : 'Like'}</span>
                </button>
                <button type="button" onClick={handleComments} className="flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-medium text-[var(--text-secondary)] hover:bg-gray-50 dark:hover:bg-white/5 sm:gap-2 sm:text-[12px]" aria-label="Open comments">
                    <MessageCircle size={16} /> <span className="hidden sm:inline">Comment</span>
                </button>
                <button type="button" onClick={handleRepost} className="flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-medium text-[var(--text-secondary)] hover:bg-gray-50 dark:hover:bg-white/5 sm:gap-2 sm:text-[12px]" aria-label="Repost">
                    <Share2 size={16} /> <span className="hidden sm:inline">Repost</span>
                </button>
                <button type="button" onClick={handleShare} className="flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-medium text-[var(--text-secondary)] hover:bg-gray-50 dark:hover:bg-white/5 sm:gap-2 sm:text-[12px]" aria-label="Share post">
                    <Share2 size={16} style={{ transform: 'rotate(90deg)' }} /> <span className="hidden sm:inline">Share</span>
                </button>
            </div>
        </motion.div>
    );
}

export default memo(PostCard);
