import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import EmptyState from '../components/EmptyState';
import Loader from '../components/Loader';
import PostModal from '../components/PostModal';
import PostCard from '../components/PostCard';
import { useAuth } from '../context/AuthContext';
import { useSocketContext } from '../context/SocketContext';
import useDebounce from '../hooks/useDebounce';
import {
    createPost,
    deletePost,
    fetchPosts,
    fetchUsers,
    likePost,
    syncPosts,
    unlikePost
} from '../services/api';
import { emitSearch, onLikeUpdated, onNewPost, onSearchResults } from '../services/socket';

const PAGE_SIZE = 12;

function dedupePosts(list) {
    const seen = new Set();

    return (Array.isArray(list) ? list : []).filter((post) => {
        const postId = Number(post?.postId);

        if (!Number.isFinite(postId) || seen.has(postId)) {
            return false;
        }

        seen.add(postId);
        return true;
    });
}

function sanitizePost(post, currentUserId, userMap, commentsMap, isUserOnline) {
    const likedBy = Array.isArray(post?.likedBy) ? post.likedBy : [];
    const likes = Number(post?.likes) || 0;
    const authorProfile = userMap[post?.userId] || {};
    const author = post?.author || (authorProfile.name || authorProfile.email || authorProfile.username ? {
        userId: post?.userId,
        name: authorProfile.name || '',
        email: authorProfile.email || '',
        username: authorProfile.username || '',
        imageUrl: authorProfile.imageUrl || '',
        bio: authorProfile.bio || '',
        isOnline: authorProfile.isOnline ?? false
    } : undefined);

    return {
        ...post,
        likedBy,
        likes,
        isLiked: likedBy.includes(currentUserId),
        author: author
            ? {
                  ...author,
                  isOnline: typeof isUserOnline === 'function' ? Boolean(isUserOnline(post?.userId) || author?.isOnline) : Boolean(author?.isOnline)
              }
            : author,
        authorName: post?.author?.name || authorProfile.name || '',
        authorEmail: post?.author?.email || authorProfile.email || '',
        authorUsername: post?.author?.username || authorProfile.username || '',
        imageUrl: post?.imageUrl || '',
        hashtags: Array.isArray(post?.hashtags) ? post.hashtags : [],
        commentsCount: post?.commentsCount ?? commentsMap[post?.postId] ?? 0
    };
}

function applyLikeToList(list, postId, userId, shouldLike) {
    return list.map((item) => {
        if (item.postId !== postId) {
            return item;
        }

        const currentLikedBy = Array.isArray(item.likedBy) ? item.likedBy : [];
        const nextLikedBy = shouldLike
            ? Array.from(new Set([...currentLikedBy, userId]))
            : currentLikedBy.filter((entry) => entry !== userId);

        return {
            ...item,
            likedBy: nextLikedBy,
            likes: Math.max(0, Number(item.likes || 0) + (shouldLike ? 1 : -1)),
            isLiked: shouldLike
        };
    });
}

function applySocketLike(list, payload, currentUserId) {
    return list.map((item) => {
        if (item.postId !== payload.postId) {
            return item;
        }

        const likedBy = Array.isArray(payload.likedBy) ? payload.likedBy : [];

        return {
            ...item,
            likedBy,
            likes: Number(payload.totalLikes) || 0,
            isLiked: likedBy.includes(currentUserId)
        };
    });
}

const listVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05
        }
    }
};

