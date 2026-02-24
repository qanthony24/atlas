
import React, { useContext, useEffect, useRef, useState } from 'react';
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

    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onDown = (e: MouseEvent) => {
            if (!menuRef.current) return;
            if (!menuRef.current.contains(e.target as any)) setUserMenuOpen(false);
        };
        window.addEventListener('mousedown', onDown);
        return () => window.removeEventListener('mousedown', onDown);
    }, []);

    const navLinkClasses = "atlas-nav-item";
    const activeNavLinkClasses = "atlas-nav-item--active";

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
                window.alert(txt || `Impersonation failed (${res.status})`);
                return;
            }
            const data = await res.json();
            localStorage.setItem('auth_token', data.token);
            await refreshData();
            // Force route tree to re-evaluate based on new user.role
            window.location.reload();
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
        <div className="hidden md:flex atlas-sidebar">
            <div className="atlas-sidebar-header">
                <img className="atlas-sidebar-logo" src="/assets/atlas-icon.png" alt="Atlas" />
                <div>
                    <div className="atlas-sidebar-brand">Atlas</div>
                    <div className="atlas-sidebar-org">{currentOrg?.name || ''}</div>
                </div>
            </div>

            <div className="atlas-sidebar-section">
                <div className="atlas-sidebar-section-title">Navigation</div>
                <nav className="atlas-nav">
                    <NavLink to="/dashboard" className={({ isActive }) => isActive ? `${navLinkClasses} ${activeNavLinkClasses}` : navLinkClasses}>
                        <HomeIcon className="atlas-nav-icon" />
                        Dashboard
                    </NavLink>

                    {userRole === 'admin' ? (
                        <>
                            <div className="atlas-sidebar-section-title">Campaign Ops</div>
                            <NavLink to="/voters" className={({ isActive }) => isActive ? `${navLinkClasses} ${activeNavLinkClasses}` : navLinkClasses}>
                                <UsersIcon className="atlas-nav-icon" />
                                Voter Universe
                            </NavLink>
                            <NavLink to="/turf" className={({ isActive }) => isActive ? `${navLinkClasses} ${activeNavLinkClasses}` : navLinkClasses}>
                                <MapIcon className="atlas-nav-icon" />
                                Turf Cutter
                            </NavLink>
                            <NavLink to="/assignments" className={({ isActive }) => isActive ? `${navLinkClasses} ${activeNavLinkClasses}` : navLinkClasses}>
                                <ClipboardDocumentListIcon className="atlas-nav-icon" />
                                List Assignments
                            </NavLink>

                            <div className="atlas-sidebar-section-title">Field Management</div>
                            <NavLink to="/canvassers" className={({ isActive }) => isActive ? `${navLinkClasses} ${activeNavLinkClasses}` : navLinkClasses}>
                                <UserGroupIcon className="atlas-nav-icon" />
                                Canvassers
                            </NavLink>
                            <NavLink to="/live" className={({ isActive }) => isActive ? `${navLinkClasses} ${activeNavLinkClasses}` : navLinkClasses}>
                                <MapPinIcon className="atlas-nav-icon" />
                                Live Tracking
                            </NavLink>
                        </>
                    ) : (
                        <>
                            <div className="atlas-sidebar-section-title">My Work</div>
                            <NavLink to="/my-turf" className={({ isActive }) => isActive ? `${navLinkClasses} ${activeNavLinkClasses}` : navLinkClasses}>
                                <MapIcon className="atlas-nav-icon" />
                                My Assigned Turf
                            </NavLink>
                        </>
                    )}
                </nav>
            </div>

            <div className="atlas-sidebar-footer" style={{ position: 'relative' }} ref={menuRef}>
                {userMenuOpen && (
                    <div
                        className="atlas-card"
                        style={{
                            position: 'absolute',
                            bottom: 56,
                            left: 12,
                            right: 12,
                            padding: 10,
                            background: 'rgba(244, 247, 249, 0.96)',
                            zIndex: 20,
                        }}
                    >
                        <div className="atlas-label" style={{ marginBottom: 8 }}>Menu</div>
                        <div style={{ display: 'grid', gap: 8 }}>
                            <button
                                className="atlas-btn atlas-btn-secondary"
                                style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                                onClick={() => { setUserMenuOpen(false); navigate('/settings'); }}
                            >
                                Settings
                            </button>

                            {userRole === 'admin' && (
                                <button
                                    className="atlas-btn atlas-btn-secondary"
                                    style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                                    onClick={() => { setUserMenuOpen(false); navigate('/campaign-setup'); }}
                                >
                                    Campaign Setup
                                </button>
                            )}

                            <div style={{ height: 1, background: 'rgba(209, 217, 224, 0.65)' }} />

                            <button
                                className="atlas-btn atlas-btn-secondary"
                                style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                                onClick={handleLogout}
                            >
                                Log out
                            </button>
                        </div>
                    </div>
                )}

                <div className="atlas-sidebar-user" style={{ cursor: 'pointer' }} onClick={() => setUserMenuOpen(v => !v)}>
                    <UserCircleIcon className="atlas-nav-icon" />
                    <div className="atlas-sidebar-user-meta">
                        <div className="atlas-sidebar-user-name">{currentUser.name}</div>
                        <div className="atlas-sidebar-user-email">{currentUser.email}</div>
                    </div>
                    <div className="atlas-sidebar-logout">
                        <button
                            className="atlas-btn atlas-btn-secondary atlas-btn-secondary--dark"
                            onClick={(e) => { e.stopPropagation(); setUserMenuOpen(false); handleLogout(); }}
                            title="Log out"
                        >
                            Log out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
