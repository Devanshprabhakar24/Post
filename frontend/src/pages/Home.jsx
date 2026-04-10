import { AnimatePresence, motion } from 'framer-motion';
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
    searchPosts,
    fetchUsers,
    likePost,
    syncPosts,
    unlikePost
} from '../services/api';
import { emitSearch, onCommentCreated, onLikeUpdated, onNewPost, onSearchResults } from '../services/socket';

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
        const normalizedUserId = Number(userId);
        const nextLikedBy = shouldLike
            ? Array.from(new Set([...currentLikedBy, normalizedUserId]))
            : currentLikedBy.filter((entry) => Number(entry) !== normalizedUserId);

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

function filterPostsByQuery(list, query) {
    const normalizedQuery = String(query || '').trim().toLowerCase();
    if (!normalizedQuery) {
        return Array.isArray(list) ? list : [];
    }

    return (Array.isArray(list) ? list : []).filter((post) => {
        const title = String(post?.title || '').toLowerCase();
        const body = String(post?.body || '').toLowerCase();
        const authorName = String(post?.authorName || post?.author?.name || '').toLowerCase();
        const authorUsername = String(post?.authorUsername || post?.author?.username || '').toLowerCase();
        const hashtags = Array.isArray(post?.hashtags)
            ? post.hashtags.map((tag) => String(tag || '').toLowerCase()).join(' ')
            : '';

        return title.includes(normalizedQuery)
            || body.includes(normalizedQuery)
            || authorName.includes(normalizedQuery)
            || authorUsername.includes(normalizedQuery)
            || hashtags.includes(normalizedQuery);
    });
}

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
    const { user, isAdmin } = useAuth();
    const { isUserOnline } = useSocketContext();
    const currentUserId = Number(user?.userId || 0);
    const sentinelRef = useRef(null);
    const commentsCacheRef = useRef({});
    const postsCacheRef = useRef([]);
    const searchFallbackTimerRef = useRef(null);
    const activeSearchQueryRef = useRef('');

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
    const [modalOrigin, setModalOrigin] = useState({ x: '50%', y: '50%' });
    const [composerOpen, setComposerOpen] = useState(false);
    const [composer, setComposer] = useState({ title: '', body: '' });
    const [creatingPost, setCreatingPost] = useState(false);
    const [selectedHashtag, setSelectedHashtag] = useState('');
    const [composerImageFile, setComposerImageFile] = useState(null);
    const [composerImagePreview, setComposerImagePreview] = useState('');
    const [livePulseIds, setLivePulseIds] = useState({});

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
        () => users.reduce((acc, item) => {
            acc[item.userId] = {
                name: item.name,
                email: item.email,
                username: item.username,
                imageUrl: item.imageUrl,
                profilePic: item.profilePic,
                bio: item.bio,
                isOnline: item.isOnline
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
            .map((item) => item.postId)
            .filter((postId) => typeof cache[postId] !== 'number');

        if (!missing.length) {
            return;
        }

        const pairs = missing.map((postId) => {
            const matched = incomingPosts.find((entry) => entry.postId === postId);
            return [postId, Number(matched?.commentsCount) || 0];
        });

        setCommentCounts((prev) => {
            const next = { ...prev };
            pairs.forEach(([postId, count]) => {
                next[postId] = count;
            });
            return next;
        });
    }, []);

    const loadPosts = useCallback(async (targetPage = 1, append = false, signal) => {
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
    }, [hydrateCommentsCount, selectedHashtag, selectedUser]);

    useEffect(() => {
        const controller = new AbortController();

        fetchUsers({ signal: controller.signal })
            .then(setUsers)
            .catch(() => setUsers([]));

        return () => controller.abort();
    }, [setUsers]);

    useEffect(() => {
        setPage(1);
        setPosts([]);
        setHasMore(true);
    }, [selectedHashtag, selectedUser, sortMode]);

    useEffect(() => {
        const normalizedQuery = debouncedQuery.trim();

        if (searchFallbackTimerRef.current) {
            clearTimeout(searchFallbackTimerRef.current);
            searchFallbackTimerRef.current = null;
        }

        activeSearchQueryRef.current = normalizedQuery;

        if (!normalizedQuery) {
            setPage(1);
            setSearchResults([]);
            setSearching(false);
            const controller = new AbortController();
            loadPosts(1, false, controller.signal);
            return () => controller.abort();
        }

        if (normalizedQuery.length < 3) {
            const localMatches = filterPostsByQuery(postsCacheRef.current, normalizedQuery);
            setSearchResults(dedupePosts(localMatches));
            setSearching(false);
            return undefined;
        }

        setSearching(true);
        searchFallbackTimerRef.current = window.setTimeout(async () => {
            if (activeSearchQueryRef.current !== normalizedQuery) {
                return;
            }

            try {
                const fallbackResults = await searchPosts(normalizedQuery);
                if (activeSearchQueryRef.current !== normalizedQuery) {
                    return;
                }

                const incoming = dedupePosts(fallbackResults);
                setSearchResults(incoming);
                await hydrateCommentsCount(incoming);
            } catch (_error) {
                // Keep silent; websocket search may still resolve.
            } finally {
                if (activeSearchQueryRef.current === normalizedQuery) {
                    setSearching(false);
                }
            }
        }, 850);

        emitSearch(normalizedQuery, 300);
        return () => {
            if (searchFallbackTimerRef.current) {
                clearTimeout(searchFallbackTimerRef.current);
                searchFallbackTimerRef.current = null;
            }
        };
    }, [debouncedQuery, hydrateCommentsCount, loadPosts, setSearching]);

    useEffect(() => {
        if (debouncedQuery.trim() || !hasMore || loading || isLoadingMore) {
            return;
        }

        const sentinel = sentinelRef.current;
        if (!sentinel) {
            return;
        }

        const observer = new IntersectionObserver(async (entries) => {
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
        }, { threshold: 0.2 });

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [debouncedQuery, hasMore, isLoadingMore, loadPosts, loading, page, totalPages]);

    useEffect(() => {
        const stopResults = onSearchResults(async (payload) => {
            const payloadQuery = String(payload?.query || '').trim();
            if (payloadQuery && payloadQuery !== activeSearchQueryRef.current) {
                return;
            }

            if (searchFallbackTimerRef.current) {
                clearTimeout(searchFallbackTimerRef.current);
                searchFallbackTimerRef.current = null;
            }

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

            setLivePulseIds((current) => ({ ...current, [payload.postId]: Date.now() }));
            window.setTimeout(() => {
                setLivePulseIds((current) => {
                    const next = { ...current };
                    delete next[payload.postId];
                    return next;
                });
            }, 2000);
        });

        const stopNewPost = onNewPost((payload) => {
            if (!payload?.postId || debouncedQuery.trim()) {
                return;
            }

            const matchesUser = !selectedUser || String(payload.userId) === String(selectedUser);
            const matchesTag = !selectedHashtag || (Array.isArray(payload.hashtags) && payload.hashtags.includes(selectedHashtag));

            if (!matchesUser || !matchesTag) {
                return;
            }

            setPosts((current) => dedupePosts([payload, ...current]));
        });

        const stopCommentCreated = onCommentCreated((payload) => {
            const postId = Number(payload?.postId);
            if (!Number.isFinite(postId) || postId < 1) {
                return;
            }

            setCommentCounts((current) => ({
                ...current,
                [postId]: Math.max(0, Number(current?.[postId] || 0) + 1)
            }));

            setPosts((current) => current.map((entry) => (
                Number(entry?.postId) === postId
                    ? { ...entry, commentsCount: Math.max(0, Number(entry?.commentsCount || 0) + 1) }
                    : entry
            )));

            setSearchResults((current) => current.map((entry) => (
                Number(entry?.postId) === postId
                    ? { ...entry, commentsCount: Math.max(0, Number(entry?.commentsCount || 0) + 1) }
                    : entry
            )));
        });

        return () => {
            stopResults();
            stopLikeUpdated();
            stopNewPost();
            stopCommentCreated();
        };
    }, [currentUserId, debouncedQuery, hydrateCommentsCount, selectedHashtag, selectedUser, setSearching]);

    useEffect(() => () => {
        if (searchFallbackTimerRef.current) {
            clearTimeout(searchFallbackTimerRef.current);
            searchFallbackTimerRef.current = null;
        }
    }, []);

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
        } catch (requestError) {
            toast.error(requestError.message || 'Failed to create post');
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
        } catch (requestError) {
            toast.error(requestError.message || 'Failed to delete post');
        }
    };

    const handleOpenPreview = useCallback((post, event) => {
        if (event?.clientX && event?.clientY) {
            const x = `${(event.clientX / window.innerWidth) * 100}%`;
            const y = `${(event.clientY / window.innerHeight) * 100}%`;
            setModalOrigin({ x, y });
        } else {
            setModalOrigin({ x: '50%', y: '50%' });
        }

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
        <section className="space-y-3 pb-6">
            <div className="flex items-center gap-2.5 rounded-lg border-[0.5px] border-[var(--border-light)] bg-[var(--bg-card)] p-3 sm:gap-3 sm:p-4">
                <div
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white sm:h-10 sm:w-10"
                    style={{ backgroundColor: ['#5c6bc0', '#7b1fa2', '#00695c', '#ef6c00', '#d32f2f'][Number(user?.userId || 0) % 5] }}
                >
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <input
                    type="text"
                    onClick={() => setComposerOpen(true)}
                    placeholder="What's on your mind?"
                    readOnly
                    className="min-w-0 flex-1 cursor-pointer rounded-full border border-[var(--border-soft)] bg-[var(--bg-card-soft)] px-3 py-2.5 text-sm font-medium not-italic text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none sm:px-4"
                />
                <div className="hidden items-center gap-2 sm:flex">
                    <button type="button" onClick={() => setComposerOpen(true)} className="flex items-center gap-1 rounded-full border border-[var(--border-soft)] px-3 py-1.5 text-[12px] text-[var(--text-secondary)] hover:bg-gray-50 dark:hover:bg-white/5">
                        📷 Photo
                    </button>
                    <button
                        onClick={() => setComposerOpen(true)}
                        className="bg-[#e63946] text-white border-none px-4 py-1.5 rounded-full text-[12px] font-semibold hover:bg-red-600"
                    >
                        Post
                    </button>
                </div>
            </div>

            <div className="flex gap-2 sm:hidden">
                <button
                    type="button"
                    onClick={() => setComposerOpen(true)}
                    className="flex-1 rounded-full border border-[var(--border-soft)] px-3 py-2 text-[12px] font-semibold text-[var(--text-secondary)] hover:bg-gray-50 dark:hover:bg-white/5"
                >
                    Photo
                </button>
                <button
                    type="button"
                    onClick={() => setComposerOpen(true)}
                    className="flex-1 rounded-full bg-[#e63946] px-3 py-2 text-[12px] font-semibold text-white hover:bg-red-600"
                >
                    Post
                </button>
            </div>

            {selectedHashtag && (
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-red)]/40 bg-[var(--bg-card)] px-3 py-1 text-[11px] font-semibold tracking-wide text-[var(--accent-red)]">
                    #{selectedHashtag}
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedHashtag('');
                            if (forcedHashtag) {
                                navigate('/explore');
                            }
                        }}
                        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                        Clear
                    </button>
                </div>
            )}

            <p className="sr-only" aria-live="polite">
                {searching ? 'Searching posts' : `Showing ${visiblePosts.length} ${visiblePosts.length === 1 ? 'post' : 'posts'}`}
            </p>

            {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-700/40 dark:bg-red-950/30 dark:text-red-300">{error}</div>}

            {loading ? (
                <Loader count={4} />
            ) : visiblePosts.length === 0 ? (
                <EmptyState />
            ) : (
                <motion.div className="space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <AnimatePresence>
                        {visiblePosts.map((post, index) => (
                            <PostCard
                                key={post.postId}
                                index={index}
                                post={post}
                                query={debouncedQuery}
                                onToggleLike={handleLikeToggle}
                                isLiking={likingIds.has(post.postId)}
                                onOpenPreview={handleOpenPreview}
                                onOpenDetails={() => handleOpenDetails(post.postId)}
                                canDelete={isAdmin || String(post.userId) === String(user?.userId)}
                                isOwnPost={String(post.userId) === String(user?.userId)}
                                onDelete={handleDeletePost}
                                onOpenComments={() => handleOpenDetails(post.postId)}
                                onRepost={async (targetPost) => {
                                    const url = `${window.location.origin}/posts/${targetPost.postId}`;
                                    if (navigator?.clipboard?.writeText) {
                                        await navigator.clipboard.writeText(url);
                                    }
                                    toast.success('Post link copied for repost');
                                }}
                                onShare={async (targetPost) => {
                                    const url = `${window.location.origin}/posts/${targetPost.postId}`;
                                    if (navigator?.share) {
                                        try {
                                            await navigator.share({ title: targetPost?.title || 'Post', text: targetPost?.body || '', url });
                                            return;
                                        } catch (_error) {
                                            // Fallback to clipboard.
                                        }
                                    }

                                    if (navigator?.clipboard?.writeText) {
                                        await navigator.clipboard.writeText(url);
                                    }
                                    toast.success('Post link copied');
                                }}
                                onFollowUser={(targetPost) => navigate(`/profile/${targetPost.userId}`)}
                                onTagClick={(tag) => navigate(`/hashtags/${String(tag || '').toLowerCase()}`)}
                                isLive={Boolean(livePulseIds[post.postId])}
                            />
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}

            {!debouncedQuery.trim() && <div ref={sentinelRef} className="h-8 w-full" aria-hidden="true" />}
            {!debouncedQuery.trim() && isLoadingMore && <Loader count={2} />}

            {/* Post Modal */}
            <PostModal
                open={Boolean(previewPost)}
                post={previewPost}
                origin={modalOrigin}
                onClose={() => setPreviewPost(null)}
                onToggleLike={handleLikeToggle}
                liking={previewPost ? likingIds.has(previewPost.postId) : false}
            />

            {/* Composer Modal */}
            <AnimatePresence>
                {composerOpen && (
                    <>
                        <motion.button
                            type="button"
                            onClick={() => setComposerOpen(false)}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[90] bg-black/70"
                            aria-label="Close composer"
                        />

                        <motion.form
                            onSubmit={handleCreatePost}
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 12 }}
                            className="fixed inset-0 z-[92] grid place-items-center p-3 sm:p-4"
                        >
                            <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg border border-[var(--border-light)] bg-[var(--bg-card)] p-4 sm:p-6">
                                <h3 className="mb-2 text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">Create Post</h3>
                                <p className="mb-4 text-[13px] text-[var(--text-tertiary)]">Share your thoughts with the community</p>

                                <div className="space-y-3">
                                    <input
                                        value={composer.title}
                                        onChange={(event) => setComposer((prev) => ({ ...prev, title: event.target.value }))}
                                        placeholder="Title"
                                        className="w-full rounded-lg border border-[var(--border-light)] bg-transparent px-4 py-2 text-sm font-semibold text-[var(--text-primary)] focus:border-[var(--accent-red)] focus:outline-none"
                                    />
                                    <textarea
                                        value={composer.body}
                                        onChange={(event) => setComposer((prev) => ({ ...prev, body: event.target.value }))}
                                        placeholder="Write your post body..."
                                        rows={5}
                                        className="w-full rounded-lg border border-[var(--border-light)] bg-transparent px-4 py-2 text-[13px] text-[var(--text-secondary)] focus:border-[var(--accent-red)] focus:outline-none"
                                    />

                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleComposerImageChange}
                                        className="block w-full cursor-pointer rounded-lg border-2 border-dashed border-[var(--border-soft)] p-4 text-[12px] text-[var(--text-tertiary)] file:hidden hover:border-[var(--accent-red)]"
                                    />

                                    {composerImagePreview && (
                                        <img src={composerImagePreview} alt="preview" className="w-full h-40 rounded-lg object-cover" />
                                    )}
                                </div>

                                <div className="flex justify-end gap-2 mt-4">
                                    <button
                                        type="button"
                                        onClick={() => setComposerOpen(false)}
                                        className="rounded-full border border-[var(--border-soft)] px-4 py-2 text-[12px] font-semibold text-[var(--text-secondary)] hover:bg-gray-50 dark:hover:bg-white/5"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={creatingPost}
                                        className="px-4 py-2 rounded-full bg-[#e63946] text-white text-[12px] font-semibold hover:bg-red-600 disabled:opacity-60"
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
