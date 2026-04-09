import { memo, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

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
    isLive = false
}) {
    const displayName = post?.authorName || post?.author?.name || `User ${post?.userId}`;
    const displayHandle = post?.authorUsername || post?.author?.username || `user${post?.userId}`;
    const avatar = post?.author?.profilePic || post?.author?.imageUrl || '';
    const avatarColor = getAvatarColor(post?.userId);
    const likes = Number(post?.likes) || 0;
    const hashtags = Array.isArray(post?.hashtags) ? post.hashtags : [];
    const gradient = getGradientByTopic(hashtags);
    
    const timeAgo = useMemo(() => {
        if (!post?.createdAt) return 'recently';
        const diff = Date.now() - new Date(post.createdAt).getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 1) return 'minutes ago';
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

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.04 }}
            className="bg-white rounded-lg border-[0.5px] border-[#e8e8e8] overflow-hidden"
        >
            {/* Post Header */}
            <div className="p-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                    <div
                        className="flex-shrink-0 h-11 w-11 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                        style={{ backgroundColor: avatarColor }}
                    >
                        {avatar ? (
                            <img src={avatar} alt={displayName} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            displayName.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <p className="text-[13px] font-semibold text-[#111]">{displayName}</p>
                            <span
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-lg"
                                style={{
                                    backgroundColor: getHashtagColor('design').bg,
                                    color: getHashtagColor('design').text
                                }}
                            >
                                ✦ Creator
                            </span>
                        </div>
                        <p className="text-[11px] text-[#888]">@{displayHandle}</p>
                        <p className="text-[10px] text-[#bbb] mt-1">{timeAgo} · 🌐 Public</p>
                    </div>
                </div>
                <button className="border-[1.5px] border-[#e63946] text-[#e63946] px-4 py-1 rounded-full text-[12px] font-semibold hover:bg-red-50">
                    + Follow
                </button>
            </div>

            {/* Post Text */}
            <div className="px-4 pb-3">
                <button
                    onClick={() => onOpenDetails?.(post)}
                    className="block w-full text-left hover:opacity-80"
                >
                    <p className="text-[13px] text-[#333] leading-[1.6]">{post?.title}</p>
                </button>
            </div>

            {/* Image Block with Gradient */}
            <div
                className="w-full h-[200px] flex items-center justify-center text-white relative overflow-hidden"
                style={{ background: gradient.bg }}
            >
                <div className="text-center z-10">
                    <div className="text-6xl mb-2">🎨</div>
                    <p className="text-white font-semibold text-base mb-1">Design Masterpiece</p>
                    <p className="text-white/70 text-xs">2025</p>
                </div>
                <div className="absolute top-3 left-3 bg-black/55 text-white text-[10px] px-2 py-1 rounded-full">
                    Design Case Study
                </div>
            </div>

            {/* Hashtags */}
            <div className="px-4 pt-3 pb-2 flex flex-wrap gap-2">
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
            <div className="px-4 py-2 flex items-center gap-2 border-b-[0.5px] border-[#f0f0f0] text-[11px] text-[#999]">
                <div className="flex gap-1">
                    {reactionPills.map((pill, idx) => (
                        <div
                            key={idx}
                            className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] border-[1.5px] border-white"
                            style={{ backgroundColor: idx === 0 ? '#e63946' : idx === 1 ? '#ff9800' : '#9c27b0' }}
                        >
                            {pill}
                        </div>
                    ))}
                </div>
                <span className="ml-0.5">{likes} reactions</span>
                <div className="flex-1" />
                <span>{post?.commentsCount ?? 0} comments · {likes} reposts</span>
            </div>

            {/* Action Buttons */}
            <div className="flex py-1 px-2">
                <button
                    onClick={() => onToggleLike(post)}
                    disabled={isLiking}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-medium border-none cursor-pointer transition ${
                        post?.isLiked
                            ? 'text-[#e63946]'
                            : 'text-[#666] hover:bg-red-50'
                    }`}
                >
                    <Heart size={16} fill={post?.isLiked ? 'currentColor' : 'none'} />
                    {post?.isLiked ? 'Liked' : 'Like'}
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-medium text-[#666] hover:bg-gray-50">
                    <MessageCircle size={16} /> Comment
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-medium text-[#666] hover:bg-gray-50">
                    <Share2 size={16} /> Repost
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-medium text-[#666] hover:bg-gray-50">
                    <Share2 size={16} style={{ transform: 'rotate(90deg)' }} /> Share
                </button>
            </div>
        </motion.div>
    );
}

export default memo(PostCard);
