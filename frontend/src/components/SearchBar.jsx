import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Search } from 'lucide-react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPosts } from '../services/api';
import { Input } from './ui/input';

const placeholders = ['Search title...', 'Search content...', 'Search author names...'];

function escapeRegex(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function SearchBar({ value, onChange, onClear, searching, inputRef, compact = false, inputId = 'global-post-search' }) {
    const navigate = useNavigate();
    const prefersReducedMotion = useReducedMotion();
    const [focused, setFocused] = useState(false);
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [results, setResults] = useState([]);
    const [activeIndex, setActiveIndex] = useState(-1);
    const suggestionCacheRef = useRef(new Map());

    useEffect(() => {
        const timer = setInterval(() => {
            setPlaceholderIndex((previous) => (previous + 1) % placeholders.length);
        }, 2800);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const trimmed = String(value || '').trim();
        const normalized = trimmed.toLowerCase();

        if (!trimmed || trimmed.length < 2) {
            setResults([]);
            setActiveIndex(-1);
            return;
        }

        const cached = suggestionCacheRef.current.get(normalized);
        if (cached) {
            setResults(cached);
            return;
        }

        let active = true;
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            try {
                const response = await fetchPosts(
                    { page: 1, limit: 6, keyword: trimmed },
                    { signal: controller.signal }
                );
                if (!active) {
                    return;
                }
                const nextResults = Array.isArray(response?.posts) ? response.posts : [];
                suggestionCacheRef.current.set(normalized, nextResults);
                setResults(nextResults);
            } catch (_error) {
                if (active) {
                    setResults([]);
                }
            }
        }, 180);

        return () => {
            active = false;
            clearTimeout(timer);
            controller.abort();
        };
    }, [value]);

    const isDropdownVisible = focused && String(value || '').trim();

    const highlightedResults = useMemo(() => {
        const query = String(value || '').trim();
        if (!query) {
            return results;
        }

        const regex = new RegExp(`(${escapeRegex(query)})`, 'ig');
        return results.map((item) => ({
            ...item,
            titleParts: String(item.title || '').split(regex)
        }));
    }, [results, value]);

    const commitSelection = (item) => {
        if (!item?.postId) {
            return;
        }

        setFocused(false);
        setActiveIndex(-1);
        navigate(`/posts/${item.postId}`);
    };

    return (
        <div className="relative">
            <motion.div
                animate={{
                    scale: focused ? 1.01 : 1,
                    boxShadow: focused
                        ? '0 18px 42px rgba(37, 99, 235, 0.18)'
                        : '0 8px 24px rgba(2, 6, 23, 0.25)'
                }}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                className={`rounded-2xl border border-slate-200/80 bg-white/72 backdrop-blur-xl dark:border-white/15 dark:bg-slate-900/78 ${compact ? 'p-2.5' : 'p-3.5'}`}
            >
                <label htmlFor={inputId} className="sr-only">Search posts</label>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white/88 px-3.5 py-2.5 dark:border-white/15 dark:bg-slate-950/78">
                    <Search className="h-4.5 w-4.5 text-slate-500 dark:text-slate-300" />
                    <Input
                        id={inputId}
                        ref={inputRef}
                        value={value}
                        onChange={(event) => {
                            onChange(event.target.value);
                            setActiveIndex(-1);
                        }}
                        onFocus={() => setFocused(true)}
                        onBlur={() => {
                            setTimeout(() => setFocused(false), 120);
                        }}
                        onKeyDown={(event) => {
                            if (!highlightedResults.length) {
                                return;
                            }

                            if (event.key === 'ArrowDown') {
                                event.preventDefault();
                                setActiveIndex((current) => (current + 1) % highlightedResults.length);
                            }

                            if (event.key === 'ArrowUp') {
                                event.preventDefault();
                                setActiveIndex((current) => (current <= 0 ? highlightedResults.length - 1 : current - 1));
                            }

                            if (event.key === 'Enter') {
                                event.preventDefault();
                                commitSelection(highlightedResults[activeIndex >= 0 ? activeIndex : 0]);
                            }
                        }}
                        placeholder={placeholders[placeholderIndex]}
                        className="h-auto border-none bg-transparent px-0 py-0 text-[0.92rem] focus-visible:ring-0"
                    />
                    {value && (
                        <button
                            type="button"
                            onClick={onClear}
                            aria-label="Clear search"
                            className="text-xs font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                        >
                            Clear
                        </button>
                    )}
                    <AnimatePresence>
                        {searching && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.6 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.7 }}
                                transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
                                className="h-2.5 w-2.5 rounded-full bg-cyan-400"
                            />
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            <AnimatePresence>
                {isDropdownVisible && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-2xl backdrop-blur-xl dark:border-cyan-200/20 dark:bg-slate-950/96"
                    >
                        {highlightedResults.length === 0 ? (
                            <p className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300">No matches found</p>
                        ) : (
                            highlightedResults.map((item, index) => (
                                <button
                                    key={item.postId}
                                    type="button"
                                    onMouseEnter={() => setActiveIndex(index)}
                                    onClick={() => commitSelection(item)}
                                    className={`block w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                                        index === activeIndex ? 'bg-cyan-500/24 text-cyan-900 dark:text-cyan-50' : 'text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-white/10'
                                    }`}
                                >
                                    <p className="line-clamp-1 font-medium">
                                        {(item.titleParts || [item.title]).map((part, partIndex) => (
                                            part.toLowerCase() === String(value).toLowerCase() ? (
                                                <mark key={`${item.postId}-${partIndex}`} className="rounded bg-cyan-400/30 px-0.5 text-cyan-100">
                                                    {part}
                                                </mark>
                                            ) : (
                                                <span key={`${item.postId}-${partIndex}`}>{part}</span>
                                            )
                                        ))}
                                    </p>
                                    <p className="line-clamp-1 text-xs text-slate-500 dark:text-slate-300">@{item?.author?.username || item?.author?.name || `user-${item.userId}`}</p>
                                </button>
                            ))
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default memo(SearchBar);
