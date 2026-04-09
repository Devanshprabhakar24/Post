import { useState } from 'react';
import { Button } from './ui/button';

export default function ReplyForm({ placeholder = 'Write a reply...', submitLabel = 'Reply', onSubmit, onCancel }) {
    const [value, setValue] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!value.trim() || submitting) {
            return;
        }

        setSubmitting(true);
        try {
            await onSubmit?.(value.trim());
            setValue('');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
                value={value}
                onChange={(event) => setValue(event.target.value)}
                rows={3}
                placeholder={placeholder}
                className="w-full rounded-xl border border-mist/35 bg-transparent px-3 py-2 font-body text-base italic text-paper outline-none transition focus:border-volt"
            />
            <div className="flex items-center justify-end gap-2">
                {onCancel && (
                    <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                        Cancel
                    </Button>
                )}
                <Button type="submit" size="sm" disabled={submitting || !value.trim()}>
                    {submitting ? 'Sending...' : submitLabel}
                </Button>
            </div>
        </form>
    );
}