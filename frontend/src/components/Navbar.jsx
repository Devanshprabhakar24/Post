import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { Bell, LogOut, Moon, PanelLeft, Sun } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import useMagnet from '../hooks/useMagnet';
import SearchBar from './SearchBar';
import { Avatar } from './ui/avatar';

function MagneticIconButton({ children, onClick, label }) {
    const magnet = useMagnet();

    return (
        <motion.button
            ref={magnet.ref}
            style={magnet.style}
            onMouseMove={magnet.onMouseMove}
            onMouseLeave={magnet.onMouseLeave}
            type="button"
            onClick={onClick}
            aria-label={label}
            className="magnetic-hit grid h-10 w-10 place-items-center rounded-full border border-mist/35 bg-transparent text-mist transition hover:border-volt hover:text-volt"
        >
            {children}
        </motion.button>
    );
}

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
    const reduced = useReducedMotion();
    const { scrollY } = useScroll();
    const onlineSet = useMemo(() => new Set((onlineUsers || []).map((id) => Number(id))), [onlineUsers]);

    const onlineProfiles = useMemo(() => {
        const seen = new Set();
        return (users || [])
            .filter((entry) => {
                const id = Number(entry?.userId);
                if (!Number.isFinite(id) || seen.has(id) || !onlineSet.has(id)) {
                    return false;
                }
                seen.add(id);
                return true;
            })
            .slice(0, 4);
    }, [onlineSet, users]);

    const headerHeight = useTransform(scrollY, [0, 80], [72, 52]);
    const blurOpacity = useTransform(scrollY, [0, 80], [0.08, 0.86]);
    const logoScale = useTransform(scrollY, [0, 80], [1.2, 0.9]);

    return (
        <motion.header
            style={reduced ? undefined : { height: headerHeight }}
            className="noise-divider sticky top-0 z-50 border-b border-transparent px-3 sm:px-5"
        >
            <motion.div
                style={reduced ? undefined : { opacity: blurOpacity }}
                className="absolute inset-0 -z-10 border-b border-volt/45 bg-ink-soft/60 backdrop-blur-[20px]"
            />

            <div className="mx-auto flex h-full w-full max-w-[1550px] items-center gap-3">
                <button
                    type="button"
                    onClick={onToggleSidebar}
                    className="grid h-10 w-10 place-items-center rounded-full border border-mist/40 text-mist lg:hidden"
                    aria-label="Open sidebar"
                >
                    <PanelLeft className="h-4.5 w-4.5" />
                </button>

                <Link to="/" className="shrink-0">
                    <motion.div style={reduced ? undefined : { scale: logoScale }} className="origin-left">
                        <p className="font-display text-[2rem] leading-none text-paper">POST</p>
                        <div className="mt-0.5 flex items-center gap-2">
                            <span className="h-px w-10 bg-volt" />
                            <p className="ui-font text-[10px] tracking-[0.26em] text-mist">EXPLORER</p>
                        </div>
                    </motion.div>
                </Link>

                <div className="ml-1 hidden flex-1 lg:block">
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

                <div className="ml-auto flex items-center gap-2">
                    <div className="hidden items-center pr-1 sm:flex">
                        {onlineProfiles.map((entry, index) => (
                            <div key={entry.userId} className={index > 0 ? '-ml-2' : ''}>
                                <Avatar
                                    name={entry.name || entry.username}
                                    src={entry.profilePic || entry.imageUrl || ''}
                                    online
                                    className="h-8 w-8 border border-volt/55"
                                />
                            </div>
                        ))}
                    </div>

                    <div className="relative">
                        <MagneticIconButton onClick={onOpenNotifications} label="Open notifications">
                            <Bell className="h-4.5 w-4.5" />
                        </MagneticIconButton>
                        {unreadCount > 0 && (
                            <span className="live-dot pointer-events-none absolute -right-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-ember px-1 ui-font text-[10px] text-ink">
                                {Math.min(99, unreadCount)}
                            </span>
                        )}
                    </div>

                    <MagneticIconButton
                        onClick={onToggleTheme}
                        label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    >
                        {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
                    </MagneticIconButton>

                    {isAuthenticated && (
                        <Link to="/profile" className="hidden sm:block">
                            <Avatar
                                name={user?.name}
                                src={user?.profilePic || user?.imageUrl || user?.profilePicData || ''}
                                className="h-9 w-9 border border-volt/40"
                            />
                        </Link>
                    )}

                    {isAdmin && (
                        <Link to="/admin" className="hidden rounded-full border border-mist/35 px-3 py-1.5 ui-font text-[11px] uppercase tracking-[0.14em] text-mist hover:border-volt hover:text-volt sm:inline-flex">
                            Admin
                        </Link>
                    )}

                    {isAuthenticated && (
                        <MagneticIconButton onClick={onLogout} label="Log out">
                            <LogOut className="h-4.5 w-4.5" />
                        </MagneticIconButton>
                    )}
                </div>
            </div>

            <div className="mx-auto mt-2 w-full max-w-[1550px] pb-3 lg:hidden">
                <SearchBar
                    value={query}
                    onChange={onQueryChange}
                    onClear={onClear}
                    searching={searching}
                    inputRef={searchInputRef}
                    inputId="global-post-search-mobile"
                />
            </div>
        </motion.header>
    );
}
