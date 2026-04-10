import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import LikeButton from './LikeButton';
import { Avatar } from './ui/avatar';

export default function PostModal({ open, post, onClose, onToggleLike, liking, origin = { x: '50%', y: '50%' } }) {
    const reduced = useReducedMotion();
    const imageRef = useRef(null);

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

    const handleImageFullscreen = async () => {
        const element = imageRef.current;
        if (!element || typeof element.requestFullscreen !== 'function') {
            return;
        }

        try {
            await element.requestFullscreen();
        } catch (_error) {
            // Browser may block fullscreen in some contexts.
        }
    };

    const modalContent = (
        <AnimatePresence>
            {open && post ? (
                <motion.div
                    className="fixed inset-0 z-[95] overflow-y-auto bg-black/95 px-2 py-4 sm:px-4 sm:py-8"
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
                    <div className="mx-auto max-w-5xl">
                        <div className="mb-3 flex justify-end sm:mb-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-full border border-white/35 bg-black p-2 text-white hover:border-white/60"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <article className="rounded-2xl border border-white/15 bg-[#0b0f15] p-3.5 shadow-[0_24px_80px_rgba(0,0,0,0.75)] sm:rounded-3xl sm:p-6">
                            <header className="mb-4 flex items-center justify-between gap-3 sm:mb-5">
                                <div className="flex items-center gap-3">
                                    <Avatar
                                        name={post.authorName || post.author?.name}
                                        src={post.author?.profilePic || post.author?.imageUrl || ''}
                                        online={Boolean(post.author?.isOnline)}
                                    />
                                    <div>
                                        <p className="font-display text-2xl text-white sm:text-3xl">{post.authorName || post.author?.name || 'Author'}</p>
                                        <p className="ui-font text-[10px] uppercase tracking-[0.16em] text-white/60">
                                            @{post.authorUsername || post.author?.username || `user-${post.userId}`}
                                        </p>
                                    </div>
                                </div>
                            </header>

                            <h2 className="font-display text-[clamp(1.7rem,7vw,4rem)] leading-[0.95] text-white">{post.title}</h2>
                            <p className="mt-3 whitespace-pre-line font-body text-base italic leading-7 text-white/70 sm:mt-4 sm:text-lg sm:leading-8">{post.body}</p>

                            {post.imageUrl && (
                                <div className="mt-4 rounded-2xl border border-white/10 bg-black p-1.5 sm:mt-6 sm:p-2">
                                    <button type="button" onClick={handleImageFullscreen} className="block w-full text-left" aria-label="Open image in full screen">
                                        <img
                                            ref={imageRef}
                                            src={post.imageUrl}
                                            alt={post.title}
                                            className="max-h-[75vh] w-full cursor-zoom-in rounded-xl object-contain sm:max-h-[80vh]"
                                        />
                                    </button>
                                </div>
                            )}

                            <footer className="mt-4 flex items-center justify-between border-t border-white/15 pt-3 sm:mt-6 sm:pt-4">
                                <span className="inline-flex items-center gap-1 ui-font text-xs uppercase tracking-[0.14em] text-white/60">
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
            ) : null}
        </AnimatePresence>
    );

    if (typeof document === 'undefined') {
        return null;
    }

    return createPortal(modalContent, document.body);
}
