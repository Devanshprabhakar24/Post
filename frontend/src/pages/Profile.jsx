import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Loader from '../components/Loader';
import PostCard from '../components/PostCard';
import { Avatar } from '../components/ui/avatar';
import { useAuth } from '../context/AuthContext';
import { useSocketContext } from '../context/SocketContext';
import useCountUp from '../hooks/useCountUp';
import { fetchUserById, fetchUsers, followUser, likePost, unlikePost, unfollowUser, uploadProfilePicture } from '../services/api';

function hashGradient(seed) {
    const text = String(seed || 'profile');
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
        hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }

    const h1 = Math.abs(hash) % 360;
    const h2 = (h1 + 60) % 360;
    return `linear-gradient(120deg, hsl(${h1} 60% 18%), hsl(${h2} 65% 24%))`;
}

export default function Profile() {
    const navigate = useNavigate();
    const { user, updateUser } = useAuth();
    const { isUserOnline } = useSocketContext();
    const { id: routeUserId } = useParams();

    const [profileData, setProfileData] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingFollow, setUpdatingFollow] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState('');
    const hasShownFetchError = useRef(false);

    const routeId = Number(routeUserId);
    const authId = Number(user?.userId || user?.id);
    const hasExplicitRouteUserId = Number.isFinite(routeId) && routeId > 0;
    const viewedUserId = hasExplicitRouteUserId
        ? routeId
        : (Number.isFinite(authId) && authId > 0 ? authId : null);
    const profileUser = profileData?.user || user;
    const posts = profileData?.posts || [];
    const followersCount = profileData?.followersCount || 0;
    const followingCount = profileData?.followingCount || 0;
    const isFollowing = Boolean(profileData?.isFollowing);
    const isOwnProfile = Number(profileUser?.userId) === Number(user?.userId);
    const profileImage = photoPreview || profileUser?.profilePic || profileUser?.imageUrl || profileUser?.profilePicData || '';
    const profileBasePath = viewedUserId ? `/profile/${viewedUserId}` : '/profile';

    const postsAnimated = useCountUp(posts.length);
    const followersAnimated = useCountUp(followersCount);
    const followingAnimated = useCountUp(followingCount);

    useEffect(() => {
        let active = true;

        fetchUsers()
            .then((list) => {
                if (active) {
                    setUsers(Array.isArray(list) ? list : []);
                }
            })
            .catch(() => {
                if (active) {
                    setUsers([]);
                }
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        let active = true;

        async function load() {
            if (!viewedUserId) {
                if (active) {
                    setProfileData((current) => current || {
                        user: user || null,
                        posts: [],
                        followersCount: Number(user?.followersCount || user?.followers?.length || 0),
                        followingCount: Number(user?.followingCount || user?.following?.length || 0),
                        isFollowing: false
                    });
                    setLoading(false);
                }
                return;
            }

            setLoading(true);
            try {
                const data = await fetchUserById(viewedUserId);
                if (active) {
                    setProfileData(data || null);
                    hasShownFetchError.current = false;
                }
            } catch (error) {
                const isOwnProfileFallback = !hasExplicitRouteUserId;

                if (!isOwnProfileFallback && !hasShownFetchError.current) {
                    toast.error(error.message || 'Failed to load profile');
                    hasShownFetchError.current = true;
                }

                if (active) {
                    setProfileData((current) => current || {
                        user: user || null,
                        posts: [],
                        followersCount: Number(user?.followersCount || user?.followers?.length || 0),
                        followingCount: Number(user?.followingCount || user?.following?.length || 0),
                        isFollowing: false
                    });
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        load();

        return () => {
            active = false;
        };
    }, [hasExplicitRouteUserId, user, viewedUserId]);

    const userMap = useMemo(
        () => users.reduce((acc, entry) => {
            acc[Number(entry.userId)] = entry;
            return acc;
        }, {}),
        [users]
    );

    const handleFollowToggle = async () => {
        if (isOwnProfile || !profileUser?.userId) {
            return;
        }

        setUpdatingFollow(true);
        try {
            const result = isFollowing ? await unfollowUser(profileUser.userId) : await followUser(profileUser.userId);
            setProfileData((current) => current ? {
                ...current,
                isFollowing: Boolean(result?.isFollowing),
                followersCount: Number(result?.followersCount ?? current.followersCount),
                followingCount: Number(result?.followingCount ?? current.followingCount)
            } : current);
            toast.success(isFollowing ? 'Unfollowed' : 'Following');
        } catch (error) {
            toast.error(error.message || 'Failed to update follow state');
        } finally {
            setUpdatingFollow(false);
        }
    };

    const handleLikeToggle = async (targetPost) => {
        if (!targetPost?.postId || !user?.userId) {
            return;
        }

        const shouldLike = !targetPost?.isLiked;

        setProfileData((current) => {
            if (!current) {
                return current;
            }

            return {
                ...current,
                posts: (current.posts || []).map((entry) => entry.postId === targetPost.postId
                    ? {
                        ...entry,
                        isLiked: shouldLike,
                        likes: Math.max(0, Number(entry.likes || 0) + (shouldLike ? 1 : -1))
                    }
                    : entry)
            };
        });

        try {
            if (shouldLike) {
                await likePost(targetPost.postId, user.userId);
            } else {
                await unlikePost(targetPost.postId, user.userId);
            }
        } catch (error) {
            toast.error(error.message || 'Failed to update like');
            setProfileData((current) => {
                if (!current) {
                    return current;
                }

                return {
                    ...current,
                    posts: (current.posts || []).map((entry) => entry.postId === targetPost.postId
                        ? {
                            ...entry,
                            isLiked: !shouldLike,
                            likes: Math.max(0, Number(entry.likes || 0) + (shouldLike ? -1 : 1))
                        }
                        : entry)
                };
            });
        }
    };

    const handleProfilePhotoChange = (event) => {
        const file = event.target.files?.[0] || null;
        if (!file) {
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size must be 5MB or smaller');
            return;
        }

        if (photoPreview) {
            URL.revokeObjectURL(photoPreview);
        }

        setSelectedPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
    };

    const handleUploadProfilePhoto = async () => {
        if (!selectedPhotoFile) {
            return;
        }

        setUploadingPhoto(true);
        try {
            const updated = await uploadProfilePicture(selectedPhotoFile);
            setProfileData((current) => current ? {
                ...current,
                user: {
                    ...current.user,
                    imageUrl: updated?.imageUrl || '',
                    profilePic: updated?.profilePic || updated?.imageUrl || ''
                }
            } : current);
            updateUser?.({
                imageUrl: updated?.imageUrl || '',
                profilePic: updated?.profilePic || updated?.imageUrl || ''
            });
            setSelectedPhotoFile(null);
            if (photoPreview) {
                URL.revokeObjectURL(photoPreview);
            }
            setPhotoPreview('');
            toast.success('Profile picture updated');
        } catch (error) {
            toast.error(error.message || 'Failed to upload profile picture');
        } finally {
            setUploadingPhoto(false);
        }
    };

    useEffect(() => () => {
        if (photoPreview) {
            URL.revokeObjectURL(photoPreview);
        }
    }, [photoPreview]);

    if (loading) {
        return <Loader count={3} />;
    }

    return (
        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="relative overflow-hidden rounded-3xl border border-mist/30">
                <div className="h-56 w-full" style={{ background: hashGradient(profileUser?.username || profileUser?.name) }} />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(200,241,53,0.22),transparent_40%)]" />

                <div className="relative -mt-10 bg-[var(--bg-card)] px-6 pb-6">
                    <Avatar
                        name={profileUser?.name}
                        src={profileImage}
                        online={Boolean(profileUser?.isOnline || isUserOnline(profileUser?.userId))}
                        className="h-24 w-24 border-4 border-[var(--bg-card)]"
                    />

                    <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h1 className="font-display text-[clamp(3rem,8vw,4.4rem)] leading-[0.9] text-[var(--text-primary)]">{profileUser?.name || 'Profile'}</h1>
                            <p className="ui-font text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">@{profileUser?.username || profileUser?.email}</p>
                            <p className="mt-3 max-w-2xl font-body text-xl italic text-[var(--text-secondary)]">{profileUser?.bio || 'No bio yet.'}</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {!isOwnProfile && (
                                <button
                                    type="button"
                                    onClick={handleFollowToggle}
                                    disabled={updatingFollow}
                                    className="rounded-full border border-volt/70 bg-volt px-4 py-2 ui-font text-xs uppercase tracking-[0.14em] text-ink disabled:opacity-60"
                                >
                                    {updatingFollow ? 'Updating...' : isFollowing ? 'Following' : 'Follow'}
                                </button>
                            )}

                            {isOwnProfile && (
                                <>
                                    <label className="cursor-pointer rounded-full border border-mist/45 px-4 py-2 ui-font text-xs uppercase tracking-[0.14em] text-mist hover:border-volt hover:text-volt">
                                        Choose photo
                                        <input type="file" accept="image/*" onChange={handleProfilePhotoChange} className="hidden" />
                                    </label>
                                    {selectedPhotoFile && (
                                        <button
                                            type="button"
                                            onClick={handleUploadProfilePhoto}
                                            disabled={uploadingPhoto}
                                            className="rounded-full border border-volt/70 bg-volt px-4 py-2 ui-font text-xs uppercase tracking-[0.14em] text-ink disabled:opacity-60"
                                        >
                                            {uploadingPhoto ? 'Uploading...' : 'Upload'}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    <div className="mt-5 grid max-w-xl gap-2 sm:grid-cols-3">
                        <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-card-soft)] p-3">
                            <p className="ui-font text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">Posts</p>
                            <p className="font-display text-4xl text-[var(--text-primary)]">{postsAnimated}</p>
                        </div>
                        <Link to={`${profileBasePath}/followers`} className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-card-soft)] p-3 transition hover:border-[var(--accent-red)]/50">
                            <p className="ui-font text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">Followers</p>
                            <p className="font-display text-4xl text-[var(--text-primary)]">{followersAnimated}</p>
                        </Link>
                        <Link to={`${profileBasePath}/following`} className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-card-soft)] p-3 transition hover:border-[var(--accent-red)]/50">
                            <p className="ui-font text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">Following</p>
                            <p className="font-display text-4xl text-[var(--text-primary)]">{followingAnimated}</p>
                        </Link>
                    </div>
                </div>
            </div>

            <div className="columns-1 gap-4 md:columns-2">
                {posts.length === 0 ? (
                    <p className="font-body italic text-mist">No posts yet.</p>
                ) : (
                    posts.map((post, index) => (
                        <PostCard
                            key={post.postId}
                            post={{
                                ...post,
                                author: userMap[post.userId] || post.author,
                                isLiked: Boolean(post?.isLiked),
                                commentsCount: post.commentsCount || 0
                            }}
                            index={index}
                            onToggleLike={handleLikeToggle}
                            onOpenPreview={(targetPost) => navigate(`/posts/${targetPost.postId}`)}
                            onOpenDetails={(targetPost) => navigate(`/posts/${targetPost.postId}`)}
                            onOpenComments={(targetPost) => navigate(`/posts/${targetPost.postId}`)}
                            onTagClick={(tag) => navigate(`/hashtags/${String(tag || '').toLowerCase()}`)}
                            onFollowUser={(targetPost) => navigate(`/profile/${targetPost.userId}`)}
                        />
                    ))
                )}
            </div>

            <div className="flex justify-end">
                <Link to="/" className="rounded-full border border-mist/35 px-4 py-2 ui-font text-xs uppercase tracking-[0.14em] text-mist hover:border-volt hover:text-volt">
                    Back to feed
                </Link>
            </div>
        </motion.section>
    );
}