export default function Home({
    query,
    searching,
    setSearching,
    selectedUser,
    sortMode,
    setSortMode,
    users,
    setUsers,
    forcedHashtag = '',
    setPanelPosts
}) {
    const navigate = useNavigate();
    const prefersReducedMotion = useReducedMotion();
    const { user, isAdmin } = useAuth();
    const { isUserOnline } = useSocketContext();
    const currentUserId = String(user?.userId || '');
    const sentinelRef = useRef(null);
    const commentsCacheRef = useRef({});
    const postsCacheRef = useRef([]);

    const [posts, setPosts] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [commentCounts, setCommentCounts] = useState({});
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [likingIds, setLikingIds] = useState(new Set());
    const [previewPost, setPreviewPost] = useState(null);
    const [composerOpen, setComposerOpen] = useState(false);
    const [composer, setComposer] = useState({ title: '', body: '' });
    const [creatingPost, setCreatingPost] = useState(false);
    const [selectedHashtag, setSelectedHashtag] = useState('');
    const [composerImageFile, setComposerImageFile] = useState(null);
    const [composerImagePreview, setComposerImagePreview] = useState('');

    const debouncedQuery = useDebounce(query, 300);

    useEffect(() => {
        setSelectedHashtag(String(forcedHashtag || '').toLowerCase());
    }, [forcedHashtag]);

    useEffect(() => {
        commentsCacheRef.current = commentCounts;
    }, [commentCounts]);

    useEffect(() => {
        postsCacheRef.current = posts;
    }, [posts]);

    const userMap = useMemo(
        () =>
            users.reduce((acc, user) => {
                acc[user.userId] = {
                    name: user.name,
                    email: user.email,
                    username: user.username,
                    imageUrl: user.imageUrl,
                    profilePic: user.profilePic,
                    bio: user.bio,
                    isOnline: user.isOnline
                };
                return acc;
            }, {}),
        [users]
    );

    const hydrateCommentsCount = useCallback(async (incomingPosts) => {
        if (!Array.isArray(incomingPosts) || incomingPosts.length === 0) {
            return;
        }

        const cache = commentsCacheRef.current;
        const missing = incomingPosts
            .map((post) => post.postId)
            .filter((postId) => typeof cache[postId] !== 'number');

        if (!missing.length) {
            return;
        }

        const pairs = missing.map((postId) => {
            const matched = incomingPosts.find((post) => post.postId === postId);
            return [postId, Number(matched?.commentsCount) || 0];
        });

        setCommentCounts((previous) => {
            const next = { ...previous };
            pairs.forEach(([postId, count]) => {
                next[postId] = count;
            });
            return next;
        });
    }, []);

    const loadPosts = useCallback(
        async (targetPage = 1, append = false, signal) => {
            if (append) {
                setIsLoadingMore(true);
            } else {
                setLoading(true);
            }
            setError('');

            try {
                const params = {
                    page: targetPage,
                    limit: PAGE_SIZE,
                    sort: 'desc',
                    sortBy: 'createdAt'
                };

                if (selectedUser) {
                    params.userId = selectedUser;
                }

                if (selectedHashtag) {
                    params.hashtag = selectedHashtag;
                }

                let response = await fetchPosts(params, { signal });

                if (targetPage === 1 && response.posts.length === 0) {
                    await syncPosts();
                    response = await fetchPosts(params, { signal });
                }

                let nextPosts = [];
                setPosts((current) => {
                    nextPosts = dedupePosts(targetPage === 1 ? response.posts : [...current, ...response.posts]);
                    return nextPosts;
                });
                setTotalPages(response?.pagination?.pages || 1);
                setHasMore(targetPage < (response?.pagination?.pages || 1));
                await hydrateCommentsCount(nextPosts);
            } catch (requestError) {
                const isCanceled =
                    requestError?.name === 'CanceledError' ||
                    requestError?.name === 'AbortError' ||
                    requestError?.code === 'ERR_CANCELED';

                if (!isCanceled) {
                    const shouldShowBlockingError = !append && targetPage === 1 && postsCacheRef.current.length === 0;
                    if (shouldShowBlockingError) {
                        setError(requestError.message || 'Failed to load posts');
                    }
                }
            } finally {
                if (append) {
                    setIsLoadingMore(false);
                } else {
                    setLoading(false);
                }
            }
        },
        [selectedHashtag, selectedUser, hydrateCommentsCount]
    );

    useEffect(() => {
        const controller = new AbortController();

        fetchUsers({ signal: controller.signal })
            .then(setUsers)
            .catch(() => {
                setUsers([]);
            });

        return () => controller.abort();
    }, [setUsers]);

    useEffect(() => {
        setPage(1);
        setPosts([]);
        setHasMore(true);
    }, [selectedHashtag, selectedUser, sortMode]);

    useEffect(() => {
        if (!debouncedQuery.trim()) {
            setPage(1);
            setSearchResults([]);
            setSearching(false);
            const controller = new AbortController();
            loadPosts(1, false, controller.signal);
            return () => controller.abort();
        }

        setSearching(true);
        emitSearch(debouncedQuery, 300);
    }, [debouncedQuery, loadPosts, setSearching]);

    useEffect(() => {
        if (debouncedQuery.trim() || !hasMore || loading || isLoadingMore) {
            return;
        }

        const sentinel = sentinelRef.current;
        if (!sentinel) {
            return;
        }

        const observer = new IntersectionObserver(
            async (entries) => {
                const target = entries[0];
                if (!target.isIntersecting) {
                    return;
                }

                if (page >= totalPages) {
                    setHasMore(false);
                    return;
                }

                const nextPage = page + 1;
                setPage(nextPage);
                const controller = new AbortController();
                await loadPosts(nextPage, true, controller.signal);
            },
            { threshold: 0.2 }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [debouncedQuery, hasMore, isLoadingMore, loadPosts, loading, page, totalPages]);

    useEffect(() => {
        const stopResults = onSearchResults(async (payload) => {
            const incoming = dedupePosts(payload?.results);
            setSearchResults(incoming);
            setSearching(false);
            await hydrateCommentsCount(incoming);
        });

        const stopLikeUpdated = onLikeUpdated((payload) => {
            if (!payload?.postId) {
                return;
            }

            setPosts((current) => applySocketLike(current, payload, currentUserId));
            setSearchResults((current) => applySocketLike(current, payload, currentUserId));
        });

        const stopNewPost = onNewPost((payload) => {
            if (!payload?.postId || debouncedQuery.trim()) {
                return;
            }

            const matchesUser = !selectedUser || String(payload.userId) === String(selectedUser);
            const matchesTag = !selectedHashtag || Array.isArray(payload.hashtags) && payload.hashtags.includes(selectedHashtag);

            if (!matchesUser || !matchesTag) {
                return;
            }

            setPosts((current) => dedupePosts([payload, ...current]));
        });

        return () => {
            stopResults();
            stopLikeUpdated();
            stopNewPost();
        };
    }, [currentUserId, debouncedQuery, selectedHashtag, selectedUser, hydrateCommentsCount]);

    const visiblePosts = useMemo(() => {
        const base = debouncedQuery.trim() ? searchResults : posts;
        const filtered = selectedUser ? base.filter((item) => String(item.userId) === String(selectedUser)) : base;

        const sorted = [...filtered].sort((a, b) => {
            if (sortMode === 'liked') {
                return (Number(b.likes) || 0) - (Number(a.likes) || 0);
            }

            return Number(b.postId) - Number(a.postId);
        });

        const tagFiltered = selectedHashtag
            ? sorted.filter((post) => Array.isArray(post.hashtags) && post.hashtags.includes(selectedHashtag))
            : sorted;

        return tagFiltered.map((post) => sanitizePost(post, currentUserId, userMap, commentCounts, isUserOnline));
    }, [commentCounts, currentUserId, debouncedQuery, isUserOnline, posts, searchResults, selectedHashtag, selectedUser, sortMode, userMap]);

    useEffect(() => {
        setPanelPosts?.(visiblePosts.slice(0, 80));
    }, [setPanelPosts, visiblePosts]);

    const handleLikeToggle = useCallback(async (post) => {
        const shouldLike = !post.isLiked;
        const postId = post.postId;

        setLikingIds((prev) => {
            const next = new Set(prev);
            next.add(postId);
            return next;
        });

        const postsSnapshot = posts;
        const searchSnapshot = searchResults;

        setPosts((current) => applyLikeToList(current, postId, currentUserId, shouldLike));
        setSearchResults((current) => applyLikeToList(current, postId, currentUserId, shouldLike));

        try {
            if (shouldLike) {
                await likePost(postId, user?.userId);
            } else {
                await unlikePost(postId, user?.userId);
            }
            toast.success(shouldLike ? 'Post liked' : 'Post unliked');
        } catch (requestError) {
            setPosts(postsSnapshot);
            setSearchResults(searchSnapshot);
            toast.error(requestError.message || 'Failed to update like');
        } finally {
            setLikingIds((prev) => {
                const next = new Set(prev);
                next.delete(postId);
                return next;
            });
        }
    }, [currentUserId, posts, searchResults, user?.userId]);

    const handleCreatePost = async (event) => {
        event.preventDefault();
        if (!composer.title.trim() || !composer.body.trim()) {
            toast.error('Title and body are required');
            return;
        }

        setCreatingPost(true);
        try {
            const created = await createPost({ title: composer.title, body: composer.body, imageFile: composerImageFile || null });

            if (created) {
                const matchesUser = !selectedUser || String(created.userId) === String(selectedUser);
                const matchesTag = !selectedHashtag || (Array.isArray(created.hashtags) && created.hashtags.includes(selectedHashtag));

                if (matchesUser && matchesTag) {
                    setPosts((current) => [created, ...current]);
                }
                if (!debouncedQuery.trim()) {
                    setSearchResults([]);
                }
            }

            setComposer({ title: '', body: '' });
            setComposerImageFile(null);
            setComposerImagePreview('');
            setComposerOpen(false);
            toast.success('Post created');
        } catch (error) {
            toast.error(error.message || 'Failed to create post');
        } finally {
            setCreatingPost(false);
        }
    };

    const handleDeletePost = async (post) => {
        try {
            await deletePost(post.postId);
            setPosts((current) => current.filter((entry) => entry.postId !== post.postId));
            setSearchResults((current) => current.filter((entry) => entry.postId !== post.postId));
            toast.success('Post deleted');
        } catch (error) {
            toast.error(error.message || 'Failed to delete post');
        }
    };

    const handleOpenPreview = useCallback((post) => {
        setPreviewPost(post);
    }, []);

    const handleOpenDetails = useCallback((postId) => {
        navigate(`/posts/${postId}`);
    }, [navigate]);

    const handleComposerImageChange = (event) => {
        const file = event.target.files?.[0] || null;
        setComposerImageFile(file);

        if (composerImagePreview) {
            URL.revokeObjectURL(composerImagePreview);
        }

        setComposerImagePreview(file ? URL.createObjectURL(file) : '');
    };

    useEffect(() => () => {
        if (composerImagePreview) {
            URL.revokeObjectURL(composerImagePreview);
        }
    }, [composerImagePreview]);

    return (
        <section className="space-y-6">
            <div className="relative overflow-hidden rounded-3xl border border-cyan-200/10 bg-slate-900/55 p-6 shadow-[0_24px_60px_rgba(2,6,23,0.4)] backdrop-blur-xl">
                <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-cyan-400/20 blur-2xl" />
                <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-emerald-400/15 blur-2xl" />
                <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="title-display text-3xl font-semibold text-slate-100 sm:text-4xl">Realtime Social Feed</h2>
                        <p className="mt-2 max-w-xl text-sm text-slate-300">Live presence, instant post delivery, threaded discussions, and hashtag-powered discovery in one cinematic feed.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setSortMode((previous) => (previous === 'liked' ? 'latest' : 'liked'))}
                            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-slate-100 transition hover:border-cyan-300/40 hover:bg-cyan-500/10"
                        >
                            {sortMode === 'liked' ? 'Sorting: Most liked' : 'Sorting: Latest'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setComposerOpen(true)}
                            className="rounded-xl bg-gradient-to-r from-cyan-300 via-sky-400 to-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_12px_30px_rgba(14,165,233,0.35)] transition hover:brightness-110"
                        >
                            Create Post
                        </button>
                    </div>
                </div>
            </div>

            {selectedHashtag && (
                <div className="flex items-center gap-2 text-sm text-cyan-200">
                    <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1">#{selectedHashtag}</span>
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedHashtag('');
                            if (forcedHashtag) {
                                navigate('/explore');
                            }
                        }}
                        className="text-slate-300 hover:text-white"
                    >
                        Clear tag
                    </button>
                </div>
            )}

            <div className="flex items-center justify-between text-sm text-slate-300">
                <p>
                    Showing {visiblePosts.length} post{visiblePosts.length === 1 ? '' : 's'}
                    {debouncedQuery.trim() ? ` for "${debouncedQuery}"` : ''}
                </p>
                {!debouncedQuery.trim() && <p>Page {page} of {totalPages}</p>}
            </div>

            <p className="sr-only" aria-live="polite">
                {searching
                    ? 'Searching posts'
                    : `Showing ${visiblePosts.length} ${visiblePosts.length === 1 ? 'post' : 'posts'}`}
            </p>

            {error && (
                <div className="glass-card border-rose-500/30 bg-rose-900/20 p-4 text-sm text-rose-200">{error}</div>
            )}

            {loading ? (
                <Loader count={8} />
            ) : visiblePosts.length === 0 ? (
                <EmptyState />
            ) : (
                <motion.div
                    layout
                    variants={listVariants}
                    initial="hidden"
                    animate="show"
                    transition={prefersReducedMotion ? { duration: 0 } : undefined}
                    className="space-y-3"
                >
                    <AnimatePresence>
                        {visiblePosts.map((post) => (
                            <div key={post.postId} className="[content-visibility:auto] [contain-intrinsic-size:360px]">
                                <PostCard
                                    post={post}
                                    query={debouncedQuery}
                                    onToggleLike={handleLikeToggle}
                                    isLiking={likingIds.has(post.postId)}
                                    onOpenPreview={handleOpenPreview}
                                    onOpenDetails={() => handleOpenDetails(post.postId)}
                                    canDelete={isAdmin || String(post.userId) === String(user?.userId)}
                                    isOwnPost={String(post.userId) === String(user?.userId)}
                                    onDelete={handleDeletePost}
                                    onTagClick={(tag) => navigate(`/hashtags/${String(tag || '').toLowerCase()}`)}
                                />
                            </div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}

            {!debouncedQuery.trim() && <div ref={sentinelRef} id="feed-sentinel" className="h-8 w-full" aria-hidden="true" />}

            {!debouncedQuery.trim() && isLoadingMore && <Loader count={2} />}

            <PostModal
                open={Boolean(previewPost)}
                post={previewPost}
                onClose={() => setPreviewPost(null)}
                onToggleLike={handleLikeToggle}
                liking={previewPost ? likingIds.has(previewPost.postId) : false}
            />

            <AnimatePresence>
                {composerOpen && (
                    <>
                        <motion.button
                            type="button"
                            aria-label="Close post composer"
                            onClick={() => setComposerOpen(false)}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-black/60"
                        />

                        <motion.form
                            initial={{ opacity: 0, scale: 0.96, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 10 }}
                            transition={{ duration: 0.2 }}
                            onSubmit={handleCreatePost}
                            className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto p-4 sm:p-6"
                        >
                            <div className="w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-white/15 bg-slate-900/95 p-5 shadow-2xl backdrop-blur-xl sm:max-h-[calc(100vh-3rem)]">
                                <h3 className="text-lg font-semibold text-white">Create post</h3>
                                <p className="mt-1 text-sm text-slate-300">Share something with the realtime community.</p>

                                <div className="mt-4 space-y-3">
                                    <input
                                        value={composer.title}
                                        onChange={(event) => setComposer((prev) => ({ ...prev, title: event.target.value }))}
                                        placeholder="Post title"
                                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none transition focus:border-cyan-400"
                                    />
                                    <textarea
                                        value={composer.body}
                                        onChange={(event) => setComposer((prev) => ({ ...prev, body: event.target.value }))}
                                        placeholder="Post body"
                                        rows={6}
                                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none transition focus:border-cyan-400"
                                    />

                                    <div className="space-y-3 rounded-xl border border-dashed border-white/15 bg-white/5 p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <label className="text-sm font-medium text-slate-200" htmlFor="composer-image">
                                                Media upload
                                            </label>
                                            {composerImageFile && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (composerImagePreview) {
                                                            URL.revokeObjectURL(composerImagePreview);
                                                        }
                                                        setComposerImageFile(null);
                                                        setComposerImagePreview('');
                                                    }}
                                                    className="text-xs font-semibold text-rose-300 transition hover:text-rose-200"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                        <input
                                            id="composer-image"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleComposerImageChange}
                                            className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-400 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-950 hover:file:brightness-110"
                                        />
                                        {composerImagePreview && (
                                            <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/40">
                                                <img src={composerImagePreview} alt="Preview" className="max-h-56 w-full object-cover" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-5 flex items-center justify-end gap-2 border-t border-white/10 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setComposerOpen(false)}
                                        className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={creatingPost}
                                        className="rounded-lg bg-gradient-to-r from-cyan-400 to-teal-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                        {creatingPost ? 'Publishing...' : 'Publish'}
                                    </button>
                                </div>
                            </div>
                        </motion.form>
                    </>
                )}
            </AnimatePresence>
        </section>
    );
}
