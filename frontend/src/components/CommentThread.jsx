import { memo, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, CornerDownRight, Reply } from 'lucide-react';
import ReplyForm from './ReplyForm';
import { Avatar } from './ui/avatar';
import { Button } from './ui/button';

function CommentCard({ comment, depth, onReply }) {
    const [showReplies, setShowReplies] = useState(depth === 0);
    const [replyOpen, setReplyOpen] = useState(false);

    const replies = Array.isArray(comment.replies) ? comment.replies : [];
    const canReply = depth < 1;

    const indentClass = useMemo(() => (depth === 0 ? '' : 'ml-8 border-l border-volt/35 pl-4'), [depth]);

    return (
        <div className={`space-y-3 rounded-2xl border border-mist/30 bg-ink/35 p-4 ${indentClass}`}>
            <div className="flex items-start gap-3">
                <Avatar name={comment.name} />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="font-display text-2xl leading-none text-paper">{comment.name}</p>
                        {comment.email && <p className="ui-font text-[10px] uppercase tracking-[0.14em] text-mist">{comment.email}</p>}
                    </div>
                    <p className="mt-2 whitespace-pre-line font-body text-base italic leading-7 text-mist">{comment.body}</p>
                </div>
            </div>

            <div className="flex items-center gap-2 ui-font text-[10px] uppercase tracking-[0.14em] text-mist">
                {canReply && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setReplyOpen((current) => !current)}>
                        <Reply className="mr-1 h-3.5 w-3.5" /> Reply
                    </Button>
                )}
                {replies.length > 0 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowReplies((current) => !current)}>
                        {showReplies ? <ChevronUp className="mr-1 h-3.5 w-3.5" /> : <ChevronDown className="mr-1 h-3.5 w-3.5" />}
                        {showReplies ? 'Collapse thread' : `Expand thread (${replies.length})`}
                    </Button>
                )}
            </div>

            {replyOpen && canReply && (
                <ReplyForm
                    placeholder={`Reply to ${comment.name}`}
                    submitLabel="Send reply"
                    onCancel={() => setReplyOpen(false)}
                    onSubmit={async (body) => {
                        await onReply?.(comment.commentId, body);
                        setReplyOpen(false);
                    }}
                />
            )}

            {showReplies && replies.length > 0 && (
                <div className="space-y-3">
                    {replies.map((reply) => (
                        <div key={reply.commentId} className="relative">
                            <div className="absolute left-[-1rem] top-4 text-volt">
                                <CornerDownRight className="h-4 w-4" />
                            </div>
                            <CommentCard comment={reply} depth={depth + 1} onReply={onReply} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function CommentThread({ comment, onReply }) {
    return <CommentCard comment={comment} depth={0} onReply={onReply} />;
}

export default memo(CommentThread);