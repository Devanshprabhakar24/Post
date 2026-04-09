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
            <section className="rounded-3xl border border-slate-200/80 bg-white/72 p-4 backdrop-blur-xl dark:border-cyan-200/15 dark:bg-slate-900/72">
                <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <Flame className="h-4 w-4 text-orange-300" /> Trending
                </h3>

                <div className="space-y-2">
                    {trendingHashtags.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-300">No hashtags yet.</p>
                    ) : (
                        trendingHashtags.map((item) => (
                            <Link
                                key={item.tag}
                                to={`/hashtags/${item.tag}`}
                                className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white/75 px-3 py-2 text-sm text-slate-800 transition hover:border-cyan-300/45 hover:bg-cyan-500/14 dark:border-white/15 dark:bg-white/10 dark:text-slate-100"
                            >
                                <span className="inline-flex items-center gap-1.5"><Hash className="h-3.5 w-3.5" /> {item.tag}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-300">{item.count}</span>
                            </Link>
                        ))
                    )}
                </div>
            </section>

            <section className="rounded-3xl border border-slate-200/80 bg-white/72 p-4 backdrop-blur-xl dark:border-cyan-200/15 dark:bg-slate-900/72">
                <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <UserPlus2 className="h-4 w-4 text-cyan-300" /> Who to follow
                </h3>

                <div className="space-y-2.5">
                    {suggestions.map((entry) => {
                        const isFollowing = Boolean(followingState[entry.userId]);

                        return (
                            <div key={entry.userId} className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white/75 px-3 py-2 dark:border-white/15 dark:bg-white/10">
                                <Link to={`/profile/${entry.userId}`} className="min-w-0">
                                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{entry.name}</p>
                                    <p className="truncate text-xs text-slate-600 dark:text-slate-300">@{entry.username || entry.email}</p>
                                </Link>

                                <button
                                    type="button"
                                    onClick={() => handleFollowToggle(entry.userId)}
                                    disabled={pendingId === entry.userId}
                                    className="group relative min-w-[84px] rounded-full bg-cyan-400 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-70"
                                >
                                    {pendingId === entry.userId ? '...' : isFollowing ? 'Following' : 'Follow'}
                                    {isFollowing && (
                                        <span className="pointer-events-none absolute inset-0 hidden items-center justify-center rounded-full bg-rose-500 text-white group-hover:flex">
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