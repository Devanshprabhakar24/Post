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

export default function LeftSidebar({ onOpenNotifications, mobileOpen = false, onClose }) {
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
                                        'group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-300 transition',
                                        isActive
                                            ? 'bg-cyan-500/15 text-cyan-100'
                                            : 'hover:bg-white/5 hover:text-white'
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

            <p className="px-2 text-xs text-slate-500">Curate your social graph in realtime.</p>
        </>
    );

    return (
        <>
            <aside className="sticky top-[88px] hidden h-[calc(100vh-110px)] self-start lg:block">
                <div className="flex h-full flex-col justify-between rounded-3xl border border-cyan-200/10 bg-slate-900/50 p-4 backdrop-blur-xl">
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
                            className="fixed left-3 top-20 z-50 h-[calc(100vh-96px)] w-[min(86vw,19rem)] rounded-3xl border border-cyan-200/10 bg-slate-950/95 p-4 backdrop-blur-xl lg:hidden"
                        >
                            <div className="flex h-full flex-col justify-between">{navContent}</div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}