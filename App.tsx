
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import VoterUniverse from './components/VoterUniverse';
import TurfCutter from './components/TurfCutter';
import CanvasserManager from './components/CanvasserManager';
import ListAssignments from './components/ListAssignments';
import LiveTracking from './components/LiveTracking';
import CanvasserPortal from './components/CanvasserPortal';
import { AppContext } from './components/AppContext';
import { client } from './data/client';
import { User, Voter, WalkList, Assignment, Interaction, Organization } from './types';

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
    const [voters, setVoters] = useState<Voter[]>([]);
    const [canvassers, setCanvassers] = useState<User[]>([]);
    const [walkLists, setWalkLists] = useState<WalkList[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [interactions, setInteractions] = useState<Interaction[]>([]);
    const [loading, setLoading] = useState(true);

    const refreshData = useCallback(async () => {
        try {
            const [u, o, v, c, w, a, i] = await Promise.all([
                client.getCurrentUser(),
                client.getCurrentOrg(),
                client.getVoters(),
                client.getCanvassers(),
                client.getWalkLists(),
                client.getAssignments(),
                client.getInteractions()
            ]);
            
            setCurrentUser(u);
            setCurrentOrg(o);
            setVoters(v);
            setCanvassers(c);
            setWalkLists(w);
            setAssignments(a);
            setInteractions(i);
        } catch (error: any) {
            console.error("Failed to fetch data", error);

            // If token expired / missing, drop to login screen.
            const msg = String(error?.message || '');
            if (msg.toLowerCase().includes('unauthorized')) {
                localStorage.removeItem('auth_token');
                setCurrentUser(null);
                setCurrentOrg(null);
                setVoters([]);
                setCanvassers([]);
                setWalkLists([]);
                setAssignments([]);
                setInteractions([]);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    if (loading) {
        return (
            <div className="atlas-center">
                <div className="atlas-help">Loading Campaign Core…</div>
            </div>
        );
    }

    // If we have no authenticated user, show login instead of rendering a blank app.
    if (!currentUser) {
        return (
            <AppContext.Provider value={{ 
                client, 
                currentUser, 
                currentOrg, 
                voters, 
                canvassers, 
                walkLists, 
                assignments, 
                interactions,
                refreshData
            }}>
                <Login />
            </AppContext.Provider>
        );
    }

    return (
        <AppContext.Provider value={{ 
            client, 
            currentUser, 
            currentOrg, 
            voters, 
            canvassers, 
            walkLists, 
            assignments, 
            interactions,
            refreshData
        }}>
            <HashRouter>
                <div className="atlas-app">
                    <Sidebar />
                    <main className="atlas-main">
                        <div className="atlas-content">
                            <Routes>
                                    <Route path="/" element={<Navigate to="/dashboard" />} />
                                    <Route path="/dashboard" element={<Dashboard />} />
                                    
                                    {/* Admin Only Routes */}
                                    {currentUser?.role === 'admin' ? (
                                        <>
                                            <Route path="/voters" element={<VoterUniverse />} />
                                            <Route path="/turf" element={<TurfCutter />} />
                                            <Route path="/canvassers" element={<CanvasserManager />} />
                                            <Route path="/assignments" element={<ListAssignments />} />
                                            <Route path="/live" element={<LiveTracking />} />
                                        </>
                                    ) : (
                                        <>
                                            <Route path="/my-turf" element={<CanvasserPortal />} />
                                            {/* Redirect non-admin to their portal if they try to access admin pages */}
                                            <Route path="*" element={<Navigate to="/my-turf" />} />
                                        </>
                                    )}
                                    {/* Fallback for admin trying to view canvasser portal or generic */}
                                    <Route path="/my-turf" element={<CanvasserPortal />} />
                            </Routes>
                        </div>
                    </main>
                </div>
                <Analytics />
            </HashRouter>
        </AppContext.Provider>
    );
};

export default App;
