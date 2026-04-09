import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Loader from '../components/Loader';
import { fetchStats } from '../services/api';

function StatCard({ label, value }) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
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
                <h1 className="text-2xl font-semibold text-white sm:text-3xl">Admin Dashboard</h1>
                <p className="mt-1 text-sm text-slate-300">Realtime high-level engagement and activity metrics.</p>
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

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Most Active User</p>
                <h2 className="mt-2 text-xl font-semibold text-white">{stats?.mostActiveUser?.name || 'N/A'}</h2>
                <p className="mt-1 text-sm text-slate-300">Posts: {stats?.mostActiveUser?.postCount ?? 0}</p>
            </div>
        </motion.section>
    );
}
