function buildCommentTree(comments) {
    const items = Array.isArray(comments)
        ? comments.map((comment) => ({
            ...comment,
            replies: Array.isArray(comment.replies) ? comment.replies : []
        }))
        : [];

    const byId = new Map(items.map((comment) => [Number(comment.commentId), comment]));
    const roots = [];

    items.forEach((comment) => {
        const parentId = Number(comment.parentCommentId) || null;

        if (parentId && byId.has(parentId)) {
            byId.get(parentId).replies.push(comment);
            return;
        }

        roots.push(comment);
    });

    return roots;
}

module.exports = {
    buildCommentTree
};