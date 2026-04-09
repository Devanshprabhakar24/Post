import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import { useEffect } from 'react';
import LikeButton from './LikeButton';
import { Avatar } from './ui/avatar';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';

export default function PostModal({ open, post, onClose, onToggleLike, liking }) {
    const prefersReducedMotion = useReducedMotion();

    useEffect(() => {
        if (!open) {
            return undefined;
        }

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, onClose]);

    return (
        <AnimatePresence>
            {open && post && (
                <>
                    <motion.button
                        type="button"
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/60"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />

                    <motion.div
                        initial={{ y: 40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 20, opacity: 0 }}
                        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Post preview"
                        className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-white/15 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl"
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <p className="text-xs uppercase tracking-[0.2em] text-blue-300">Quick View</p>
                            <Button variant="ghost" size="icon" onClick={onClose}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <Card className="border-white/10 bg-white/5">
                            <CardHeader className="space-y-4">
                                <h3 className="text-2xl font-semibold text-white">{post.title}</h3>
                                <div className="flex items-center gap-3 text-sm text-slate-300">
                                    <Avatar name={post.authorName || post.author?.name} online={Boolean(post.author?.isOnline)} />
                                    <div>
                                        {(post.authorName || post.author?.name) && (
                                            <p className="font-medium text-slate-100">{post.authorName || post.author?.name}</p>
                                        )}
                                        {(post.authorEmail || post.author?.email || post.authorUsername || post.author?.username) && (
                                            <p className="text-xs text-slate-400">
                                                {post.authorEmail || post.author?.email || post.authorUsername || post.author?.username}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <p className="whitespace-pre-line leading-7 text-slate-200">{post.body}</p>
                                {post.imageUrl && (
                                    <img src={post.imageUrl} alt={post.title} className="max-h-96 w-full rounded-2xl object-cover" />
                                )}
                                {Array.isArray(post.hashtags) && post.hashtags.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
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
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="inline-flex items-center gap-2 text-sm text-slate-300">
                                        <MessageCircle className="h-4 w-4" />
                                        {post.commentsCount || 0} comments
                                    </div>
                                    <LikeButton
                                        likes={Number(post.likes) || 0}
                                        isLiked={Boolean(post.isLiked)}
                                        onToggle={() => onToggleLike(post)}
                                        disabled={liking}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
