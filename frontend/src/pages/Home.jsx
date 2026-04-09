import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import EmptyState from '../components/EmptyState';
import Loader from '../components/Loader';
import PostModal from '../components/PostModal';
import PostCard from '../components/PostCard';
import TextReveal from '../components/TextReveal';
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
    const reduced = useReducedMotion();
    const { user, isAdmin } = useAuth();
    const { isUserOnline, onlineUsers } = useSocketContext();
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

        if (!normalizedQuery || normalizedQuery.length < 3) {
            setPage(1);
            setSearchResults([]);
            setSearching(false);
            const controller = new AbortController();
            loadPosts(1, false, controller.signal);
            return () => controller.abort();
        }

        setSearching(true);
        emitSearch(normalizedQuery, 300);
    }, [debouncedQuery, loadPosts, setSearching]);

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

        return () => {
            stopResults();
            stopLikeUpdated();
            stopNewPost();
        };
    }, [currentUserId, debouncedQuery, hydrateCommentsCount, selectedHashtag, selectedUser, setSearching]);

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
        <section className="space-y-6 pb-6">
            <header className="noise-divider editorial-surface rounded-3xl p-6">
                <TextReveal
                    text="WHAT'S HAPPENING"
                    className="font-display text-[clamp(3.2rem,11vw,6rem)] leading-[0.86] text-paper"
                />
                <div className="mt-3 h-[2px] w-36 bg-volt" />

                <div className="mt-5 grid gap-2 rounded-2xl border border-mist/30 p-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-mist/25 px-3 py-2">
                        <p className="ui-font text-[10px] uppercase tracking-[0.14em] text-mist">Total posts</p>
                        <p className="font-display text-4xl leading-none text-paper">{visiblePosts.length}</p>
                    </div>
                    <div className="rounded-xl border border-mist/25 px-3 py-2">
                        <p className="ui-font text-[10px] uppercase tracking-[0.14em] text-mist">Online users</p>
                        <p className="font-display text-4xl leading-none text-paper">{onlineUsers?.length || 0}</p>
                    </div>
                    <div className="rounded-xl border border-mist/25 px-3 py-2">
                        <p className="ui-font text-[10px] uppercase tracking-[0.14em] text-mist">New today</p>
                        <p className="font-display text-4xl leading-none text-paper">{posts.filter((item) => new Date(item.createdAt || 0).toDateString() === new Date().toDateString()).length}</p>
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setSortMode((prev) => (prev === 'liked' ? 'latest' : 'liked'))}
                        className="rounded-full border border-mist/40 px-3 py-1 ui-font text-[11px] uppercase tracking-[0.14em] text-mist hover:border-volt hover:text-volt"
                    >
                        {sortMode === 'liked' ? 'Most liked' : 'Latest'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setComposerOpen(true)}
                        className="rounded-full border border-volt/70 bg-volt px-4 py-1 ui-font text-[11px] uppercase tracking-[0.14em] text-ink hover:bg-volt-dim"
                    >
                        Create post
                    </button>
                </div>
            </header>

            {selectedHashtag && (
                <div className="inline-flex items-center gap-2 rounded-full border border-volt/50 px-3 py-1 ui-font text-xs uppercase tracking-[0.14em] text-volt">
                    #{selectedHashtag}
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedHashtag('');
                            if (forcedHashtag) {
                                navigate('/explore');
                            }
                        }}
                        className="text-mist hover:text-paper"
                    >
                        Clear
                    </button>
                </div>
            )}

            <p className="sr-only" aria-live="polite">
                {searching ? 'Searching posts' : `Showing ${visiblePosts.length} ${visiblePosts.length === 1 ? 'post' : 'posts'}`}
            </p>

            {error && <div className="rounded-2xl border border-ember/45 bg-ember/10 p-4 font-ui text-sm text-ember">{error}</div>}

            {loading ? (
                <Loader count={8} />
            ) : visiblePosts.length === 0 ? (
                <EmptyState />
            ) : (
                <motion.div
                    className="columns-1 gap-4 space-y-0 md:columns-2"
                    initial={reduced ? { opacity: 1 } : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
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
                                onTagClick={(tag) => navigate(`/hashtags/${String(tag || '').toLowerCase()}`)}
                                isLive={Boolean(livePulseIds[post.postId])}
                            />
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}

            {!debouncedQuery.trim() && <div ref={sentinelRef} className="h-8 w-full" aria-hidden="true" />}
            {!debouncedQuery.trim() && isLoadingMore && <Loader count={2} />}

            <PostModal
                open={Boolean(previewPost)}
                post={previewPost}
                origin={modalOrigin}
                onClose={() => setPreviewPost(null)}
                onToggleLike={handleLikeToggle}
                liking={previewPost ? likingIds.has(previewPost.postId) : false}
            />

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
                            initial={reduced ? { opacity: 1 } : { opacity: 0, y: 24, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={reduced ? { opacity: 1 } : { opacity: 0, y: 12, scale: 0.97 }}
                            className="fixed inset-0 z-[92] grid place-items-center p-4"
                        >
                            <div className="editorial-surface w-full max-w-2xl rounded-3xl p-5">
                                <h3 className="font-display text-5xl text-paper">Create Story</h3>
                                <p className="font-body italic text-mist">Publish something worth clipping.</p>

                                <div className="mt-4 space-y-3">
                                    <input
                                        value={composer.title}
                                        onChange={(event) => setComposer((prev) => ({ ...prev, title: event.target.value }))}
                                        placeholder="Headline"
                                        className="w-full rounded-xl border border-mist/35 bg-transparent px-3 py-3 font-display text-3xl text-paper focus:border-volt focus:outline-none"
                                    />
                                    <textarea
                                        value={composer.body}
                                        onChange={(event) => setComposer((prev) => ({ ...prev, body: event.target.value }))}
                                        placeholder="Write the post body"
                                        rows={6}
                                        className="w-full rounded-xl border border-mist/35 bg-transparent px-3 py-3 font-body text-lg italic text-paper focus:border-volt focus:outline-none"
                                    />

                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleComposerImageChange}
                                        className="block w-full rounded-xl border border-dashed border-mist/40 p-3 font-ui text-xs text-mist"
                                    />

                                    {composerImagePreview && (
                                        <img src={composerImagePreview} alt="preview" className="h-56 w-full rounded-xl object-cover" />
                                    )}
                                </div>

                                <div className="mt-4 flex justify-end gap-2">
                                    <button type="button" onClick={() => setComposerOpen(false)} className="rounded-full border border-mist/35 px-4 py-2 ui-font text-xs uppercase tracking-[0.14em] text-mist">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={creatingPost} className="rounded-full border border-volt/80 bg-volt px-4 py-2 ui-font text-xs uppercase tracking-[0.14em] text-ink disabled:opacity-60">
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
