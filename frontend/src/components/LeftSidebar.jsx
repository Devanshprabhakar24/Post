import { Home, Compass, Bell, User } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchUserById } from '../services/api';
import { Avatar } from './ui/avatar';

const NAV_ITEMS = [
    { to: '/', label: 'Feed', icon: Home, color: '#e63946' },
    { to: '/explore', label: 'Explore', icon: Compass, color: '#5c6bc0' },
    { to: '/profile/followers', label: 'Followers', icon: Bell, color: '#5c6bc0' },
    { to: '/profile/following', label: 'Following', icon: Bell, color: '#00897b' },
    { to: '/profile', label: 'Profile', icon: User, color: '#ef6c00' }
];

export default function LeftSidebar({ onOpenNotifications, mobileOpen = false, onClose, theme = 'dark', users = [], posts = [] }) {
    const { user } = useAuth();
    const profileImage = user?.profilePic || user?.imageUrl || user?.profilePicData || '';
    const [profileStats, setProfileStats] = useState({ postsCount: null, followersCount: null });

    const profileSeed = Number(user?.userId) || 0;
    const bannerPalette = [
        ['#5c6bc0', '#7986cb'],
        ['#00695c', '#00897b'],
        ['#7b1fa2', '#ab47bc'],
        ['#ef6c00', '#ff9800'],
        ['#d32f2f', '#ef5350']
    ];
    const avatarPalette = ['#ef6c00', '#5c6bc0', '#00695c', '#7b1fa2', '#d32f2f'];

    const [bannerFrom, bannerTo] = bannerPalette[profileSeed % bannerPalette.length];
    const avatarColor = avatarPalette[profileSeed % avatarPalette.length];

    useEffect(() => {
        let active = true;
        const userId = Number(user?.userId || user?.id);

        if (!Number.isFinite(userId) || userId < 1) {
            setProfileStats({ postsCount: null, followersCount: null });
            return () => {
                active = false;
            };
        }

        fetchUserById(userId)
            .then((data) => {
                if (!active) {
                    return;
                }

                setProfileStats({
                    postsCount: Array.isArray(data?.posts) ? data.posts.length : 0,
                    followersCount: Number(data?.followersCount || 0)
                });
            })
            .catch(() => {
                if (active) {
                    setProfileStats({ postsCount: null, followersCount: null });
                }
            });

        return () => {
            active = false;
        };
    }, [user?.id, user?.userId]);

    const stats = useMemo(() => {
        const safePosts = Array.isArray(posts) ? posts : [];
        const currentId = String(user?.userId || '');
        const feedPostsCount = safePosts.filter((item) => String(item?.userId || item?.author?.userId || '') === currentId).length;
        const authoredPosts = Number.isFinite(profileStats.postsCount) ? profileStats.postsCount : feedPostsCount;
        const followersCount = Number(user?.followersCount)
            || Number(user?.followers?.length)
            || (Number.isFinite(profileStats.followersCount) ? profileStats.followersCount : 0);

        return { authoredPosts, followersCount };
    }, [posts, profileStats.followersCount, profileStats.postsCount, user]);

    const formattedFollowers = stats.followersCount >= 1000
        ? `${(stats.followersCount / 1000).toFixed(1)}k`
        : String(stats.followersCount);

    return (
        <aside className="sticky top-[84px] hidden h-[calc(100vh-96px)] w-[220px] self-start overflow-y-auto pr-1 md:block">
            {/* Profile Card */}
            <div className="mb-4 overflow-hidden rounded-lg border-[0.5px] border-[var(--border-light)] bg-[var(--bg-card)]">
                {/* Banner */}
                <div className="h-[50px] bg-gradient-to-r" style={{ backgroundImage: `linear-gradient(to right, ${bannerFrom}, ${bannerTo})` }} />
                
                {/* Profile Body */}
                <div className="p-3 pt-0">
                    {/* Avatar */}
                    <Avatar
                        name={user?.name || user?.username || 'User'}
                        src={profileImage}
                        className="mt-[-24px] mb-2 h-12 w-12 border-4 border-[var(--bg-card)]"
                    />
                    
                    {/* Name & Title */}
                    <p className="mb-0.5 text-[13px] font-semibold text-[var(--text-primary)]">{user?.name || user?.username || 'Your Name'}</p>
                    <p className="text-[11px] text-[var(--text-secondary)]">{user?.bio || 'Community Member'}</p>
                    
                    {/* Stats */}
                    <div className="mt-3 grid grid-cols-2 gap-1 border-t border-[var(--border-subtle)] pt-3">
                        <div className="text-center">
                            <p className="text-[15px] font-semibold text-[var(--text-primary)]">{stats.authoredPosts}</p>
                            <p className="text-[10px] text-[var(--text-tertiary)]">Posts</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[15px] font-semibold text-[var(--text-primary)]">{formattedFollowers}</p>
                            <p className="text-[10px] text-[var(--text-tertiary)]">Followers</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation List */}
            <div className="overflow-hidden rounded-lg border-[0.5px] border-[var(--border-light)] bg-[var(--bg-card)]">
                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                        <NavLink
                            key={item.label}
                            to={item.to}
                            onClick={onClose}
                            className={({ isActive }) =>
                                `flex cursor-pointer items-center gap-3 border-b-[0.5px] border-[var(--border-subtle)] px-4 py-3 text-[12px] font-semibold transition last:border-b-0 ${
                                    isActive
                                        ? 'text-[var(--accent-red)]'
                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`
                            }
                        >
                            <div
                                className="h-2 w-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: item.color }}
                            />
                            {item.label}
                        </NavLink>
                    );
                })}
            </div>
        </aside>
    );
}