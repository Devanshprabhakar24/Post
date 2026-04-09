import { useMemo, useState } from 'react';
import { Flame, Hash, UserPlus2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
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
        .slice(0, 6)
        .map(([tag, count]) => ({ tag, count }));
}

export default function RightPanel({ users = [], posts = [] }) {
    const { user } = useAuth();
    const [pendingId, setPendingId] = useState(null);
    const [followingState, setFollowingState] = useState({});

    const trendingHashtags = useMemo(() => getTrendingHashtags(posts), [posts]);
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
            const pool = registeredUsers.length > 0 ? registeredUsers : uniqueUsers;

            return pool
                .filter((entry) => Number(entry.userId) !== currentUserId)
                .sort((a, b) => Number(b.userId) - Number(a.userId))
                .slice(0, 4);
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

    return (
        <aside className="sticky top-[88px] hidden h-[calc(100vh-110px)] space-y-4 self-start overflow-y-auto pr-1 lg:block">
            <section className="editorial-surface rounded-3xl border border-mist/30 p-4">
                <h3 className="mb-3 inline-flex items-center gap-2 font-display text-3xl leading-none text-paper">
                    <Flame className="h-4 w-4 text-ember" /> Trending
                </h3>

                <div className="space-y-2">
                    {trendingHashtags.length === 0 ? (
                        <p className="font-body text-sm italic text-mist">No hashtags yet.</p>
                    ) : (
                        trendingHashtags.map((item) => (
                            <Link
                                key={item.tag}
                                to={`/hashtags/${item.tag}`}
                                className="flex items-center justify-between rounded-xl border border-mist/30 bg-ink/25 px-3 py-2 font-ui text-xs uppercase tracking-[0.14em] text-paper transition hover:border-volt/55 hover:text-volt"
                            >
                                <span className="inline-flex items-center gap-1.5"><Hash className="h-3.5 w-3.5" /> {item.tag}</span>
                                <span className="text-xs text-mist">{item.count}</span>
                            </Link>
                        ))
                    )}
                </div>
            </section>

            <section className="editorial-surface rounded-3xl border border-mist/30 p-4">
                <h3 className="mb-3 inline-flex items-center gap-2 font-display text-3xl leading-none text-paper">
                    <UserPlus2 className="h-4 w-4 text-volt" /> Follow
                </h3>

                <div className="space-y-2.5">
                    {suggestions.map((entry) => {
                        const isFollowing = Boolean(followingState[entry.userId]);

                        return (
                            <div key={entry.userId} className="flex items-center justify-between rounded-xl border border-mist/30 bg-ink/25 px-3 py-2">
                                <Link to={`/profile/${entry.userId}`} className="min-w-0">
                                    <p className="truncate font-display text-2xl leading-none text-paper">{entry.name}</p>
                                    <p className="truncate ui-font text-[10px] uppercase tracking-[0.14em] text-mist">@{entry.username || entry.email}</p>
                                </Link>

                                <button
                                    type="button"
                                    onClick={() => handleFollowToggle(entry.userId)}
                                    disabled={pendingId === entry.userId}
                                    className="group relative min-w-[84px] rounded-full border border-volt/75 bg-volt px-3 py-1.5 ui-font text-[10px] uppercase tracking-[0.14em] text-ink transition hover:bg-volt-dim disabled:opacity-70"
                                >
                                    {pendingId === entry.userId ? '...' : isFollowing ? 'Following' : 'Follow'}
                                    {isFollowing && (
                                        <span className="pointer-events-none absolute inset-0 hidden items-center justify-center rounded-full bg-ember text-ink group-hover:flex">
                                            Unfollow
                                        </span>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </section>
        </aside>
    );
}