import { Search, X } from 'lucide-react';
import { memo } from 'react';

function SearchBar({ value, onChange, onClear, searching, inputRef, compact = false, inputId = 'global-post-search' }) {
    return (
        <div className={`relative ${compact ? 'max-w-none' : ''}`}>
            <label htmlFor={inputId} className="sr-only">Search posts</label>
            <div className="flex items-center gap-2 rounded-full bg-[var(--bg-card-soft)] px-3 py-1.5">
                <Search className="h-4 w-4 text-[var(--text-secondary)]" />
                <input
                    id={inputId}
                    ref={inputRef}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder="Search people, posts, topics..."
                    className="w-full bg-transparent text-[13px] text-[var(--text-secondary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
                />
                {value && (
                    <button
                        type="button"
                        onClick={onClear}
                        className="grid h-5 w-5 place-items-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--border-light)]"
                        aria-label="Clear search"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
                {searching && <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-red)]" />}
            </div>
        </div>
    );
}

export default memo(SearchBar);
