import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import { useEffect } from 'react';
import LikeButton from './LikeButton';
import { Avatar } from './ui/avatar';

export default function PostModal({ open, post, onClose, onToggleLike, liking, origin = { x: '50%', y: '50%' } }) {
    const reduced = useReducedMotion();

    useEffect(() => {
        if (!open) {
            return undefined;
        }

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose?.();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose, open]);

    return (
        <AnimatePresence>
            {open && post && (
                <motion.div
                    className="fixed inset-0 z-[95] overflow-y-auto bg-ink/85 px-4 py-8"
                    initial={
                        reduced
                            ? { opacity: 1 }
                            : { opacity: 0, clipPath: `circle(0% at ${origin.x} ${origin.y})` }
                    }
                    animate={{ opacity: 1, clipPath: `circle(150% at ${origin.x} ${origin.y})` }}
                    exit={
                        reduced
                            ? { opacity: 1 }
                            : { opacity: 0, clipPath: `circle(0% at ${origin.x} ${origin.y})` }
                    }
                    transition={reduced ? { duration: 0 } : { duration: 0.52, ease: [0.76, 0, 0.24, 1] }}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Post preview"
                >
                    <div className="mx-auto max-w-4xl">
                        <div className="mb-4 flex justify-end">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-full border border-mist/45 p-2 text-mist hover:border-volt hover:text-volt"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <article className="editorial-surface rounded-3xl p-6">
                            <header className="mb-5 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <Avatar
                                        name={post.authorName || post.author?.name}
                                        src={post.author?.profilePic || post.author?.imageUrl || ''}
                                        online={Boolean(post.author?.isOnline)}
                                    />
                                    <div>
                                        <p className="font-display text-3xl text-paper">{post.authorName || post.author?.name || 'Author'}</p>
                                        <p className="ui-font text-[10px] uppercase tracking-[0.16em] text-mist">
                                            @{post.authorUsername || post.author?.username || `user-${post.userId}`}
                                        </p>
                                    </div>
                                </div>
                            </header>

                            <h2 className="font-display text-[clamp(2.2rem,5vw,4rem)] leading-[0.9] text-paper">{post.title}</h2>
                            <p className="mt-4 whitespace-pre-line font-body text-lg italic leading-8 text-mist">{post.body}</p>

                            {post.imageUrl && (
                                <img src={post.imageUrl} alt={post.title} className="mt-6 max-h-[34rem] w-full rounded-2xl object-cover" />
                            )}

                            <footer className="mt-6 flex items-center justify-between border-t border-mist/30 pt-4">
                                <span className="inline-flex items-center gap-1 ui-font text-xs uppercase tracking-[0.14em] text-mist">
                                    <MessageCircle className="h-4 w-4" /> {post.commentsCount || 0} comments
                                </span>
                                <LikeButton
                                    likes={Number(post.likes) || 0}
                                    isLiked={Boolean(post.isLiked)}
                                    onToggle={() => onToggleLike(post)}
                                    disabled={liking}
                                />
                            </footer>
                        </article>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
