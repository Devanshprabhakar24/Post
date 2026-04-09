import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import EmptyState from '../components/EmptyState';
import Loader from '../components/Loader';
import PostModal from '../components/PostModal';
import PostCard from '../components/PostCard';
import TextReveal from '../components/TextReveal';
import LeftSidebar from '../components/LeftSidebar';
import RightPanel from '../components/RightPanel';
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
        <div className="bg-[#f0ede8] min-h-screen">
            {/* Topbar */}
            <nav className="bg-white border-b border-[0.5px] border-[#ddd] sticky top-0 z-40 px-4 h-[72px] flex items-center gap-4">
                <div className="font-semibold text-lg text-[#111]">
                    Post<span className="text-[#e63946]">.</span>
                </div>
                <input
                    type="text"
                    readOnly
                    placeholder="Search people, posts, topics..."
                    className="flex-1 bg-[#f3f3f3] border-none rounded-full px-4 py-2 text-[13px] text-[#555] placeholder-[#999]"
                />
                <div className="flex items-center gap-2 ml-auto">
                    <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100">🏠</button>
                    <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100">👥</button>
                    <button className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100">
                        🔔
                        <div className="absolute top-2 right-2 w-2 h-2 bg-[#e63946] rounded-full" />
                    </button>
                    <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100">💬</button>
                    <div className="w-9 h-9 rounded-full bg-[#5c6bc0] flex items-center justify-center text-white text-xs font-semibold">
                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                </div>
            </nav>

            {/* Main Layout */}
            <div className="flex max-w-7xl mx-auto px-4 py-3 gap-3">
                {/* Left Sidebar */}
                <LeftSidebar />

                {/* Center Feed */}
                <div className="flex-1 min-w-0">
                    {/* Composer */}
                    <div className="bg-white rounded-lg border-[0.5px] border-[#e8e8e8] p-4 mb-3 flex gap-3">
                        <div
                            className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                            style={{ backgroundColor: '#5c6bc0' }}
                        >
                            {user?.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <input
                            type="text"
                            onClick={() => setComposerOpen(true)}
                            placeholder="What's on your mind?"
                            readOnly
                            className="flex-1 bg-[#f5f5f5] border-none rounded-full px-4 py-2 text-[13px] text-[#888] placeholder-[#999] cursor-pointer"
                        />
                        <div className="flex items-center gap-2">
                            <button className="flex items-center gap-1 border border-[#ddd] px-3 py-1.5 rounded-full text-[12px] text-[#555] hover:bg-gray-50">
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

                    {/* Posts Feed */}
                    {error && <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 mb-3">{error}</div>}

                    {loading ? (
                        <Loader count={4} />
                    ) : visiblePosts.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <motion.div
                            className="space-y-3"
                            initial={{ opacity: 0 }}
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
                </div>

                {/* Right Sidebar */}
                <RightPanel users={users} posts={visiblePosts} />
            </div>

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
                            className="fixed inset-0 z-[92] grid place-items-center p-4"
                        >
                            <div className="bg-white rounded-lg w-full max-w-xl border border-[#e8e8e8] p-6">
                                <h3 className="text-2xl font-semibold text-[#111] mb-2">Create Post</h3>
                                <p className="text-[13px] text-[#999] mb-4">Share your thoughts with the community</p>

                                <div className="space-y-3">
                                    <input
                                        value={composer.title}
                                        onChange={(event) => setComposer((prev) => ({ ...prev, title: event.target.value }))}
                                        placeholder="Title"
                                        className="w-full rounded-lg border border-[#e8e8e8] px-4 py-2 text-sm font-semibold text-[#111] focus:border-[#e63946] focus:outline-none"
                                    />
                                    <textarea
                                        value={composer.body}
                                        onChange={(event) => setComposer((prev) => ({ ...prev, body: event.target.value }))}
                                        placeholder="Write your post body..."
                                        rows={6}
                                        className="w-full rounded-lg border border-[#e8e8e8] px-4 py-2 text-[13px] text-[#333] focus:border-[#e63946] focus:outline-none"
                                    />

                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleComposerImageChange}
                                        className="block w-full border-dashed border-2 border-[#ddd] rounded-lg p-4 text-[12px] text-[#999] file:hidden cursor-pointer hover:border-[#e63946]"
                                    />

                                    {composerImagePreview && (
                                        <img src={composerImagePreview} alt="preview" className="w-full h-40 rounded-lg object-cover" />
                                    )}
                                </div>

                                <div className="flex justify-end gap-2 mt-4">
                                    <button
                                        type="button"
                                        onClick={() => setComposerOpen(false)}
                                        className="px-4 py-2 rounded-full border border-[#ddd] text-[12px] font-semibold text-[#555] hover:bg-gray-50"
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
        </div>
    );
}
