export default function Loader({ count = 8 }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, index) => (
                <div key={index} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-lg">
                    <div className="flex items-start gap-3">
                        <div className="skeleton h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2.5">
                            <div className="skeleton h-4 w-48 rounded-md" />
                            <div className="skeleton h-4 w-28 rounded-md" />
                            <div className="skeleton h-4 w-full rounded-md" />
                            <div className="skeleton h-4 w-11/12 rounded-md" />
                            <div className="skeleton mt-3 h-40 w-full rounded-xl" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
