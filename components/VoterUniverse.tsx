
import React, { useEffect, useMemo, useState, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { AppContext } from './AppContext';
import { Voter } from '../types';
import FileUpload from './FileUpload';
import VoterDetailModal from './VoterDetailModal';
import AddVoterModal from './AddVoterModal';
import { PlusIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '../src/design/components/PageHeader';
import { Button } from '../src/design/components/Button';
import { Card } from '../src/design/components/Card';

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

    const actions = (
        <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" onClick={() => setShowAddVoter(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <PlusIcon style={{ width: 22, height: 22 }} />
                Add Lead
            </Button>
            <Button variant="primary" onClick={() => setShowImporter(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <ArrowUpTrayIcon style={{ width: 22, height: 22 }} />
                Import CSV
            </Button>
        </div>
    );

    return (
        <div>
            <PageHeader title="Voter Universe" right={actions} />

            {currentUser?.role === 'admin' && (
                <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setActiveTab('voters')}
                        className={['atlas-btn', activeTab === 'voters' ? 'atlas-btn-primary' : 'atlas-btn-secondary'].join(' ')}
                    >
                        Voters
                    </button>
                    <button
                        onClick={() => setActiveTab('merge')}
                        className={['atlas-btn', activeTab === 'merge' ? 'atlas-btn-primary' : 'atlas-btn-secondary'].join(' ')}
                    >
                        Review Matches
                    </button>
                </div>
            )}

            {showImporter && <FileUpload onClose={() => setShowImporter(false)} onComplete={handleImportComplete} />}
            {showAddVoter && <AddVoterModal onClose={() => setShowAddVoter(false)} onSuccess={handleAddComplete} />}
            {selectedVoter && <VoterDetailModal voter={selectedVoter} onClose={() => setSelectedVoter(null)} />}
            
            <Card style={{ padding: 16 }}>
                {activeTab === 'voters' ? (
                    <>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <input
                                type="text"
                                placeholder="Search by name or address..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="atlas-input"
                                style={{ maxWidth: 520 }}
                            />

                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => setVoterFilter('all')}
                                    className={['atlas-btn', voterFilter === 'all' ? 'atlas-btn-primary' : 'atlas-btn-secondary'].join(' ')}
                                >All</button>
                                <button
                                    onClick={() => setVoterFilter('registered')}
                                    className={['atlas-btn', voterFilter === 'registered' ? 'atlas-btn-primary' : 'atlas-btn-secondary'].join(' ')}
                                >Registered</button>
                                <button
                                    onClick={() => setVoterFilter('leads')}
                                    className={['atlas-btn', voterFilter === 'leads' ? 'atlas-btn-primary' : 'atlas-btn-secondary'].join(' ')}
                                >Leads</button>
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <div className="atlas-card" style={{ overflow: 'hidden' }}>
                                <table className="atlas-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Demographics</th>
                                            <th>Address</th>
                                            <th>Party</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredVoters.map((voter) => (
                                            <tr
                                                key={voter.id}
                                                onClick={() => setSelectedVoter(voter)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <td>
                                                    <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 15 }}>
                                                        {voter.firstName} {voter.middleName} {voter.lastName} {voter.suffix}
                                                    </div>
                                                    <div className="atlas-help" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                                                        {voter.source === 'manual' ? (
                                                            <span className="atlas-chip atlas-chip--lead">Lead</span>
                                                        ) : (
                                                            <span className="atlas-chip atlas-chip--registered">Registered</span>
                                                        )}
                                                        <span className="atlas-mono">{voter.externalId ? `Reg #: ${voter.externalId}` : 'No registration # yet'}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="atlas-help" style={{ fontSize: 13 }}>
                                                        {voter.age ? <span style={{ marginRight: 8 }}>{voter.age}yo</span> : null}
                                                        {voter.gender ? <span style={{ marginRight: 8 }}>{voter.gender}</span> : null}
                                                        {voter.race ? <span className="atlas-chip">{voter.race}</span> : null}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ fontSize: 14 }}>{voter.address} {voter.unit}</div>
                                                    <div className="atlas-help">{voter.city}, {voter.state} {voter.zip}</div>
                                                </td>
                                                <td>
                                                    <span className="atlas-chip">{voter.party || '—'}</span>
                                                </td>
                                                <td>
                                                    <span className="atlas-chip">{voter.lastInteractionStatus ? voter.lastInteractionStatus.replace('_', ' ') : 'Pending'}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
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
            </Card>
        </div>
    );
};

export default VoterUniverse;
