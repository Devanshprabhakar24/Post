import { motion, useInView, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowUpRight, MessageCircle, Share2 } from 'lucide-react';
import { memo, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import useMagnet from '../hooks/useMagnet';
import { postCardInView } from '../lib/motion';
import LikeButton from './LikeButton';
import { Avatar } from './ui/avatar';

function MagneticTag({ tag, onClick }) {
    const magnet = useMagnet();

    return (
        <motion.button
            ref={magnet.ref}
            style={magnet.style}
            onMouseMove={magnet.onMouseMove}
            onMouseLeave={magnet.onMouseLeave}
            onClick={() => onClick?.(tag)}
            type="button"
            className="magnetic-hit rounded-full border border-volt/45 px-2 py-1 ui-font text-[10px] uppercase tracking-[0.16em] text-volt hover:bg-volt hover:text-ink"
        >
            #{tag}
        </motion.button>
    );
}

function formatTimeAgo(value) {
    const stamp = new Date(value || Date.now()).getTime();
    const diff = Date.now() - stamp;
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diff < hour) {
        return `${Math.max(1, Math.floor(diff / minute))}m`;
    }
    if (diff < day) {
        return `${Math.floor(diff / hour)}h`;
    }
    return `${Math.floor(diff / day)}d`;
}

function highlightText(text, query) {
    if (!query) {
        return text;
    }

    const safe = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${safe})`, 'ig');
    return String(text || '').split(regex).map((part, index) => (
        index % 2 === 1 ? <mark key={`${part}-${index}`} className="bg-volt/40 px-0.5 text-ink">{part}</mark> : <span key={`${part}-${index}`}>{part}</span>
    ));
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
    const reduced = useReducedMotion();
    const cardRef = useRef(null);
    const imageRef = useRef(null);
    const inView = useInView(cardRef, { once: true, margin: '-12% 0px -10% 0px' });

    const { scrollYProgress } = useScroll({
        target: imageRef,
        offset: ['start end', 'end start']
    });
    const imageY = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);

    const entryMotion = postCardInView(index);
    const displayName = post?.authorName || post?.author?.name || `User ${post?.userId}`;
    const displayHandle = post?.authorUsername || post?.author?.username || `user${post?.userId}`;
    const likes = Number(post?.likes) || 0;
    const hashtags = Array.isArray(post?.hashtags) ? post.hashtags : [];
    const timestamp = formatTimeAgo(post?.createdAt);
    const accent = useMagnet();

    const cardClasses = useMemo(
        () => `relative overflow-hidden rounded-2xl border-l border-l-volt/65 px-4 py-4 transition duration-300 editorial-surface ${isLive ? 'live-card-flash' : ''}`,
        [isLive]
    );

    return (
        <motion.article
            ref={cardRef}
            initial={entryMotion.initial}
            whileInView={entryMotion.whileInView}
            viewport={entryMotion.viewport}
            transition={reduced ? { duration: 0 } : entryMotion.transition}
            whileHover={reduced ? undefined : { y: -4, boxShadow: '0 24px 70px rgba(10, 10, 15, 0.24)' }}
            className="mb-4 break-inside-avoid"
        >
            <div className={cardClasses}>
                <motion.span
                    className="absolute left-0 top-0 h-full w-[2px] origin-top bg-volt"
                    initial={{ scaleY: 0.4, opacity: 0.7 }}
                    animate={{ scaleY: inView ? 1 : 0.4, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                />

                {isLive && <span className="live-dot absolute right-3 top-3 h-2 w-2 rounded-full bg-ember" />}

                {post?.imageUrl && (
                    <div ref={imageRef} className="mb-4 h-52 overflow-hidden rounded-xl border border-mist/30">
                        <motion.img
                            src={post.imageUrl}
                            alt={post.title}
                            loading="lazy"
                            style={reduced ? undefined : { y: imageY }}
                            className="h-[120%] w-full object-cover"
                        />
                    </div>
                )}

                <div className="grid gap-4 md:grid-cols-[35%_65%]">
                    <aside className="space-y-3 border-b border-mist/20 pb-3 md:border-b-0 md:border-r md:pr-4 md:pb-0">
                        <div className="flex items-center gap-3">
                            <Avatar
                                name={displayName}
                                src={post?.author?.profilePic || post?.author?.imageUrl || ''}
                                online={Boolean(post?.author?.isOnline)}
                                className="h-11 w-11 border border-volt/40"
                            />
                            <div>
                                <p className="font-display text-2xl uppercase leading-none text-paper">{displayName}</p>
                                <p className="ui-font text-[10px] uppercase tracking-[0.18em] text-mist">@{displayHandle}</p>
                            </div>
                        </div>
                        <time className="ui-font text-[11px] tracking-wide text-mist">{timestamp} ago</time>
                        <div className="flex flex-wrap gap-2">
                            {hashtags.map((tag) => {
                                return (
                                    <MagneticTag key={tag} tag={tag} onClick={onTagClick} />
                                );
                            })}
                        </div>
                    </aside>

                    <section className="space-y-3">
                        <button type="button" onClick={onOpenDetails || (() => {})} className="block w-full text-left">
                            <h3 className="font-display text-[28px] leading-[0.95] tracking-[-0.02em] text-paper">
                                {highlightText(post?.title, query)}
                            </h3>
                            <p className="mt-2 line-clamp-4 font-body text-base italic leading-7 text-mist">
                                {highlightText(post?.body, query)}
                            </p>
                        </button>

                        <div className="flex items-center justify-end gap-3 border-t border-mist/25 pt-3 ui-font text-[11px] uppercase tracking-[0.12em] text-mist">
                            <LikeButton
                                likes={likes}
                                isLiked={Boolean(post?.isLiked)}
                                onToggle={() => onToggleLike(post)}
                                disabled={isLiking}
                            />
                            <span className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {post?.commentsCount ?? 0}</span>
                            <button
                                ref={accent.ref}
                                style={accent.style}
                                onMouseMove={accent.onMouseMove}
                                onMouseLeave={accent.onMouseLeave}
                                type="button"
                                onClick={(event) => onOpenPreview?.(post, event)}
                                className="magnetic-hit inline-flex items-center gap-1 rounded-full border border-mist/35 px-2 py-1 hover:border-volt hover:text-volt"
                            >
                                <Share2 className="h-3.5 w-3.5" /> Share
                            </button>
                            {canDelete && (
                                <button
                                    type="button"
                                    onClick={() => onDelete?.(post)}
                                    className="rounded-full border border-ember/40 px-2 py-1 text-ember hover:bg-ember hover:text-ink"
                                >
                                    Delete
                                </button>
                            )}
                            <Link to={`/posts/${post.postId}`} className="inline-flex items-center gap-1 rounded-full border border-mist/35 px-2 py-1 hover:border-volt hover:text-volt">
                                Open <ArrowUpRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    </section>
                </div>
            </div>
        </motion.article>
    );
}

export default memo(PostCard);
