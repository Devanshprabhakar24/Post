import { motion, useReducedMotion } from 'framer-motion';
import { memo } from 'react';
import { ArrowUpRight, MessageCircle, Repeat2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import LikeButton from './LikeButton';
import { Avatar } from './ui/avatar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardFooter } from './ui/card';

function highlightText(text, query) {
    if (!query) {
        return text;
    }

    const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${safeQuery})`, 'ig');
    const parts = String(text || '').split(regex);

    return parts.map((part, index) =>
        index % 2 === 1 ? (
            <mark key={`${part}-${index}`} className="rounded bg-cyan-500/20 px-0.5 text-cyan-900 dark:bg-cyan-500/30 dark:text-cyan-100">
                {part}
            </mark>
        ) : (
            <span key={`${part}-${index}`}>{part}</span>
        )
    );
}

function formatTimeAgo(dateValue) {
    const time = new Date(dateValue || Date.now()).getTime();
    const diff = Date.now() - time;
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

function PostCard({
    post,
    query,
    onToggleLike,
    isLiking = false,
    onOpenPreview,
    onOpenDetails,
    canDelete = false,
    isOwnPost = false,
    onDelete,
    onTagClick
}) {
    const prefersReducedMotion = useReducedMotion();
    const likes = Number(post?.likes) || 0;
    const badgeLabel = post?.isExternal ? 'External Post' : isOwnPost ? 'Your Post' : '';
    const displayName = post.authorName || post.author?.name || `User ${post.userId}`;
    const displayHandle = post.authorUsername || post.author?.username || `user${post.userId}`;
    const timestamp = formatTimeAgo(post.createdAt);

    return (
        <motion.article
            layout
            whileInView={{ opacity: [0, 1], y: [18, 0] }}
            viewport={{ once: true, margin: '-20px' }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            whileHover={prefersReducedMotion ? undefined : { y: -3, boxShadow: '0 26px 54px rgba(8, 47, 73, 0.42)' }}
            className="h-full"
        >
            <Card className="group app-surface relative h-full overflow-hidden border-slate-200/90 bg-white/90 shadow-[0_16px_36px_rgba(15,23,42,0.12)] dark:border-cyan-200/10 dark:bg-slate-900/60 dark:shadow-[0_20px_55px_rgba(2,6,23,0.42)]">
                <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-cyan-400/12 blur-3xl transition-opacity duration-300 group-hover:opacity-100 dark:bg-cyan-400/10" />
                <CardContent className="space-y-3.5 p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                        <Avatar
                            name={displayName}
                            src={post.author?.profilePic || post.author?.imageUrl || ''}
                            online={Boolean(post.author?.isOnline)}
                            className="mt-0.5"
                        />

                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                                <p className="font-semibold text-slate-900 dark:text-white">{displayName}</p>
                                <p className="text-slate-600 dark:text-slate-400">@{displayHandle}</p>
                                <span className="text-slate-500 dark:text-slate-500">·</span>
                                <time className="text-slate-500 dark:text-slate-500">{timestamp}</time>
                                {badgeLabel && (
                                    <Badge className="ml-auto border-cyan-400/35 bg-cyan-500/12 text-cyan-800 dark:border-cyan-300/30 dark:bg-cyan-500/10 dark:text-cyan-100">
                                        {badgeLabel}
                                    </Badge>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={onOpenDetails || (() => {})}
                                aria-label={`Open post ${post.postId} details`}
                                className="mt-2 block w-full text-left"
                            >
                                <h3 className="line-clamp-2 text-[1.02rem] font-semibold leading-snug text-slate-900 transition-colors duration-200 group-hover:text-cyan-700 dark:text-white dark:group-hover:text-cyan-200">
                                    {highlightText(post.title, query)}
                                </h3>
                                <p className="line-clamp-4 mt-2 text-[0.93rem] leading-relaxed text-slate-700 dark:text-slate-300">
                                    {highlightText(post.body, query)}
                                </p>
                            </button>
                        </div>
                    </div>

                    {post.imageUrl && (
                        <button type="button" onClick={onOpenDetails || (() => {})} className="block w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-100/70 dark:border-cyan-200/20 dark:bg-slate-950/60">
                            <img src={post.imageUrl} alt={post.title} loading="lazy" className="h-52 w-full object-cover transition duration-500 ease-out group-hover:scale-[1.015]" />
                        </button>
                    )}

                    {Array.isArray(post.hashtags) && post.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {post.hashtags.map((tag) => (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => onTagClick?.(tag)}
                                    className="rounded-full border border-cyan-400/35 bg-cyan-500/12 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-800 transition hover:border-cyan-400/60 hover:bg-cyan-500/18 dark:border-cyan-400/20 dark:bg-cyan-500/10 dark:text-cyan-200 dark:hover:border-cyan-300/50 dark:hover:bg-cyan-500/20"
                                >
                                    #{tag}
                                </button>
                            ))}
                        </div>
                    )}
                </CardContent>

                <CardFooter className="flex items-center justify-between border-t border-slate-200/85 p-4 pt-3.5 dark:border-white/5 sm:p-5 sm:pt-4">
                    <div className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        <Button variant="ghost" size="sm" onClick={onOpenDetails || (() => {})} className="rounded-full">
                            <MessageCircle className="mr-1 h-4 w-4" /> {post.commentsCount ?? 0}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onOpenPreview?.(post)} className="rounded-full">
                            <Repeat2 className="mr-1 h-4 w-4" /> Repost
                        </Button>
                    </div>

                    <div className="flex items-center gap-2">
                        <LikeButton
                            likes={likes}
                            isLiked={Boolean(post.isLiked)}
                            onToggle={() => onToggleLike(post)}
                            disabled={isLiking}
                        />
                        {canDelete && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDelete?.(post)}
                                aria-label={`Delete post ${post.postId}`}
                                className="text-rose-600 hover:text-rose-500 dark:text-rose-300 dark:hover:text-rose-200"
                            >
                                Delete
                            </Button>
                        )}
                        <Link to={`/posts/${post.postId}`} className="inline-flex">
                            <Button variant="secondary" size="sm">
                                Open <ArrowUpRight className="h-3.5 w-3.5" />
                            </Button>
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </motion.article>
    );
}

export default memo(PostCard);