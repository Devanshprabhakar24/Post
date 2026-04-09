import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Compass, Home, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../lib/utils';

const NAV_ITEMS = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/explore', label: 'Explore', icon: Compass },
    { to: '/notifications', label: 'Notifications', icon: Bell },
    { to: '/profile', label: 'Profile', icon: User }
];

export default function LeftSidebar({ onOpenNotifications, mobileOpen = false, onClose, theme = 'dark' }) {
    const isDark = theme === 'dark';

    const navContent = (
        <>
            <div>
                <div className="mb-5 px-2">
                    <motion.div
                        whileHover={{ rotate: -6, scale: 1.06 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 via-sky-400 to-emerald-400 text-slate-950 shadow-[0_12px_26px_rgba(14,165,233,0.35)]"
                    >
                        X
                    </motion.div>
                </div>

                <nav className="space-y-1.5" aria-label="Primary">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;

                        return (
                            <NavLink
                                key={item.label}
                                to={item.to}
                                onClick={item.label === 'Notifications' ? (event) => {
                                    event.preventDefault();
                                    onOpenNotifications?.();
                                    onClose?.();
                                } : onClose}
                                className={({ isActive }) =>
                                    cn(
                                        'group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition',
                                        isDark ? 'text-slate-200' : 'text-slate-700',
                                        isActive
                                            ? (isDark
                                                ? 'bg-cyan-400/20 text-cyan-50 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.25)]'
                                                : 'bg-cyan-500/16 text-cyan-700 shadow-[inset_0_0_0_1px_rgba(6,182,212,0.28)]')
                                            : (isDark
                                                ? 'hover:bg-white/10 hover:text-white'
                                                : 'hover:bg-slate-200/70 hover:text-slate-900')
                                    )
                                }
                            >
                                <Icon className="h-4.5 w-4.5" />
                                <span>{item.label}</span>
                            </NavLink>
                        );
                    })}
                </nav>
            </div>

            <p className={cn('px-2 text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>Curate your social graph in realtime.</p>
        </>
    );

    return (
        <>
            <aside className="sticky top-[88px] hidden h-[calc(100vh-110px)] self-start lg:block">
                <div
                    className={cn(
                        'flex h-full flex-col justify-between rounded-3xl border p-4 backdrop-blur-xl',
                        isDark
                            ? 'border-cyan-200/15 bg-slate-900/72'
                            : 'border-slate-200/80 bg-white/70'
                    )}
                >
                    {navContent}
                </div>
            </aside>

            <AnimatePresence>
                {mobileOpen && (
                    <>
                        <motion.button
                            type="button"
                            aria-label="Close menu"
                            onClick={onClose}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40 bg-black/55 lg:hidden"
                        />

                        <motion.aside
                            initial={{ x: -24, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -22, opacity: 0 }}
                            className={cn(
                                'fixed left-3 top-20 z-50 h-[calc(100vh-96px)] w-[min(86vw,19rem)] rounded-3xl border p-4 backdrop-blur-xl lg:hidden',
                                isDark
                                    ? 'border-cyan-200/20 bg-slate-950/96'
                                    : 'border-slate-200/90 bg-white/95'
                            )}
                        >
                            <div className="flex h-full flex-col justify-between">{navContent}</div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}