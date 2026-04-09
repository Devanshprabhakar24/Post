import { useMemo, useState } from 'react';
import { Flame, UserPlus2 } from 'lucide-react';
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
        .slice(0, 4)
        .map(([tag, count]) => ({ tag: tag.charAt(0).toUpperCase() + tag.slice(1), count }));
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
        <aside className="sticky top-[72px] hidden h-[calc(100vh-72px)] w-[200px] self-start overflow-y-auto pl-2 lg:block">
            {/* Trending Card */}
            <div className="bg-white rounded-lg border-[0.5px] border-[#e8e8e8] p-4 mb-4">
                <h3 className="text-[12px] font-semibold text-[#111] mb-3">Trending topics</h3>
                <div className="space-y-2">
                    {trendingHashtags.map((item) => (
                        <div key={item.tag} className="pb-3 border-b-[0.5px] border-[#f5f5f5] last:border-b-0">
                            <p className="text-[12px] font-semibold text-[#e63946]">#{item.tag}</p>
                            <p className="text-[10px] text-[#bbb] mt-0.5">{item.count}k posts today</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* People to Follow Card */}
            <div className="bg-white rounded-lg border-[0.5px] border-[#e8e8e8] p-4 mb-4">
                <h3 className="text-[12px] font-semibold text-[#111] mb-3">People to follow</h3>
                <div className="space-y-3">
                    {suggestions.map((entry) => {
                        const isFollowing = Boolean(followingState[entry.userId]);
                        const avatarColor = getAvatarColor(entry.userId);

                        return (
                            <div key={entry.userId} className="flex items-center gap-2 pb-3 border-b-[0.5px] border-[#f5f5f5] last:border-b-0">
                                <div
                                    className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-white text-[11px] font-semibold"
                                    style={{ backgroundColor: avatarColor }}
                                >
                                    {entry.name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12px] font-semibold text-[#111] truncate">{entry.name}</p>
                                    <p className="text-[10px] text-[#999]">@{entry.username}</p>
                                </div>
                                <button
                                    onClick={() => handleFollowToggle(entry.userId)}
                                    disabled={pendingId === entry.userId}
                                    className="flex-shrink-0 h-6 px-2 rounded-full bg-gray-100 text-[10px] font-semibold text-gray-600 hover:bg-gray-200 border-[0.5px] border-[#ddd]"
                                >
                                    {isFollowing ? 'Following' : 'Follow'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Premium Card */}
            <div className="bg-[#e63946] rounded-lg overflow-hidden text-white p-4">
                <p className="text-[13px] font-semibold mb-1">Go Premium</p>
                <p className="text-[11px] opacity-90 mb-3">Unlock analytics, verified badge & priority reach</p>
                <button className="w-full bg-white text-[#e63946] font-semibold text-[12px] py-2 rounded-full hover:bg-gray-50">
                    Upgrade now
                </button>
            </div>
        </aside>
    );
}