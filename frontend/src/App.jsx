import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import LeftSidebar from './components/LeftSidebar';
import Loader from './components/Loader';
import Navbar from './components/Navbar';
import NotificationPanel from './components/NotificationPanel';
import RightPanel from './components/RightPanel';
import { useAuth } from './context/AuthContext';
import { useSocketContext } from './context/SocketContext';

const Home = lazy(() => import('./pages/Home'));
const Explore = lazy(() => import('./pages/Explore'));
const HashtagPage = lazy(() => import('./pages/HashtagPage'));
const PostDetails = lazy(() => import('./pages/PostDetails'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Profile = lazy(() => import('./pages/Profile'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

const THEME_KEY = 'post-explorer-theme';

function getStoredTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') {
        return stored;
    }

    return 'dark';
}

const pageTransition = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 }
};

function AnimatedRoute({ children }) {
    const prefersReducedMotion = useReducedMotion();

    return (
        <motion.div
            variants={pageTransition}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="min-h-[calc(100vh-72px)]"
        >
            {children}
        </motion.div>
    );
}

function ProtectedRoute({ isAuthenticated, children }) {
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    return children;
}

function AppShell({ pageProps, theme, setTheme, query, setQuery, searching, searchInputRef, users, panelPosts }) {
    const { user, isAuthenticated, isAdmin, logout } = useAuth();
    const { unreadCount, onlineUsers } = useSocketContext();
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    return (
        <>
            <Navbar
                query={query}
                onQueryChange={setQuery}
                onClear={() => setQuery('')}
                searching={searching}
                onToggleSidebar={() => setMobileSidebarOpen((value) => !value)}
                theme={theme}
                onToggleTheme={() => setTheme((previous) => (previous === 'dark' ? 'light' : 'dark'))}
                searchInputRef={searchInputRef}
                isAuthenticated={isAuthenticated}
                isAdmin={isAdmin}
                user={user}
                unreadCount={unreadCount}
                users={users}
                onlineUsers={onlineUsers}
                onOpenNotifications={() => setNotificationOpen((prev) => !prev)}
                onLogout={() => {
                    logout();
                    toast.success('Logged out');
                }}
            />

            <NotificationPanel open={notificationOpen} onClose={() => setNotificationOpen(false)} />

            <main
                id="main-content"
                aria-label="Main content"
                className="mx-auto grid w-full max-w-[1520px] grid-cols-1 gap-5 px-4 pb-12 pt-6 sm:px-6 lg:grid-cols-[240px_minmax(0,700px)_320px] lg:justify-center lg:gap-7 lg:px-8"
            >
                <LeftSidebar
                    onOpenNotifications={() => setNotificationOpen(true)}
                    mobileOpen={mobileSidebarOpen}
                    onClose={() => setMobileSidebarOpen(false)}
                />

                <section className="min-h-[calc(100vh-88px)] min-w-0">
                    <Suspense fallback={<Loader count={8} />}>
                        <AnimatePresence mode="wait">
                            <Routes>
                                <Route
                                    path="/"
                                    element={
                                        <AnimatedRoute>
                                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                                <Home {...pageProps} />
                                            </ProtectedRoute>
                                        </AnimatedRoute>
                                    }
                                />
                                <Route
                                    path="/explore"
                                    element={
                                        <AnimatedRoute>
                                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                                <Explore {...pageProps} />
                                            </ProtectedRoute>
                                        </AnimatedRoute>
                                    }
                                />
                                <Route
                                    path="/hashtags/:tag"
                                    element={
                                        <AnimatedRoute>
                                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                                <HashtagPage {...pageProps} />
                                            </ProtectedRoute>
                                        </AnimatedRoute>
                                    }
                                />
                                <Route
                                    path="/posts/:id"
                                    element={
                                        <AnimatedRoute>
                                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                                <PostDetails />
                                            </ProtectedRoute>
                                        </AnimatedRoute>
                                    }
                                />
                                <Route
                                    path="/profile/:id?"
                                    element={
                                        <AnimatedRoute>
                                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                                <Profile />
                                            </ProtectedRoute>
                                        </AnimatedRoute>
                                    }
                                />
                                <Route
                                    path="/admin"
                                    element={
                                        <AnimatedRoute>
                                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                                {isAdmin ? <AdminDashboard /> : <Navigate to="/" replace />}
                                            </ProtectedRoute>
                                        </AnimatedRoute>
                                    }
                                />
                                <Route
                                    path="/login"
                                    element={
                                        <AnimatedRoute>
                                            <Login />
                                        </AnimatedRoute>
                                    }
                                />
                                <Route
                                    path="/register"
                                    element={
                                        <AnimatedRoute>
                                            <Register />
                                        </AnimatedRoute>
                                    }
                                />
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </AnimatePresence>
                    </Suspense>
                </section>

                <RightPanel users={users} posts={panelPosts} />
            </main>
        </>
    );
}

function AuthLayout() {
    return (
        <main className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-7xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
            <Suspense fallback={<Loader count={1} />}>
                <AnimatePresence mode="wait">
                    <Routes>
                        <Route
                            path="/login"
                            element={
                                <AnimatedRoute>
                                    <Login />
                                </AnimatedRoute>
                            }
                        />
                        <Route
                            path="/register"
                            element={
                                <AnimatedRoute>
                                    <Register />
                                </AnimatedRoute>
                            }
                        />
                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </Routes>
                </AnimatePresence>
            </Suspense>
        </main>
    );
}

export default function App() {
    const location = useLocation();
    const searchInputRef = useRef(null);
    const [query, setQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState('');
    const [sortMode, setSortMode] = useState('latest');
    const [users, setUsers] = useState([]);
    const [panelPosts, setPanelPosts] = useState([]);
    const [theme, setTheme] = useState(getStoredTheme);
    const { isAuthenticated } = useAuth();
    const isAuthRoute = location.pathname === '/login' || location.pathname === '/register';

    useEffect(() => {
        localStorage.setItem(THEME_KEY, theme);
        const root = document.documentElement;
        root.classList.toggle('dark', theme === 'dark');
    }, [theme]);

    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                searchInputRef.current?.focus();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [location.pathname]);

    const pageProps = useMemo(
        () => ({
            query,
            setQuery,
            searching,
            setSearching,
            selectedUser,
            setSelectedUser,
            sortMode,
            setSortMode,
            users,
            setUsers,
            setPanelPosts
        }),
        [query, searching, selectedUser, sortMode, users]
    );

    return (
        <ErrorBoundary>
            <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-surface-950 dark:text-slate-100">
            <a
                href="#main-content"
                className="sr-only z-[100] rounded-md bg-blue-600 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
            >
                Skip to main content
            </a>

            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                <div className="ambient-grid absolute inset-0 opacity-70" />
                <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
                <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
                <div className="absolute left-1/3 top-2/3 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />
            </div>

            {isAuthRoute ? (
                <AuthLayout />
            ) : (
                <AppShell
                    pageProps={pageProps}
                    query={query}
                    setQuery={setQuery}
                    searching={searching}
                    searchInputRef={searchInputRef}
                    users={users}
                    panelPosts={panelPosts}
                    theme={theme}
                    setTheme={setTheme}
                />
            )}
            </div>
        </ErrorBoundary>
    );
}
