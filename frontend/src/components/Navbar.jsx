import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { Bell, Command, LogOut, Moon, PanelLeft, Search, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import SearchBar from './SearchBar';
import { Avatar } from './ui/avatar';
import { Button } from './ui/button';

export default function Navbar({
    query,
    onQueryChange,
    onClear,
    searching,
    onToggleSidebar,
    theme,
    onToggleTheme,
    searchInputRef,
    isAuthenticated,
    isAdmin,
    user,
    users,
    onlineUsers,
    onLogout,
    unreadCount,
    onOpenNotifications
}) {
    const onlineSet = useMemo(() => new Set((onlineUsers || []).map((id) => Number(id))), [onlineUsers]);
    const uniqueUsers = useMemo(() => {
        const seen = new Set();
        return (users || []).filter((entry) => {
            const userId = Number(entry.userId);
            if (!Number.isFinite(userId) || seen.has(userId)) {
                return false;
            }

            seen.add(userId);
            return true;
        });
    }, [users]);
    const onlineProfiles = useMemo(
        () => uniqueUsers.filter((entry) => onlineSet.has(Number(entry.userId))).slice(0, 4),
        [onlineSet, uniqueUsers]
    );

    return (
        <header className="sticky top-0 z-40 border-b border-cyan-200/10 bg-slate-950/70 backdrop-blur-2xl dark:bg-slate-950/70">
            <div className="mx-auto flex h-[74px] w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8" role="navigation" aria-label="Primary navigation">
                <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="lg:hidden" aria-label="Open filters panel">
                    <PanelLeft className="h-5 w-5" />
                </Button>

                <Link to="/" className="flex items-center gap-3">
                    <motion.div
                        className="relative h-10 w-10 rounded-2xl bg-gradient-to-br from-cyan-300 via-sky-400 to-emerald-400 shadow-[0_10px_30px_rgba(14,165,233,0.42)]"
                        whileHover={{ rotate: -8, scale: 1.08 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                    >
                        <span className="absolute inset-1 rounded-xl border border-white/25" />
                    </motion.div>
                    <div className="leading-tight">
                        <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-200/80">Realtime Social Graph</p>
                        <h1 className="text-[1.03rem] font-semibold text-white">Post Explorer</h1>
                    </div>
                </Link>

                <div className="hidden flex-1 lg:block">
                    <SearchBar
                        value={query}
                        onChange={onQueryChange}
                        onClear={onClear}
                        searching={searching}
                        inputRef={searchInputRef}
                        compact
                        inputId="global-post-search-desktop"
                    />
                </div>

                <div className="ml-auto flex items-center gap-2 text-sm text-slate-300">
                    {isAuthenticated && (
                        <div className="hidden items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 lg:inline-flex">
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-200">
                                {onlineSet.size} online
                            </span>
                            <div className="ml-1 flex items-center">
                                {onlineProfiles.length > 0 ? (
                                    onlineProfiles.map((profile, index) => (
                                        <div
                                            key={profile.userId}
                                            className={index === 0 ? '' : '-ml-2'}
                                            title={profile.name || profile.username || `User ${profile.userId}`}
                                        >
                                            <Avatar
                                                name={profile.name || profile.username}
                                                online
                                                className="h-7 w-7 border-slate-950"
                                            />
                                        </div>
                                    ))
                                ) : (
                                    <span className="text-xs text-emerald-200/70">No active users</span>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-300 lg:inline-flex">
                        <Command className="h-3.5 w-3.5" /> /
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onToggleTheme}
                        aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                    >
                        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </Button>

                    <Button variant="ghost" size="icon" aria-label="Open notifications" onClick={onOpenNotifications}>
                        <motion.span
                            key={unreadCount > 0 ? `shake-${unreadCount}` : 'idle'}
                            initial={{ rotate: 0 }}
                            animate={unreadCount > 0 ? { rotate: [0, -12, 9, -6, 3, 0] } : { rotate: 0 }}
                            transition={{ duration: 0.56, ease: [0.22, 1, 0.36, 1] }}
                            className="relative inline-flex"
                        >
                            <Bell className="h-4 w-4" />
                            {unreadCount > 0 && (
                                <span className="absolute -right-1.5 -top-1.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                                    {Math.min(99, unreadCount)}
                                </span>
                            )}
                        </motion.span>
                    </Button>

                    {isAuthenticated && (
                        <Link to="/profile" className="hidden sm:inline-flex">
                            <Button variant="ghost" size="sm" className="inline-flex items-center gap-2">
                                <Avatar name={user?.name} src={user?.profilePic || user?.imageUrl || user?.profilePicData || ''} className="h-6 w-6" />
                                <span>{user?.name?.split(' ')[0] || 'Profile'}</span>
                            </Button>
                        </Link>
                    )}

                    {isAdmin && (
                        <Link to="/admin" className="hidden sm:inline-flex">
                            <Button variant="ghost" size="sm">Admin</Button>
                        </Link>
                    )}

                    {isAuthenticated ? (
                        <Button variant="ghost" size="icon" onClick={onLogout} aria-label="Logout">
                            <LogOut className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Link to="/login" className="inline-flex">
                            <Button variant="ghost" size="sm">Login</Button>
                        </Link>
                    )}
                </div>
            </div>

            <div className="mx-auto w-full max-w-7xl px-4 pb-3 sm:px-6 lg:hidden lg:px-8">
                <SearchBar
                    value={query}
                    onChange={onQueryChange}
                    onClear={onClear}
                    searching={searching}
                    inputRef={searchInputRef}
                    inputId="global-post-search-mobile"
                />
                <div className="mt-1 inline-flex items-center gap-1 text-xs text-slate-400">
                    <Search className="h-3.5 w-3.5" /> Press <span className="rounded bg-white/10 px-1">/</span> to focus search
                </div>
            </div>
        </header>
    );
}
