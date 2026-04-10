export default function Pagination({ currentPage, totalPages, onPageChange }) {
    if (!totalPages || totalPages <= 1) {
        return null;
    }

    const pages = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);

    for (let page = start; page <= end; page += 1) {
        pages.push(page);
    }

    return (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <button
                type="button"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card-soft)] px-4 py-2 ui-font text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)] transition hover:border-[var(--accent-red)] hover:text-[var(--accent-red)] disabled:cursor-not-allowed disabled:opacity-50 dark:hover:border-volt dark:hover:text-volt"
            >
                Prev
            </button>

            {pages.map((page) => (
                <button
                    type="button"
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`rounded-xl px-4 py-2 ui-font text-xs uppercase tracking-[0.14em] transition ${
                        page === currentPage
                            ? 'border border-volt/75 bg-volt text-[#090b10]'
                            : 'border border-[var(--border-soft)] bg-[var(--bg-card-soft)] text-[var(--text-secondary)] hover:border-[var(--accent-red)] hover:text-[var(--accent-red)] dark:hover:border-volt dark:hover:text-volt'
                    }`}
                >
                    {page}
                </button>
            ))}

            <button
                type="button"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card-soft)] px-4 py-2 ui-font text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)] transition hover:border-[var(--accent-red)] hover:text-[var(--accent-red)] disabled:cursor-not-allowed disabled:opacity-50 dark:hover:border-volt dark:hover:text-volt"
            >
                Next
            </button>
        </div>
    );
}
