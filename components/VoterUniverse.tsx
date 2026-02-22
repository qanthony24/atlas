
import React, { useEffect, useMemo, useState, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { AppContext } from './AppContext';
import { Voter } from '../types';
import FileUpload from './FileUpload';
import VoterDetailModal from './VoterDetailModal';
import AddVoterModal from './AddVoterModal';
import { PlusIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';

const VoterUniverse: React.FC = () => {
    const context = useContext(AppContext);
    const location = useLocation();

    const [showImporter, setShowImporter] = useState(false);
    const [showAddVoter, setShowAddVoter] = useState(false);
    const [selectedVoter, setSelectedVoter] = useState<Voter | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [activeTab, setActiveTab] = useState<'voters' | 'merge'>('voters');
    const [voterFilter, setVoterFilter] = useState<'all' | 'registered' | 'leads'>('all');

    const [mergeAlerts, setMergeAlerts] = useState<any[] | null>(null);
    const [mergeLoading, setMergeLoading] = useState(false);
    const [mergeError, setMergeError] = useState<string | null>(null);
    
    if (!context) return null;
    const { voters, refreshData, currentUser } = context;

    const filteredVoters = voters.filter(voter => {
        // Hide merged-away leads from the main list to reduce confusion.
        if (voter.mergedIntoVoterId) return false;

        // Filter by provenance
        if (voterFilter === 'registered' && voter.source === 'manual') return false;
        if (voterFilter === 'leads' && voter.source !== 'manual') return false;

        const name = `${voter.firstName} ${voter.lastName}`.toLowerCase();
        const addr = String(voter.address || '').toLowerCase();
        return name.includes(searchTerm.toLowerCase()) || addr.includes(searchTerm.toLowerCase());
    });

    const loadMergeAlerts = async () => {
        if (currentUser?.role !== 'admin') return;
        if (typeof (context.client as any).getMergeAlerts !== 'function') return;

        setMergeLoading(true);
        setMergeError(null);
        try {
            const res = await (context.client as any).getMergeAlerts('open');
            setMergeAlerts(res?.alerts || []);
        } catch (e: any) {
            setMergeError(e?.message || 'Failed to load merge alerts');
            setMergeAlerts(null);
        } finally {
            setMergeLoading(false);
        }
    };

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab');
        if (tab === 'merge') setActiveTab('merge');
    }, [location.search]);

    useEffect(() => {
        if (activeTab === 'merge') {
            void loadMergeAlerts();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const handleImportComplete = async () => {
        await refreshData();
        setShowImporter(false);
    };

    const handleAddComplete = async () => {
        await refreshData();
        setShowAddVoter(false);
    };

    return (
        <div>
            <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
                <div>
                    <h1 className="text-3xl font-semibold text-gray-800">Voter Universe</h1>
                    {currentUser?.role === 'admin' && (
                        <div className="mt-3 inline-flex rounded-md border border-gray-200 bg-white shadow-sm overflow-hidden">
                            <button
                                onClick={() => setActiveTab('voters')}
                                className={`px-3 py-1.5 text-sm font-semibold ${activeTab === 'voters' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                            >
                                Voters
                            </button>
                            <button
                                onClick={() => setActiveTab('merge')}
                                className={`px-3 py-1.5 text-sm font-semibold ${activeTab === 'merge' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                            >
                                Review Matches
                            </button>
                        </div>
                    )}
                </div>
                <div className="flex space-x-3">
                    <button 
                        onClick={() => setShowAddVoter(true)}
                        className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 font-medium"
                    >
                        <PlusIcon className="h-5 w-5 mr-2 text-gray-500" />
                        Add Lead
                    </button>
                    <button 
                        onClick={() => setShowImporter(true)}
                        className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 font-medium shadow-sm"
                    >
                        <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
                        Import CSV
                    </button>
                </div>
            </div>

            {showImporter && <FileUpload onClose={() => setShowImporter(false)} onComplete={handleImportComplete} />}
            {showAddVoter && <AddVoterModal onClose={() => setShowAddVoter(false)} onSuccess={handleAddComplete} />}
            {selectedVoter && <VoterDetailModal voter={selectedVoter} onClose={() => setSelectedVoter(null)} />}
            
            <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
                {activeTab === 'voters' ? (
                    <>
                        <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <input 
                                type="text"
                                placeholder="Search by name or address..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full md:max-w-md p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                            />

                            <div className="inline-flex rounded-md border border-gray-200 bg-white shadow-sm overflow-hidden">
                                <button
                                    onClick={() => setVoterFilter('all')}
                                    className={`px-3 py-1.5 text-sm font-semibold ${voterFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setVoterFilter('registered')}
                                    className={`px-3 py-1.5 text-sm font-semibold ${voterFilter === 'registered' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                                >
                                    Registered
                                </button>
                                <button
                                    onClick={() => setVoterFilter('leads')}
                                    className={`px-3 py-1.5 text-sm font-semibold ${voterFilter === 'leads' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                                >
                                    Leads
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Demographics</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Party</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredVoters.map((voter) => (
                          <tr 
                            key={voter.id} 
                            onClick={() => setSelectedVoter(voter)}
                            className="hover:bg-indigo-50 cursor-pointer transition-colors"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{voter.firstName} {voter.middleName} {voter.lastName} {voter.suffix}</div>
                                <div className="text-xs text-gray-400 flex items-center gap-2">
                                    {voter.source === 'manual' ? (
                                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">Lead</span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase">Registered</span>
                                    )}
                                    <span>{voter.externalId ? `Reg #: ${voter.externalId}` : 'No registration # yet'}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {voter.age && <span className="mr-2">{voter.age}yo</span>}
                                {voter.gender && <span className="mr-2">{voter.gender}</span>}
                                {voter.race && <span className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">{voter.race}</span>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div>{voter.address} {voter.unit}</div>
                                <div className="text-xs text-gray-400">{voter.city}, {voter.state} {voter.zip}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    voter.party === 'Democrat' ? 'bg-blue-100 text-blue-800' :
                                    voter.party === 'Republican' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                    {voter.party}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    voter.lastInteractionStatus === 'contacted' ? 'bg-green-100 text-green-800' :
                                    voter.lastInteractionStatus === 'not_home' ? 'bg-yellow-100 text-yellow-800' :
                                    voter.lastInteractionStatus === 'refused' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                    {voter.lastInteractionStatus ? voter.lastInteractionStatus.replace('_', ' ') : 'Pending'}
                                </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                        </div>
                    </>
                ) : (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Potential matches</h2>
                                <p className="text-sm text-gray-600">Review and merge manual leads into imported voters to keep canvassing history clean.</p>
                            </div>
                            <button
                                onClick={() => loadMergeAlerts()}
                                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium shadow-sm"
                            >
                                Refresh
                            </button>
                        </div>

                        {mergeError && (
                            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                                {mergeError}
                            </div>
                        )}

                        {mergeLoading ? (
                            <div className="text-gray-600">Loading matches…</div>
                        ) : !mergeAlerts || mergeAlerts.length === 0 ? (
                            <div className="text-gray-600">No matches to review right now.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Lead (manual)</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Imported voter</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Reason</th>
                                            <th className="px-4 py-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {mergeAlerts.map((a: any) => (
                                            <tr key={a.id}>
                                                <td className="px-4 py-3 text-sm">
                                                    <div className="font-semibold text-gray-900">{a.lead_first_name} {a.lead_last_name}</div>
                                                    <div className="text-xs text-gray-500">{a.lead_phone || 'No phone'}</div>
                                                    <div className="text-xs text-gray-500">{a.lead_address}, {a.lead_city} {a.lead_state} {a.lead_zip}</div>
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <div className="font-semibold text-gray-900">{a.imported_first_name} {a.imported_last_name}</div>
                                                    <div className="text-xs text-gray-500">Reg #: {a.imported_external_id}</div>
                                                    <div className="text-xs text-gray-500">{a.imported_phone || 'No phone'}</div>
                                                    <div className="text-xs text-gray-500">{a.imported_address}, {a.imported_city} {a.imported_state} {a.imported_zip}</div>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-gray-600">{a.reason}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    if (typeof (context.client as any).mergeLeadIntoVoter !== 'function') return;
                                                                    await (context.client as any).mergeLeadIntoVoter(a.lead_voter_id, a.imported_voter_id);
                                                                    if (typeof (context.client as any).updateMergeAlert === 'function') {
                                                                        await (context.client as any).updateMergeAlert(a.id, 'resolved');
                                                                    }
                                                                    await refreshData();
                                                                    await loadMergeAlerts();
                                                                } catch (e: any) {
                                                                    setMergeError(e?.message || 'Merge failed');
                                                                }
                                                            }}
                                                            className="px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-semibold"
                                                        >
                                                            Merge
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    if (typeof (context.client as any).updateMergeAlert !== 'function') return;
                                                                    await (context.client as any).updateMergeAlert(a.id, 'dismissed');
                                                                    await loadMergeAlerts();
                                                                } catch (e: any) {
                                                                    setMergeError(e?.message || 'Dismiss failed');
                                                                }
                                                            }}
                                                            className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-semibold"
                                                        >
                                                            Dismiss
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default VoterUniverse;
