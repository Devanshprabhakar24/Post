import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BellRing, CheckCheck, ChevronRight, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSocketContext } from '../context/SocketContext';
import { drawerItemVariants, drawerVariants } from '../lib/motion';

export default function NotificationPanel({ open, onClose }) {
    const { notifications, markAllRead, markNotificationAsRead, clearNotifications } = useSocketContext();
    const reduced = useReducedMotion();

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.button
                        type="button"
                        onClick={onClose}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[85] bg-black/55"
                        aria-label="Close notifications"
                    />

                    <motion.aside
                        variants={drawerVariants}
                        initial="closed"
                        animate="open"
                        exit="closed"
                        transition={reduced ? { duration: 0 } : undefined}
                        className="fixed right-0 top-0 z-[90] h-screen w-[min(95vw,430px)] border-l border-[var(--border-soft)] bg-[var(--bg-card)] p-5 shadow-2xl backdrop-blur-2xl dark:border-volt/45"
                    >
                        <div className="mb-5 flex items-center justify-between">
                            <h3 className="font-display text-4xl text-[var(--text-primary)]">Alerts</h3>
                            <button type="button" onClick={onClose} className="ui-font text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)] hover:text-[var(--accent-red)]">
                                Close
                            </button>
                        </div>

                        <div className="mb-4 flex gap-2">
                            <button type="button" onClick={markAllRead} className="rounded-full border border-volt/55 px-3 py-1 ui-font text-[11px] uppercase tracking-[0.14em] text-volt hover:bg-volt hover:text-ink">
                                <CheckCheck className="mr-1 inline h-3 w-3" /> Mark all
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (window.confirm('Clear all notifications?')) {
                                        clearNotifications();
                                    }
                                }}
                                className="rounded-full border border-[var(--border-soft)] px-3 py-1 ui-font text-[11px] uppercase tracking-[0.14em] text-[var(--text-secondary)] hover:border-ember hover:text-ember"
                            >
                                <Trash2 className="mr-1 inline h-3 w-3" /> Clear
                            </button>
                        </div>

                        <div className="max-h-[calc(100vh-9rem)] space-y-2 overflow-y-auto pr-1">
                            {notifications.length === 0 ? (
                                <div className="rounded-2xl border border-[var(--border-soft)] p-4 text-center">
                                    <BellRing className="mx-auto h-6 w-6 text-[var(--text-tertiary)]" />
                                    <p className="mt-2 font-body italic text-[var(--text-secondary)]">No alerts yet.</p>
                                </div>
                            ) : (
                                notifications.map((item) => (
                                    <motion.div
                                        key={item.id}
                                        variants={drawerItemVariants}
                                        className={`rounded-2xl border p-3 ${item.read ? 'border-[var(--border-soft)] bg-[var(--bg-card-soft)]' : 'border-volt/50 bg-volt/10'}`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-body text-sm text-[var(--text-primary)]">{item.message}</p>
                                                <p className="mt-1 ui-font text-[10px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                                                    {new Date(item.createdAt).toLocaleTimeString()}
                                                </p>
                                            </div>
                                            {!item.read && (
                                                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-ember" />
                                            )}
                                        </div>

                                        <div className="mt-2 flex items-center justify-between gap-2">
                                            {!item.read ? (
                                                <button
                                                    type="button"
                                                    onClick={() => markNotificationAsRead(item.id)}
                                                    className="ui-font text-[10px] uppercase tracking-[0.14em] text-volt"
                                                >
                                                    Mark read
                                                </button>
                                            ) : <span />}

                                            {item.targetUrl && (
                                                <Link to={item.targetUrl} onClick={onClose} className="inline-flex items-center gap-1 ui-font text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                                                    Open <ChevronRight className="h-3 w-3" />
                                                </Link>
                                            )}
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
}
