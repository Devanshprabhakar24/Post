import { Hash } from 'lucide-react';
import { useParams } from 'react-router-dom';
import Home from './Home';

export default function HashtagPage(props) {
    const { tag } = useParams();

    return (
        <div className="space-y-4">
            <div className="rounded-3xl border border-cyan-200/10 bg-slate-900/50 p-5 backdrop-blur-xl">
                <h1 className="inline-flex items-center gap-2 text-2xl font-semibold text-white">
                    <Hash className="h-5 w-5 text-cyan-300" /> #{tag}
                </h1>
                <p className="mt-1 text-sm text-slate-300">Posts tagged with this hashtag.</p>
            </div>
            <Home {...props} forcedHashtag={String(tag || '').toLowerCase()} />
        </div>
    );
}