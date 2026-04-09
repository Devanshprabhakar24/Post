import { AnimatePresence, motion } from 'framer-motion';
import { Filter, SlidersHorizontal, Users } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';

export default function Sidebar({
    isOpen,
    onClose,
    selectedUser,
    onUserChange,
    sortMode,
    onSortModeChange,
    users
}) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.button
                        type="button"
                        aria-label="Close sidebar"
                        onClick={onClose}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-30 bg-black/50 lg:hidden"
                    />

                    <motion.aside
                        initial={{ x: -30, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -30, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="fixed left-0 top-[72px] z-40 h-[calc(100vh-72px)] w-80 overflow-y-auto border-r border-white/10 bg-slate-950/85 p-4 backdrop-blur lg:sticky lg:top-[88px] lg:z-10 lg:block lg:h-auto lg:w-full lg:rounded-2xl lg:border lg:bg-white/5"
                    >
                        <Card className="border-white/10 bg-transparent shadow-none">
                            <CardHeader className="flex items-center justify-between p-0 pb-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                                    <Filter className="h-4 w-4 text-blue-300" /> Filters
                                </div>
                                <Badge className="border-emerald-400/30 bg-emerald-500/10 text-emerald-300">Live</Badge>
                            </CardHeader>

                            <CardContent className="space-y-5 p-0">
                                <div>
                                    <label className="mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-slate-400">
                                        <Users className="h-3.5 w-3.5" /> Author
                                    </label>
                                    <select
                                        id="filter-author"
                                        value={selectedUser}
                                        onChange={(event) => onUserChange(event.target.value)}
                                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-400"
                                    >
                                        <option value="">All authors</option>
                                        {users.map((user) => (
                                            <option key={user.userId} value={user.userId} className="bg-slate-900">
                                                {user.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-slate-400">
                                        <SlidersHorizontal className="h-3.5 w-3.5" /> Sort
                                    </label>
                                    <select
                                        id="filter-sort"
                                        value={sortMode}
                                        onChange={(event) => onSortModeChange(event.target.value)}
                                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-400"
                                    >
                                        <option value="latest" className="bg-slate-900">Latest</option>
                                        <option value="liked" className="bg-slate-900">Most liked</option>
                                    </select>
                                </div>

                                <Button variant="ghost" className="w-full justify-center" onClick={onClose} aria-label="Close filters panel">
                                    Close panel
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
}
