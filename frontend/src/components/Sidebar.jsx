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
                        className="fixed left-0 top-[72px] z-40 h-[calc(100vh-72px)] w-80 overflow-y-auto border-r border-mist/30 bg-ink-soft/95 p-4 backdrop-blur-xl lg:sticky lg:top-[88px] lg:z-10 lg:block lg:h-auto lg:w-full lg:rounded-3xl lg:border lg:bg-ink-soft/80"
                    >
                        <Card className="border-mist/25 bg-transparent shadow-none">
                            <CardHeader className="flex items-center justify-between p-0 pb-4">
                                <div className="ui-font flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-paper">
                                    <Filter className="h-4 w-4 text-volt" /> Filters
                                </div>
                                <Badge className="border-volt/50 bg-volt/15 text-volt">Live</Badge>
                            </CardHeader>

                            <CardContent className="space-y-5 p-0">
                                <div>
                                    <label className="ui-font mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-mist">
                                        <Users className="h-3.5 w-3.5" /> Author
                                    </label>
                                    <select
                                        id="filter-author"
                                        value={selectedUser}
                                        onChange={(event) => onUserChange(event.target.value)}
                                        className="font-body w-full rounded-2xl border border-mist/35 bg-paper/8 px-3 py-2.5 text-sm text-paper outline-none transition focus:border-volt/70"
                                    >
                                        <option value="">All authors</option>
                                        {users.map((user) => (
                                            <option key={user.userId} value={user.userId} className="bg-ink-soft">
                                                {user.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="ui-font mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-mist">
                                        <SlidersHorizontal className="h-3.5 w-3.5" /> Sort
                                    </label>
                                    <select
                                        id="filter-sort"
                                        value={sortMode}
                                        onChange={(event) => onSortModeChange(event.target.value)}
                                        className="font-body w-full rounded-2xl border border-mist/35 bg-paper/8 px-3 py-2.5 text-sm text-paper outline-none transition focus:border-volt/70"
                                    >
                                        <option value="latest" className="bg-ink-soft">Latest</option>
                                        <option value="liked" className="bg-ink-soft">Most liked</option>
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
