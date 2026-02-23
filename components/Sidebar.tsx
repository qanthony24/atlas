
import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
    HomeIcon, 
    UsersIcon, 
    MapIcon, 
    ClipboardDocumentListIcon, 
    UserGroupIcon, 
    MapPinIcon,
    UserCircleIcon,
    ShieldCheckIcon,
    IdentificationIcon
} from '@heroicons/react/24/outline';
import { AppContext } from './AppContext';
import { UserRole } from '../types';
import { getApiOrigin } from '../utils/apiOrigin';

const Sidebar: React.FC = () => {
    const context = useContext(AppContext);
    const navigate = useNavigate();
    if (!context || !context.currentUser) return null;
    const { currentUser, client, refreshData, currentOrg } = context;
    const userRole = currentUser.role;

    const internalMode = (import.meta as any).env?.VITE_INTERNAL_MODE === 'true';

    const navLinkClasses = "flex items-center mt-4 py-2 px-6 text-gray-500 hover:bg-gray-700 hover:bg-opacity-25 hover:text-gray-100 rounded-md transition-colors";
    const activeNavLinkClasses = "bg-gray-700 bg-opacity-25 text-gray-100";

    const handleRoleSwitch = async (role: UserRole) => {
        // In Real API mode, role switching isn't supported (by design).
        // For Phase 2 validation when SES is unavailable, allow staff-only switching via internal impersonation.
        if (internalMode) {
            const base = getApiOrigin();
            if (!base) throw new Error('API base URL is not configured. Set VITE_API_BASE_URL.');

            let internalToken = localStorage.getItem('internal_admin_token') || '';
            if (!internalToken) {
                internalToken = window.prompt('Enter INTERNAL_ADMIN_TOKEN (stored locally for this browser):') || '';
                if (internalToken) localStorage.setItem('internal_admin_token', internalToken);
            }
            if (!internalToken) throw new Error('Missing internal admin token');

            const res = await fetch(`${base}/api/v1/internal/auth/impersonate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-internal-token': internalToken,
                },
                body: JSON.stringify({ email: currentUser.email, role }),
            });
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(txt || `Impersonation failed (${res.status})`);
            }
            const data = await res.json();
            localStorage.setItem('auth_token', data.token);
            await refreshData();
            return;
        }

        await client.switchRole(role);
        await refreshData();
    };

    const handleLogout = async () => {
        localStorage.removeItem('auth_token');
        await refreshData();
        navigate('/login');
    };

    return (
        <div className="hidden md:flex flex-col w-64 bg-gray-800">
            <div className="flex items-center justify-center h-16 bg-gray-900 border-b border-gray-700 flex-col">
                <span className="text-white font-bold uppercase text-lg tracking-wider">VoterField</span>
                <span className="text-[10px] text-gray-500">{currentOrg?.name}</span>
            </div>
            
            <div className="px-6 py-4 border-b border-gray-700">
                <div className="flex items-center justify-between text-xs text-gray-400 uppercase font-semibold mb-2">
                    <span>Current Role</span>
                    {userRole === 'admin' ? <ShieldCheckIcon className="h-4 w-4 text-green-500" /> : <IdentificationIcon className="h-4 w-4 text-blue-400" />}
                </div>
                {internalMode || (client as any)?.switchRole ? (
                    <>
                        <div className="flex bg-gray-700 rounded-lg p-1">
                            <button 
                                onClick={() => handleRoleSwitch('admin')}
                                className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-all ${userRole === 'admin' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                            >
                                Admin
                            </button>
                            <button 
                                onClick={() => handleRoleSwitch('canvasser')}
                                className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-all ${userRole === 'canvasser' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                            >
                                Canvasser
                            </button>
                        </div>
                        <p className="mt-2 text-[10px] text-gray-500 italic">
                            {internalMode
                                ? `Internal mode: switch roles for ${currentUser.email}`
                                : (userRole === 'admin' ? 'Viewing as Super Admin' : `Logged in as: ${currentUser.name}`)}
                        </p>
                    </>
                ) : (
                    <p className="mt-1 text-[10px] text-gray-500 italic">
                        Role switching disabled in Real API mode.
                    </p>
                )}
            </div>

            <div className="flex flex-col flex-1 overflow-y-auto">
                <nav className="flex-1 px-2 py-4 bg-gray-800">
                    <NavLink to="/dashboard" className={({ isActive }) => isActive ? `${navLinkClasses} ${activeNavLinkClasses}` : navLinkClasses}>
                        <HomeIcon className="h-6 w-6 mr-3" />
                        Dashboard
                    </NavLink>

                    {userRole === 'admin' ? (
                        <>
                            <div className="mt-6 px-6 text-xs text-gray-500 uppercase font-bold tracking-wider">Campaign Ops</div>
                            <NavLink to="/voters" className={({ isActive }) => isActive ? `${navLinkClasses} ${activeNavLinkClasses}` : navLinkClasses}>
                                <UsersIcon className="h-6 w-6 mr-3" />
                                Voter Universe
                            </NavLink>
                            <NavLink to="/turf" className={({ isActive }) => isActive ? `${navLinkClasses} ${activeNavLinkClasses}` : navLinkClasses}>
                                <MapIcon className="h-6 w-6 mr-3" />
                                Turf Cutter
                            </NavLink>
                            <NavLink to="/assignments" className={({ isActive }) => isActive ? `${navLinkClasses} ${activeNavLinkClasses}` : navLinkClasses}>
                                <ClipboardDocumentListIcon className="h-6 w-6 mr-3" />
                                List Assignments
                            </NavLink>
                            
                            <div className="mt-6 px-6 text-xs text-gray-500 uppercase font-bold tracking-wider">Field Management</div>
                            <NavLink to="/canvassers" className={({ isActive }) => isActive ? `${navLinkClasses} ${activeNavLinkClasses}` : navLinkClasses}>
                                <UserGroupIcon className="h-6 w-6 mr-3" />
                                Canvassers
                            </NavLink>
                            <NavLink to="/live" className={({ isActive }) => isActive ? `${navLinkClasses} ${activeNavLinkClasses}` : navLinkClasses}>
                                <MapPinIcon className="h-6 w-6 mr-3" />
                                Live Tracking
                            </NavLink>
                        </>
                    ) : (
                        <>
                            <div className="mt-6 px-6 text-xs text-gray-500 uppercase font-bold tracking-wider">My Work</div>
                            <NavLink to="/my-turf" className={({ isActive }) => isActive ? `${navLinkClasses} ${activeNavLinkClasses}` : navLinkClasses}>
                                <MapIcon className="h-6 w-6 mr-3" />
                                My Assigned Turf
                            </NavLink>
                        </>
                    )}
                </nav>
            </div>
            
            <div className="p-4 border-t border-gray-700 bg-gray-900 bg-opacity-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0">
                        <UserCircleIcon className="h-8 w-8 text-gray-400 mr-3" />
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-white truncate">{currentUser.name}</p>
                            <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="ml-3 text-xs text-gray-300 hover:text-white border border-gray-600 hover:border-gray-400 rounded px-2 py-1"
                        title="Log out"
                    >
                        Log out
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
