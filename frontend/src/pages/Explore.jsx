import { Compass } from 'lucide-react';
import Home from './Home';

export default function Explore(props) {
    return (
        <div className="space-y-4">
            <div className="editorial-surface rounded-3xl border border-mist/30 p-5">
                <h1 className="inline-flex items-center gap-2 font-display text-5xl leading-none text-paper">
                    <Compass className="h-5 w-5 text-volt" /> Explore
                </h1>
                <p className="mt-1 font-body text-lg italic text-mist">Discover trending topics and fresh conversations.</p>
            </div>
            <Home {...props} />
        </div>
    );
}