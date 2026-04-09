import { Home, Compass, Bell, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
    { to: '/', label: 'Feed', icon: Home, color: '#e63946' },
    { to: '/explore', label: 'Explore', icon: Compass, color: '#5c6bc0' },
    { to: '/notifications', label: 'Following', icon: Bell, color: '#00897b' },
    { to: '/profile', label: 'Saved', icon: User, color: '#ef6c00' }
];

export default function LeftSidebar({ onOpenNotifications, mobileOpen = false, onClose, theme = 'dark' }) {
    const { user } = useAuth();

    return (
        <aside className="sticky top-[72px] hidden h-[calc(100vh-72px)] w-[250px] self-start overflow-y-auto pr-2 lg:block">
            {/* Profile Card */}
            <div className="bg-white rounded-lg border-[0.5px] border-[#e8e8e8] overflow-hidden mb-4">
                {/* Banner */}
                <div className="h-[50px] bg-gradient-to-r from-[#5c6bc0] to-[#7986cb]" />
                
                {/* Profile Body */}
                <div className="p-3 pt-0">
                    {/* Avatar */}
                    <div
                        className="h-12 w-12 rounded-full border-4 border-white flex items-center justify-center text-white font-semibold text-lg mt-[-24px] mb-2"
                        style={{ backgroundColor: '#ef6c00' }}
                    >
                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    
                    {/* Name & Title */}
                    <p className="text-[13px] font-semibold text-[#111] mb-0.5">{user?.name || user?.username || 'Your Name'}</p>
                    <p className="text-[11px] text-[#777]">Full Stack Developer</p>
                    
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-1 mt-3 pt-3 border-t border-[#f5f5f5]">
                        <div className="text-center">
                            <p className="text-[15px] font-semibold text-[#111]">142</p>
                            <p className="text-[10px] text-[#999]">Posts</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[15px] font-semibold text-[#111]">2.4k</p>
                            <p className="text-[10px] text-[#999]">Followers</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation List */}
            <div className="bg-white rounded-lg border-[0.5px] border-[#e8e8e8] overflow-hidden">
                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                        <NavLink
                            key={item.label}
                            to={item.to}
                            onClick={() => onOpenNotifications && item.label === 'Following' ? onOpenNotifications() : null}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 border-b-[0.5px] border-[#f5f5f5] last:border-b-0 text-[12px] font-semibold cursor-pointer transition ${
                                    isActive
                                        ? 'text-[#e63946]'
                                        : 'text-[#444] hover:text-[#111]'
                                }`
                            }
                        >
                            <div
                                className="h-2 w-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: item.color }}
                            />
                            {item.label}
                        </NavLink>
                    );
                })}
            </div>
        </aside>
    );
}