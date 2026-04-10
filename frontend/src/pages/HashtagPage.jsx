import { Hash } from 'lucide-react';
import { useParams } from 'react-router-dom';
import Home from './Home';

export default function HashtagPage(props) {
    const { tag } = useParams();

    return (
        <div className="space-y-4">
            <div className="editorial-surface rounded-3xl border border-[var(--border-soft)] p-5">
                <h1 className="inline-flex items-center gap-2 font-display text-5xl leading-none text-[var(--text-primary)]">
                    <Hash className="h-5 w-5 text-[var(--accent-red)]" /> #{tag}
                </h1>
                <p className="mt-1 font-body text-lg italic text-[var(--text-secondary)]">Posts tagged with this hashtag.</p>
            </div>
            <Home {...props} forcedHashtag={String(tag || '').toLowerCase()} />
        </div>
    );
}