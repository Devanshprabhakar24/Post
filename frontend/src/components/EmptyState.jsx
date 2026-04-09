import { motion } from 'framer-motion';
import { SearchX } from 'lucide-react';

export default function EmptyState({ title = 'No posts found', description = 'Try changing your filters or search query.' }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center"
        >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5">
                <SearchX className="h-6 w-6 text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="mt-2 text-sm text-slate-400">{description}</p>
        </motion.div>
    );
}
