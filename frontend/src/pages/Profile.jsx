import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Loader from '../components/Loader';
import { Avatar } from '../components/ui/avatar';
import { useAuth } from '../context/AuthContext';
import { fetchUserById, fetchUsers, followUser, unfollowUser, uploadProfilePicture } from '../services/api';
import { useSocketContext } from '../context/SocketContext';

export default function Profile() {
    const { user, updateUser } = useAuth();
    const { isUserOnline } = useSocketContext();
    const { id: routeUserId } = useParams();
    const [profileData, setProfileData] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingFollow, setUpdatingFollow] = useState(false);
    const [followHover, setFollowHover] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState('');
    const [listModal, setListModal] = useState(null);

    const viewedUserId = Number(routeUserId || user?.userId);
    const profileUser = profileData?.user || user;
    const posts = profileData?.posts || [];
    const followersCount = profileData?.followersCount || 0;
    const followingCount = profileData?.followingCount || 0;
    const isFollowing = Boolean(profileData?.isFollowing);
    const isOwnProfile = Number(profileUser?.userId) === Number(user?.userId);
    const displayedProfilePic = photoPreview || profileUser?.profilePic || profileUser?.profilePicData || profileUser?.imageUrl || '';

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

        async function loadProfile() {
            try {
                const targetUser = routeUserId ? await fetchUserById(routeUserId) : await fetchUserById(user.userId);

                if (!active) {
                    return;
                }

                setProfileData(targetUser || null);
            } catch (error) {
                toast.error(error.message || 'Failed to load profile');
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadProfile();

        return () => {
            active = false;
        };
    }, [routeUserId, user.userId]);

    const initials = useMemo(() => {
        const name = String(profileUser?.name || '').trim();
        if (!name) {
            return 'U';
        }
        return name
            .split(' ')
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() || '')
            .join('');
    }, [profileUser?.name]);

    const userMap = useMemo(
        () =>
            users.reduce((acc, entry) => {
                acc[Number(entry.userId)] = entry;
                return acc;
            }, {}),
        [users]
    );

    const openFollowers = () => setListModal('followers');
    const openFollowing = () => setListModal('following');

    const listEntries = useMemo(() => {
        const ids = Array.isArray(profileUser?.[listModal]) ? profileUser[listModal] : [];
        const uniqueIds = Array.from(new Set(ids.map((entry) => Number(entry)).filter((entry) => Number.isFinite(entry))));

        return uniqueIds
            .map((entryId) => userMap[entryId] || { userId: entryId, name: `User ${entryId}`, username: '', email: '', isExternal: true })
            .filter(Boolean)
            .sort((a, b) => Number(b.userId) - Number(a.userId));
    }, [listModal, profileUser, userMap]);

    const handleFollowToggle = async () => {
        if (isOwnProfile || !profileUser?.userId) {
            return;
        }

        setUpdatingFollow(true);
        try {
            const result = isFollowing ? await unfollowUser(profileUser.userId) : await followUser(profileUser.userId);
            setProfileData((current) =>
                current
                    ? {
                          ...current,
                          isFollowing: Boolean(result?.isFollowing),
                          followersCount: Number(result?.followersCount ?? current.followersCount),
                          followingCount: Number(result?.followingCount ?? current.followingCount)
                      }
                    : current
            );
            toast.success(isFollowing ? 'Unfollowed' : 'Following');
        } catch (error) {
            toast.error(error.message || 'Failed to update follow state');
        } finally {
            setUpdatingFollow(false);
        }
    };

    const handleProfilePhotoChange = (event) => {
        const file = event.target.files?.[0] || null;

        if (!file) {
            return;
        }

        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowed.includes(String(file.type || '').toLowerCase())) {
            toast.error('Only JPG, JPEG, PNG, and WEBP images are allowed');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size must be 5MB or smaller');
            return;
        }

        if (photoPreview) {
            URL.revokeObjectURL(photoPreview);
        }

        const nextPreview = URL.createObjectURL(file);
        setSelectedPhotoFile(file);
        setPhotoPreview(nextPreview);
    };

    const handleRemoveSelectedPhoto = () => {
        if (photoPreview) {
            URL.revokeObjectURL(photoPreview);
        }
        setSelectedPhotoFile(null);
        setPhotoPreview('');
    };

    const handleUploadProfilePhoto = async () => {
        if (!selectedPhotoFile) {
            return;
        }

        setUploadingPhoto(true);
        try {
            const updated = await uploadProfilePicture(selectedPhotoFile);

            setProfileData((current) =>
                current
                    ? {
                          ...current,
                          user: {
                              ...current.user,
                              imageUrl: updated?.imageUrl || '',
                              profilePic: updated?.profilePic || updated?.imageUrl || '',
                              profilePicData: updated?.profilePicData || '',
                              profilePicContentType: updated?.profilePicContentType || ''
                          }
                      }
                    : current
            );

            updateUser?.({
                imageUrl: updated?.imageUrl || '',
                profilePic: updated?.profilePic || updated?.imageUrl || '',
                profilePicData: updated?.profilePicData || '',
                profilePicContentType: updated?.profilePicContentType || ''
            });

            handleRemoveSelectedPhoto();
            toast.success('Profile picture updated');
        } catch (error) {
            toast.error(error.message || 'Failed to upload profile picture');
        } finally {
            setUploadingPhoto(false);
        }
    };

    useEffect(() => {
        return () => {
            if (photoPreview) {
                URL.revokeObjectURL(photoPreview);
            }
        };
    }, [photoPreview]);

    if (loading) {
        return <Loader count={4} />;
    }

    return (
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-cyan-200/10 dark:bg-slate-900/50">
                <div className="relative h-40 w-full bg-gradient-to-r from-cyan-500/40 via-blue-500/30 to-emerald-500/30">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.2),transparent_35%)]" />
                </div>

                <div className="relative px-5 pb-5">
                    <Avatar
                        name={profileUser?.name}
                        src={displayedProfilePic}
                        online={Boolean(profileUser?.isOnline || isUserOnline(profileUser?.userId))}
                        className="-mt-12 h-24 w-24 border-4 border-white dark:border-slate-950"
                    />

                    <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">{profileUser?.name}</h1>
                            <p className="text-sm text-slate-600 dark:text-slate-300">@{profileUser?.username || profileUser?.email}</p>
                            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">{profileUser?.bio || 'No bio yet.'}</p>

                            {isOwnProfile && (
                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                    <label className="cursor-pointer rounded-xl border border-slate-300/80 bg-white/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 transition hover:border-cyan-300/40 hover:bg-cyan-500/10 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-cyan-300/30">
                                        Choose Photo
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/jpg,image/png,image/webp"
                                            onChange={handleProfilePhotoChange}
                                            className="hidden"
                                        />
                                    </label>

                                    {selectedPhotoFile && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={handleUploadProfilePhoto}
                                                disabled={uploadingPhoto}
                                                className="rounded-xl bg-gradient-to-r from-cyan-400 to-teal-500 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                                            >
                                                {uploadingPhoto ? 'Uploading...' : 'Upload'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleRemoveSelectedPhoto}
                                                disabled={uploadingPhoto}
                                                className="rounded-xl border border-slate-300/80 bg-white/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                                            >
                                                Remove
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="rounded-xl border border-slate-300/80 bg-slate-100/80 px-4 py-2 text-sm text-slate-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
                                <div className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Followers</div>
                                <button
                                    type="button"
                                    onClick={openFollowers}
                                    className="text-lg font-semibold text-slate-900 transition hover:text-cyan-700 dark:text-white dark:hover:text-cyan-300"
                                >
                                    {followersCount}
                                </button>
                            </div>
                            <div className="rounded-xl border border-slate-300/80 bg-slate-100/80 px-4 py-2 text-sm text-slate-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
                                <div className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Following</div>
                                <button
                                    type="button"
                                    onClick={openFollowing}
                                    className="text-lg font-semibold text-slate-900 transition hover:text-cyan-700 dark:text-white dark:hover:text-cyan-300"
                                >
                                    {followingCount}
                                </button>
                            </div>
                            {!isOwnProfile && (
                                <button
                                    type="button"
                                    onMouseEnter={() => setFollowHover(true)}
                                    onMouseLeave={() => setFollowHover(false)}
                                    onClick={handleFollowToggle}
                                    disabled={updatingFollow}
                                    className={`relative min-w-[108px] overflow-hidden rounded-xl px-4 py-2 text-sm font-semibold transition ${
                                        isFollowing
                                            ? 'border border-slate-300/80 bg-white/80 text-slate-700 hover:bg-rose-500 hover:text-white dark:border-white/10 dark:bg-white/5 dark:text-slate-200'
                                            : 'bg-gradient-to-r from-cyan-400 to-teal-500 text-slate-950 hover:brightness-110'
                                    } disabled:cursor-not-allowed disabled:opacity-70`}
                                >
                                    {updatingFollow ? 'Updating...' : isFollowing && followHover ? 'Unfollow' : isFollowing ? 'Following' : 'Follow'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-full bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-700 dark:text-cyan-200 inline-flex">
                Posts ({posts.length})
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white/75 p-5 dark:border-white/10 dark:bg-white/5">
                <div className="space-y-3">
                    {posts.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">No posts yet.</p>
                    ) : (
                        posts.map((post) => (
                            <div key={post.postId} className="rounded-xl border border-slate-200/80 bg-slate-100/85 p-3 text-sm text-slate-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
                                <p className="font-medium text-slate-900 dark:text-white">{post.title}</p>
                                <p className="mt-1 text-slate-600 dark:text-slate-400">{post.body}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {listModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-3xl border border-slate-200/90 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.24)] dark:border-cyan-200/10 dark:bg-slate-950 dark:shadow-[0_24px_80px_rgba(2,6,23,0.65)]">
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                {listModal === 'followers' ? 'Followers' : 'Following'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setListModal(null)}
                                className="rounded-full border border-slate-300/80 bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 transition hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                            >
                                Close
                            </button>
                        </div>

                        <div className="mt-4 max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                            {listEntries.length === 0 ? (
                                <p className="rounded-2xl border border-slate-300/80 bg-slate-100 px-4 py-5 text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                                    No {listModal} yet.
                                </p>
                            ) : (
                                listEntries.map((entry) => {
                                    const isOnline = Boolean(entry?.isOnline || isUserOnline(entry?.userId));
                                    const profileLink = `/profile/${entry.userId}`;

                                    return (
                                        <Link
                                            key={entry.userId}
                                            to={profileLink}
                                            onClick={() => setListModal(null)}
                                            className="flex items-center justify-between rounded-2xl border border-slate-300/80 bg-slate-100 px-3 py-3 transition hover:border-cyan-300/35 hover:bg-cyan-500/10 dark:border-white/10 dark:bg-white/5 dark:hover:border-cyan-300/25"
                                        >
                                            <div className="flex min-w-0 items-center gap-3">
                                                <Avatar
                                                    name={entry.name}
                                                    src={entry.profilePic || entry.imageUrl || ''}
                                                    online={isOnline}
                                                    className="h-11 w-11 shrink-0"
                                                />
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{entry.name}</p>
                                                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">@{entry.username || entry.email}</p>
                                                </div>
                                            </div>

                                            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700 dark:text-cyan-200">
                                                View
                                            </span>
                                        </Link>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </motion.section>
    );
}
