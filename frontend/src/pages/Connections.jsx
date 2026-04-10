import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Loader from '../components/Loader';
import { useAuth } from '../context/AuthContext';
import { fetchUserById, fetchUsers } from '../services/api';

function normalizeId(value) {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? num : null;
}

export default function Connections({ mode = 'followers' }) {
    const { id: routeUserId } = useParams();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [profileData, setProfileData] = useState(null);
    const [users, setUsers] = useState([]);

    const authId = normalizeId(user?.userId);
    const targetUserId = normalizeId(routeUserId) || authId;

    useEffect(() => {
        let active = true;

        async function load() {
            if (!targetUserId) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const [profile, list] = await Promise.all([fetchUserById(targetUserId), fetchUsers()]);
                if (!active) {
                    return;
                }

                setProfileData(profile || null);
                setUsers(Array.isArray(list) ? list : []);
            } catch (error) {
                if (active) {
                    toast.error(error.message || 'Failed to load connections');
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        load();

        return () => {
            active = false;
        };
    }, [targetUserId]);

    const usersById = useMemo(() => {
        const map = new Map();
        (users || []).forEach((entry) => {
            map.set(Number(entry.userId), entry);
        });
        return map;
    }, [users]);

    const profileUser = profileData?.user || user;
    const ids = mode === 'following'
        ? (Array.isArray(profileUser?.following) ? profileUser.following : [])
        : (Array.isArray(profileUser?.followers) ? profileUser.followers : []);

    const connections = ids
        .map((id) => usersById.get(Number(id)))
        .filter(Boolean);

    if (loading) {
        return <Loader count={3} />;
    }

    return (
        <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] p-5">
                <h1 className="font-display text-[clamp(2.3rem,6vw,3.4rem)] leading-[0.9] text-[var(--text-primary)]">
                    {mode === 'following' ? 'Following' : 'Followers'}
                </h1>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {profileUser?.name || 'User'} • {connections.length} {mode}
                </p>
            </div>

            <div className="space-y-2">
                {connections.length === 0 ? (
                    <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] p-4 text-sm text-[var(--text-secondary)]">
                        No {mode} yet.
                    </div>
                ) : (
                    connections.map((entry) => {
                        return (
                            <div key={entry.userId} className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] p-3">
                                <Link to={`/profile/${entry.userId}`} className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{entry.name || entry.username}</p>
                                    <p className="truncate text-xs text-[var(--text-secondary)]">@{entry.username || entry.email}</p>
                                </Link>
                            </div>
                        );
                    })
                )}
            </div>

            <div className="flex justify-end">
                <Link to={targetUserId ? `/profile/${targetUserId}` : '/profile'} className="rounded-full border border-[var(--border-soft)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-card-soft)]">
                    Back to profile
                </Link>
            </div>
        </motion.section>
    );
}
