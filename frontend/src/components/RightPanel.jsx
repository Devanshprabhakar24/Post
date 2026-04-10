import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { followUser, unfollowUser } from '../services/api';

function getTrendingHashtags(posts) {
    const countMap = new Map();

    (posts || []).forEach((post) => {
        (post?.hashtags || []).forEach((tag) => {
            const normalized = String(tag || '').toLowerCase();
            if (!normalized) {
                return;
            }
            countMap.set(normalized, (countMap.get(normalized) || 0) + 1);
        });
    });

    return Array.from(countMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([tag, count]) => ({ tag: tag.charAt(0).toUpperCase() + tag.slice(1), count }));
}

    function getFallbackTopics(posts) {
        const candidates = ['Design', 'Tech', 'Startup', 'Product'];
        const postCount = Math.max(1, Array.isArray(posts) ? posts.length : 0);
        return candidates.map((tag, index) => ({
            tag,
            count: Math.max(1, Math.floor(postCount / (index + 1)))
        }));
    }

export default function RightPanel({ users = [], posts = [] }) {
    const { user } = useAuth();
    const [pendingId, setPendingId] = useState(null);
    const [followingState, setFollowingState] = useState({});

    const trendingHashtags = useMemo(() => {
        const computed = getTrendingHashtags(posts);
        return computed.length ? computed : getFallbackTopics(posts);
    }, [posts]);
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
    const suggestions = useMemo(
        () => {
            const currentUserId = Number(user?.userId);
            const registeredUsers = uniqueUsers.filter((entry) => entry?.isExternal === false);

            return registeredUsers
                .filter((entry) => Number(entry.userId) !== currentUserId)
                .sort((a, b) => Number(b.userId) - Number(a.userId))
                .slice(0, 3);
        },
        [user?.userId, uniqueUsers]
    );

    const handleFollowToggle = async (targetUserId) => {
        const currentlyFollowing = Boolean(followingState[targetUserId]);
        setPendingId(targetUserId);

        try {
            if (currentlyFollowing) {
                await unfollowUser(targetUserId);
            } else {
                await followUser(targetUserId);
            }

            setFollowingState((current) => ({
                ...current,
                [targetUserId]: !currentlyFollowing
            }));
        } catch (error) {
            toast.error(error.message || 'Failed to update follow state');
        } finally {
            setPendingId(null);
        }
    };

    const getAvatarColor = (userId) => {
        const colors = ['#7b1fa2', '#00695c', '#d32f2f', '#5c6bc0', '#ef6c00', '#f4511e'];
        return colors[Number(userId || 0) % colors.length];
    };

    return (
        <aside className="sticky top-[84px] hidden h-[calc(100vh-96px)] w-[200px] self-start overflow-y-auto pl-1 lg:block">
            {/* Trending Card */}
            <div className="mb-4 rounded-lg border-[0.5px] border-[var(--border-light)] bg-[var(--bg-card)] p-4">
                <h3 className="mb-3 text-[12px] font-semibold text-[var(--text-primary)]">Trending topics</h3>
                <div className="space-y-2">
                    {trendingHashtags.map((item) => (
                        <div key={item.tag} className="border-b-[0.5px] border-[var(--border-subtle)] pb-3 last:border-b-0">
                            <p className="text-[12px] font-semibold text-[var(--accent-red)]">#{item.tag}</p>
                            <p className="mt-0.5 text-[10px] text-[var(--text-tertiary)]">{item.count} posts</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* People to Follow Card */}
            <div className="mb-4 rounded-lg border-[0.5px] border-[var(--border-light)] bg-[var(--bg-card)] p-4">
                <h3 className="mb-3 text-[12px] font-semibold text-[var(--text-primary)]">People to follow</h3>
                <div className="space-y-3">
                    {suggestions.length > 0 ? suggestions.map((entry) => {
                        const isFollowing = Boolean(followingState[entry.userId]);
                        const avatarColor = getAvatarColor(entry.userId);

                        return (
                            <div key={entry.userId} className="flex items-center gap-2 border-b-[0.5px] border-[var(--border-subtle)] pb-3 last:border-b-0">
                                <div
                                    className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-white text-[11px] font-semibold"
                                    style={{ backgroundColor: avatarColor }}
                                >
                                    {entry.name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="truncate text-[12px] font-semibold text-[var(--text-primary)]">{entry.name}</p>
                                    <p className="text-[10px] text-[var(--text-tertiary)]">@{entry.username}</p>
                                </div>
                                <button
                                    onClick={() => handleFollowToggle(entry.userId)}
                                    disabled={pendingId === entry.userId}
                                    className="h-6 flex-shrink-0 rounded-full border-[0.5px] border-[var(--border-soft)] bg-[var(--bg-card-soft)] px-2 text-[10px] font-semibold text-[var(--text-secondary)] hover:opacity-90"
                                >
                                    {isFollowing ? 'Following' : 'Follow'}
                                </button>
                            </div>
                        );
                    }) : (
                        <p className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card-soft)] px-3 py-2 text-[11px] text-[var(--text-tertiary)]">
                            No registered users to suggest yet.
                        </p>
                    )}
                </div>
            </div>
        </aside>
    );
}