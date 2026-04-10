import { Bell, LogOut, Menu, Moon, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import SearchBar from './SearchBar';
import { Avatar } from './ui/avatar';

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
    onLogout,
    unreadCount,
    onOpenNotifications
}) {
    return (
        <header className="sticky top-0 z-50 border-b border-[var(--border-soft)] bg-[var(--bg-card)] px-2 py-2 sm:px-4">
            <div className="mx-auto flex w-full max-w-[1400px] items-center gap-1.5 sm:gap-2">
                <button
                    type="button"
                    onClick={onToggleSidebar}
                    className="grid h-9 w-9 place-items-center rounded-full border border-[var(--border-soft)] text-[var(--text-secondary)] md:hidden"
                    aria-label="Open sidebar"
                >
                    <Menu className="h-4.5 w-4.5" />
                </button>

                <Link to="/" className="shrink-0">
                    <p className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">Post<span className="text-[var(--accent-red)]">.</span></p>
                    <p className="hidden text-[10px] tracking-[0.35em] text-[var(--text-secondary)] sm:block">EXPLORER</p>
                </Link>

                <div className="ml-2 flex-1">
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

                <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
                    <button
                        type="button"
                        onClick={onOpenNotifications}
                        aria-label="Open notifications"
                        className="relative grid h-9 w-9 place-items-center rounded-full border border-[var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-soft)]"
                    >
                        <Bell className="h-4.5 w-4.5" />
                        {unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--accent-red)]" />}
                    </button>

                    <button
                        type="button"
                        onClick={onToggleTheme}
                        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        className="grid h-9 w-9 place-items-center rounded-full border border-[var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-soft)]"
                    >
                        {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
                    </button>

                    {isAuthenticated && (
                        <Link
                            to="/profile"
                            className="block"
                            aria-label="Open profile"
                        >
                            <Avatar
                                name={user?.name || user?.username || 'User'}
                                src={user?.profilePic || user?.imageUrl || user?.profilePicData || ''}
                                className="h-9 w-9 border border-[var(--border-soft)]"
                            />
                        </Link>
                    )}

                    {isAdmin && (
                        <Link
                            to="/admin"
                            className="hidden rounded-full border border-[var(--border-soft)] px-3 py-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-card-soft)] sm:inline-flex"
                        >
                            Admin
                        </Link>
                    )}

                    {isAuthenticated && (
                        <button
                            type="button"
                            onClick={onLogout}
                            aria-label="Log out"
                            className="grid h-9 w-9 place-items-center rounded-full border border-[var(--border-soft)] text-[var(--text-secondary)] sm:hidden"
                        >
                            <LogOut className="h-4.5 w-4.5" />
                        </button>
                    )}

                    {isAuthenticated && (
                        <button
                            type="button"
                            onClick={onLogout}
                            aria-label="Log out"
                            className="hidden h-9 w-9 place-items-center rounded-full border border-[var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-soft)] sm:grid"
                        >
                            <LogOut className="h-4.5 w-4.5" />
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
