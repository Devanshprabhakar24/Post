import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Loader from '../components/Loader';
import { fetchStats } from '../services/api';

function StatCard({ label, value }) {
    return (
        <div className="rounded-2xl border border-mist/30 bg-ink/30 p-5">
            <p className="ui-font text-[10px] uppercase tracking-[0.18em] text-mist">{label}</p>
            <p className="mt-2 font-display text-5xl leading-none text-paper">{value}</p>
        </div>
    );
}

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        fetchStats()
            .then((data) => {
                if (active) {
                    setStats(data);
                }
            })
            .catch((error) => {
                toast.error(error.message || 'Failed to load stats');
            })
            .finally(() => {
                if (active) {
                    setLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, []);

    if (loading) {
        return <Loader count={4} />;
    }

    return (
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <header>
                <h1 className="font-display text-6xl leading-none text-paper">Admin Dashboard</h1>
                <p className="mt-1 font-body text-lg italic text-mist">Realtime high-level engagement and activity metrics.</p>
            </header>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Total Posts" value={stats?.totalPosts ?? 0} />
                <StatCard label="Total Users" value={stats?.totalUsers ?? 0} />
                <StatCard label="Total Comments" value={stats?.totalComments ?? 0} />
                <StatCard
                    label="Most Liked Post"
                    value={stats?.mostLikedPost?.likes ?? 0}
                />
            </div>

            <div className="rounded-2xl border border-mist/30 bg-ink/30 p-5">
                <p className="ui-font text-[10px] uppercase tracking-[0.16em] text-mist">Most Active User</p>
                <h2 className="mt-2 font-display text-4xl leading-none text-paper">{stats?.mostActiveUser?.name || 'N/A'}</h2>
                <p className="mt-1 font-body text-base italic text-mist">Posts: {stats?.mostActiveUser?.postCount ?? 0}</p>
            </div>
        </motion.section>
    );
}
