
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
import { Table } from '../src/design/components/Table';

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
                    <Button variant={activeTab === 'voters' ? 'primary' : 'secondary'} onClick={() => setActiveTab('voters')}>
                        Voters
                    </Button>
                    <Button variant={activeTab === 'merge' ? 'primary' : 'secondary'} onClick={() => setActiveTab('merge')}>
                        Review Matches
                    </Button>
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
                                <Button variant={voterFilter === 'all' ? 'primary' : 'secondary'} onClick={() => setVoterFilter('all')}>All</Button>
                                <Button variant={voterFilter === 'registered' ? 'primary' : 'secondary'} onClick={() => setVoterFilter('registered')}>Registered</Button>
                                <Button variant={voterFilter === 'leads' ? 'primary' : 'secondary'} onClick={() => setVoterFilter('leads')}>Leads</Button>
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <Table>
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
                                                <span
                                                    className={
                                                        voter.party === 'Democrat'
                                                            ? 'atlas-chip atlas-chip--party-dem'
                                                            : voter.party === 'Republican'
                                                                ? 'atlas-chip atlas-chip--party-rep'
                                                                : 'atlas-chip'
                                                    }
                                                >
                                                    {voter.party || '—'}
                                                </span>
                                            </td>
                                            <td>
                                                <span
                                                    className={
                                                        voter.lastInteractionStatus === 'contacted'
                                                            ? 'atlas-chip atlas-chip--status-contacted'
                                                            : voter.lastInteractionStatus === 'not_home'
                                                                ? 'atlas-chip atlas-chip--status-not-home'
                                                                : voter.lastInteractionStatus === 'refused'
                                                                    ? 'atlas-chip atlas-chip--status-refused'
                                                                    : 'atlas-chip'
                                                    }
                                                >
                                                    {voter.lastInteractionStatus ? voter.lastInteractionStatus.replace('_', ' ') : 'Pending'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    </>
                ) : (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                            <div>
                                <div className="atlas-label">Potential matches</div>
                                <div className="atlas-help" style={{ marginTop: 4 }}>
                                    Review and merge manual leads into imported voters to keep canvassing history clean.
                                </div>
                            </div>
                            <Button variant="secondary" onClick={() => loadMergeAlerts()}>
                                Refresh
                            </Button>
                        </div>

                        {mergeError ? <div className="atlas-error" style={{ marginBottom: 12 }}>{mergeError}</div> : null}

                        {mergeLoading ? (
                            <div className="atlas-help">Loading matches…</div>
                        ) : !mergeAlerts || mergeAlerts.length === 0 ? (
                            <div className="atlas-help">No matches to review right now.</div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <Table>
                                    <thead>
                                        <tr>
                                            <th>Lead (manual)</th>
                                            <th>Imported voter</th>
                                            <th>Reason</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {mergeAlerts.map((a: any) => (
                                            <tr key={a.id}>
                                                <td>
                                                    <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 15 }}>
                                                        {a.lead_first_name} {a.lead_last_name}
                                                    </div>
                                                    <div className="atlas-help atlas-mono" style={{ marginTop: 4 }}>{a.lead_phone || 'No phone'}</div>
                                                    <div className="atlas-help" style={{ marginTop: 2 }}>{a.lead_address}, {a.lead_city} {a.lead_state} {a.lead_zip}</div>
                                                </td>
                                                <td>
                                                    <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 15 }}>
                                                        {a.imported_first_name} {a.imported_last_name}
                                                    </div>
                                                    <div className="atlas-help atlas-mono" style={{ marginTop: 4 }}>Reg #: {a.imported_external_id}</div>
                                                    <div className="atlas-help atlas-mono" style={{ marginTop: 2 }}>{a.imported_phone || 'No phone'}</div>
                                                    <div className="atlas-help" style={{ marginTop: 2 }}>{a.imported_address}, {a.imported_city} {a.imported_state} {a.imported_zip}</div>
                                                </td>
                                                <td className="atlas-help">{a.reason}</td>
                                                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                    <div style={{ display: 'inline-flex', gap: 8 }}>
                                                        <Button
                                                            variant="critical"
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
                                                        >
                                                            Merge
                                                        </Button>
                                                        <Button
                                                            variant="secondary"
                                                            onClick={async () => {
                                                                try {
                                                                    if (typeof (context.client as any).updateMergeAlert !== 'function') return;
                                                                    await (context.client as any).updateMergeAlert(a.id, 'dismissed');
                                                                    await loadMergeAlerts();
                                                                } catch (e: any) {
                                                                    setMergeError(e?.message || 'Dismiss failed');
                                                                }
                                                            }}
                                                        >
                                                            Dismiss
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        )}
                    </div>
                )}
            </Card>
        </div>
    );
};

export default VoterUniverse;
