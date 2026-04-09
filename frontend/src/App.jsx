import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import Cursor from './components/Cursor';
import ErrorBoundary from './components/ErrorBoundary';
import LeftSidebar from './components/LeftSidebar';
import Loader from './components/Loader';
import Navbar from './components/Navbar';
import NotificationPanel from './components/NotificationPanel';
import RightPanel from './components/RightPanel';
import { useAuth } from './context/AuthContext';
import { useSocketContext } from './context/SocketContext';
import { contentRise, contentStagger, pageTransition, pageVariants } from './lib/motion';

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

function AnimatedRoute({ children }) {
    const reduced = useReducedMotion();

    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={reduced ? { duration: 0 } : pageTransition}
            className="min-h-[calc(100vh-80px)]"
        >
            <motion.div variants={contentStagger} initial="hidden" animate="show" className="min-h-[calc(100vh-80px)]">
                <motion.div variants={contentRise} transition={reduced ? { duration: 0 } : { duration: 0.55 }}>
                    {children}
                </motion.div>
            </motion.div>
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
                onOpenNotifications={() => setNotificationOpen((previous) => !previous)}
                onLogout={() => {
                    logout();
                    toast.success('Logged out');
                }}
            />

            <NotificationPanel open={notificationOpen} onClose={() => setNotificationOpen(false)} />

            <main
                id="main-content"
                aria-label="Main content"
                className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-5 px-4 pb-14 pt-6 lg:grid-cols-[260px_minmax(0,860px)_320px]"
            >
                <LeftSidebar
                    onOpenNotifications={() => setNotificationOpen(true)}
                    mobileOpen={mobileSidebarOpen}
                    onClose={() => setMobileSidebarOpen(false)}
                    theme={theme}
                />

                <section className="min-h-[calc(100vh-92px)] min-w-0">
                    <Suspense fallback={<Loader count={7} />}>
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
        <main className="mx-auto flex min-h-screen w-full max-w-[1400px] items-center justify-center px-4 py-8">
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
        document.documentElement.classList.toggle('dark', theme === 'dark');
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
            <Cursor />
            <div className="min-h-screen bg-transparent text-paper">
                <a
                    href="#main-content"
                    className="sr-only z-[100] rounded bg-volt px-4 py-2 text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
                >
                    Skip to main content
                </a>

                {isAuthRoute || !isAuthenticated ? (
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
