import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPosts } from '../services/api';

const placeholders = ['Search title, body, authors, hashtags', 'Find live stories', 'Spotlight post archive'];

function escapeRegex(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function SearchBar({ value, onChange, onClear, searching, inputRef, compact = false, inputId = 'global-post-search' }) {
    const navigate = useNavigate();
    const reduced = useReducedMotion();

    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [results, setResults] = useState([]);
    const [expanded, setExpanded] = useState(false);

    const cacheRef = useRef(new Map());
    const lastQueryRef = useRef('');

    useEffect(() => {
        const timer = setInterval(() => {
            setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
        }, 3600);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const trimmed = String(value || '').trim();
        const normalized = trimmed.toLowerCase();

        if (!trimmed || trimmed.length < 3) {
            setResults([]);
            setActiveIndex(-1);
            return;
        }

        if (lastQueryRef.current === normalized) {
            return;
        }

        const cached = cacheRef.current.get(normalized);
        if (cached) {
            setResults(cached);
            return;
        }

        const ctrl = new AbortController();
        const timer = setTimeout(async () => {
            try {
                const response = await fetchPosts({ page: 1, limit: 6, keyword: trimmed }, { signal: ctrl.signal });
                const next = Array.isArray(response?.posts) ? response.posts : [];
                lastQueryRef.current = normalized;
                cacheRef.current.set(normalized, next);
                setResults(next);
            } catch (_error) {
                setResults([]);
                lastQueryRef.current = '';
            }
        }, 220);

        return () => {
            clearTimeout(timer);
            ctrl.abort();
        };
    }, [value]);

    useEffect(() => {
        if (!expanded) {
            return undefined;
        }

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                setExpanded(false);
            }

            if (event.key === 'ArrowDown' && results.length) {
                event.preventDefault();
                setActiveIndex((current) => (current + 1) % results.length);
            }

            if (event.key === 'ArrowUp' && results.length) {
                event.preventDefault();
                setActiveIndex((current) => (current <= 0 ? results.length - 1 : current - 1));
            }

            if (event.key === 'Enter' && results.length) {
                event.preventDefault();
                const item = results[activeIndex >= 0 ? activeIndex : 0];
                if (item?.postId) {
                    navigate(`/posts/${item.postId}`);
                    setExpanded(false);
                }
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [activeIndex, expanded, navigate, results]);

    const highlighted = useMemo(() => {
        const query = String(value || '').trim();
        if (!query) {
            return results;
        }

        const regex = new RegExp(`(${escapeRegex(query)})`, 'ig');
        return results.map((item) => ({
            ...item,
            titleParts: String(item?.title || '').split(regex)
        }));
    }, [results, value]);

    const commitSelection = (item) => {
        if (!item?.postId) {
            return;
        }

        navigate(`/posts/${item.postId}`);
        setExpanded(false);
    };

    return (
        <>
            <motion.div
                className={`relative ${compact ? 'max-w-[560px]' : ''}`}
                initial={false}
                animate={{ scale: expanded ? 1.02 : 1 }}
                transition={{ duration: 0.3 }}
            >
                <label htmlFor={inputId} className="sr-only">Search posts</label>
                <div className="editorial-surface flex items-center gap-2 rounded-full px-3 py-2">
                    <Search className="h-4.5 w-4.5 text-mist" />
                    <input
                        id={inputId}
                        ref={inputRef}
                        value={value}
                        onChange={(event) => {
                            onChange(event.target.value);
                            setActiveIndex(-1);
                        }}
                        onFocus={() => setExpanded(true)}
                        placeholder={placeholders[placeholderIndex]}
                        className="w-full bg-transparent font-ui text-xs tracking-wide text-paper placeholder:text-mist/80 focus:outline-none"
                    />
                    {value && (
                        <button
                            type="button"
                            onClick={onClear}
                            className="rounded-full border border-mist/35 px-2 py-0.5 font-ui text-[10px] uppercase tracking-[0.14em] text-mist hover:border-volt hover:text-volt"
                        >
                            Clear
                        </button>
                    )}
                    {searching && <span className="h-2 w-2 rounded-full bg-volt animate-pulse" />}
                </div>
            </motion.div>

            <AnimatePresence>
                {expanded && (
                    <>
                        <motion.button
                            type="button"
                            onClick={() => setExpanded(false)}
                            initial={reduced ? { opacity: 1 } : { opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="search-overlay-backdrop fixed inset-0 z-[70]"
                            aria-label="Close search overlay"
                        />

                        <motion.div
                            initial={reduced ? { opacity: 1 } : { opacity: 0, clipPath: 'inset(50% 50% 50% 50% round 24px)' }}
                            animate={{ opacity: 1, clipPath: 'inset(0% 0% 0% 0% round 0px)' }}
                            exit={reduced ? { opacity: 1 } : { opacity: 0, clipPath: 'inset(50% 50% 50% 50% round 24px)' }}
                            transition={reduced ? { duration: 0 } : { duration: 0.48, ease: [0.76, 0, 0.24, 1] }}
                            className="fixed inset-0 z-[80] overflow-y-auto px-5 pb-12 pt-20 sm:px-10"
                        >
                            <div className="mx-auto max-w-4xl space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-display text-5xl text-paper">SEARCH</h3>
                                    <button
                                        type="button"
                                        onClick={() => setExpanded(false)}
                                        className="magnetic-hit rounded-full border border-mist/35 p-2 text-mist hover:border-volt hover:text-volt"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="editorial-surface rounded-2xl p-3">
                                    <div className="flex items-center gap-3 rounded-xl border border-mist/30 px-3 py-3">
                                        <Search className="h-5 w-5 text-mist" />
                                        <input
                                            value={value}
                                            onChange={(event) => onChange(event.target.value)}
                                            autoFocus
                                            className="w-full bg-transparent font-ui text-sm uppercase tracking-[0.08em] text-paper placeholder:text-mist/80 focus:outline-none"
                                            placeholder="Type at least 3 characters"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {highlighted.length === 0 ? (
                                        <p className="font-body italic text-mist">No results yet.</p>
                                    ) : (
                                        highlighted.map((item, index) => (
                                            <motion.button
                                                key={item.postId}
                                                type="button"
                                                onMouseEnter={() => setActiveIndex(index)}
                                                onClick={() => commitSelection(item)}
                                                initial={reduced ? { opacity: 1 } : { opacity: 0, y: 24 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: reduced ? 0 : 0.36, delay: reduced ? 0 : index * 0.05 }}
                                                className={`block w-full rounded-xl border px-4 py-3 text-left transition ${
                                                    index === activeIndex
                                                        ? 'border-volt/70 bg-volt/20 text-paper'
                                                        : 'border-mist/30 bg-ink-soft/45 text-paper hover:border-volt/55'
                                                }`}
                                            >
                                                <p className="font-display text-3xl leading-none text-paper">
                                                    {(item?.titleParts || [item?.title]).map((part, partIndex) => (
                                                        part.toLowerCase() === String(value || '').trim().toLowerCase() ? (
                                                            <mark key={`${item.postId}-${partIndex}`} className="bg-volt px-1 text-ink">{part}</mark>
                                                        ) : (
                                                            <span key={`${item.postId}-${partIndex}`}>{part}</span>
                                                        )
                                                    ))}
                                                </p>
                                                <p className="mt-1 font-ui text-xs uppercase tracking-[0.14em] text-mist">
                                                    @{item?.author?.username || item?.author?.name || `user-${item?.userId}`}
                                                </p>
                                            </motion.button>
                                        ))
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}

export default memo(SearchBar);
