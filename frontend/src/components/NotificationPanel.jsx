import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { BellRing, CheckCheck, ChevronRight, Heart, MessageCircle, Trash2, UserRound } from 'lucide-react';
import { useSocketContext } from '../context/SocketContext';
import { Button } from './ui/button';

function getNotificationLabel(item) {
    if (item?.type === 'like') {
        return { label: 'Like', icon: Heart, action: 'Open post' };
    }

    if (item?.type === 'comment') {
        return { label: 'Comment', icon: MessageCircle, action: 'View discussion' };
    }

    if (item?.type === 'reply') {
        return { label: 'Reply', icon: MessageCircle, action: 'View thread' };
    }

    if (item?.type === 'post') {
        return { label: 'Post', icon: UserRound, action: 'Open post' };
    }

    return { label: 'Notification', icon: BellRing, action: 'Open item' };
}

export default function NotificationPanel({ open, onClose }) {
    const { notifications, markAllRead, markNotificationAsRead, clearNotifications } = useSocketContext();
    const prefersReducedMotion = useReducedMotion();

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.button
                        type="button"
                        aria-label="Close notifications"
                        onClick={onClose}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40 bg-black/40"
                    />

                    <motion.aside
                        initial={{ opacity: 0, x: 48 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 48 }}
                        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                        className="fixed right-0 top-0 z-50 h-screen w-[min(94vw,26rem)] border-l border-cyan-200/10 bg-slate-950/95 p-4 sm:p-5 shadow-2xl backdrop-blur-xl"
                    >
                        <div className="mb-4 mt-1 flex items-center justify-between">
                            <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                                <BellRing className="h-4 w-4 text-cyan-300" /> Notifications
                            </h3>
                            <button
                                type="button"
                                onClick={onClose}
                                className="text-xs text-slate-400 transition hover:text-white"
                            >
                                Close
                            </button>
                        </div>

                        <div className="mb-4 flex items-center gap-2">
                            <Button type="button" variant="ghost" size="sm" onClick={markAllRead}>
                                <CheckCheck className="mr-1 h-3.5 w-3.5" /> Mark all read
                            </Button>
                            <Button type="button" variant="ghost" size="sm" onClick={clearNotifications}>
                                <Trash2 className="mr-1 h-3.5 w-3.5" /> Clear
                            </Button>
                        </div>

                        <div className="max-h-[calc(100vh-8.9rem)] space-y-2.5 overflow-y-auto pr-1">
                            {notifications.length === 0 ? (
                                <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 text-sm text-slate-300">
                                    No notifications yet.
                                </div>
                            ) : (
                                notifications.map((item) => (
                                    item.targetUrl ? (
                                        (() => {
                                            const { label, icon: Icon, action } = getNotificationLabel(item);

                                            return (
                                        <Link
                                            key={item.id}
                                            to={item.targetUrl}
                                            className={`block rounded-xl border p-3.5 text-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:border-cyan-300/60 hover:bg-cyan-500/15 ${
                                                item.read
                                                    ? 'border-white/10 bg-white/5 text-slate-300'
                                                    : 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100'
                                            }`}
                                        >
                                            <div className="mb-2 flex items-center justify-between gap-2">
                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-cyan-200">
                                                    <Icon className="h-3 w-3" /> {label}
                                                </span>
                                                <span className="inline-flex items-center gap-1 text-[11px] text-cyan-100/80">
                                                    {action} <ChevronRight className="h-3.5 w-3.5" />
                                                </span>
                                            </div>
                                            <p className="font-medium leading-snug text-white">{item.message}</p>
                                            <p className="mt-1 text-xs text-slate-400">
                                                {new Date(item.createdAt).toLocaleTimeString()}
                                            </p>
                                            {!item.read && (
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.preventDefault();
                                                        event.stopPropagation();
                                                        markNotificationAsRead(item.id);
                                                    }}
                                                    className="mt-2 text-xs text-cyan-200 hover:text-cyan-100"
                                                >
                                                    Mark as read
                                                </button>
                                            )}
                                        </Link>
                                            );
                                        })()
                                    ) : (
                                        <div
                                            key={item.id}
                                            className={`rounded-xl border p-3.5 text-sm ${
                                                item.read
                                                    ? 'border-white/10 bg-white/5 text-slate-300'
                                                    : 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100'
                                            }`}
                                        >
                                            <p className="font-medium leading-snug text-white">{item.message}</p>
                                            <p className="mt-1 text-xs text-slate-400">
                                                {new Date(item.createdAt).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    )
                                ))
                            )}
                        </div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
}
