
import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from './AppContext';
import { ChartBarIcon, DocumentTextIcon, UserGroupIcon, CheckCircleIcon, RocketLaunchIcon } from '@heroicons/react/24/solid';
import { Link } from 'react-router-dom';
import { PageHeader } from '../src/design/components/PageHeader';
import { Button } from '../src/design/components/Button';
import { Card } from '../src/design/components/Card';
import { StatBlock } from '../src/design/components/StatBlock';
import { Table } from '../src/design/components/Table';

const TableShell = ({ children }: { children: React.ReactNode }) => (
    <div className="atlas-card" style={{ overflow: 'hidden' }}>
        <table className="atlas-table">{children}</table>
    </div>
);

const BigIcon = (IconCmp: any) => <IconCmp style={{ width: 28, height: 28 }} />;


const Dashboard: React.FC = () => {
    const context = useContext(AppContext);
    if (!context || !context.currentUser) return null;

    const { voters, walkLists, canvassers, interactions, assignments, currentUser } = context;

    const [mergeAlertCount, setMergeAlertCount] = useState<number | null>(null);

    useEffect(() => {
        // Admin-only: show a notice when manual leads likely match imported voters.
        if (currentUser.role !== 'admin') return;
        let cancelled = false;

        (async () => {
            try {
                if (typeof (context.client as any).getMergeAlertCount !== 'function') return;
                const res = await (context.client as any).getMergeAlertCount();
                if (!cancelled) setMergeAlertCount(Number(res?.open_count ?? 0));
            } catch {
                if (!cancelled) setMergeAlertCount(null);
            }
        })();

        return () => { cancelled = true; };
    }, [context.client, currentUser.role]);
    
    // Logic for Admin
    const globalCanvassedCount = interactions.filter(i => i.result_code === 'contacted').length;
    const globalCompletionPercentage = voters.length > 0 ? ((globalCanvassedCount / voters.length) * 100).toFixed(1) : 0;

    // Logic for Canvasser
    const myAssignmentIds = assignments.filter(a => a.canvasserId === currentUser.id).map(a => a.listId);
    const myAssignedLists = walkLists.filter(list => myAssignmentIds.includes(list.id));
    const myInteractions = interactions.filter(i => i.user_id === currentUser.id);
    const myCanvassedCount = myInteractions.filter(i => i.result_code === 'contacted').length;
    
    const totalVotersInMyLists = voters.filter(v => 
        myAssignedLists.some(list => list.voterIds.includes(v.id))
    ).length;
    const myCompletionPercentage = totalVotersInMyLists > 0 ? ((myCanvassedCount / totalVotersInMyLists) * 100).toFixed(1) : 0;

    if (currentUser.role === 'canvasser') {
        return (
            <div>
                <PageHeader
                    title="My Performance"
                    right={
                        <Link to="/my-turf">
                            <Button variant="primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                <RocketLaunchIcon className="atlas-nav-icon" />
                                Start Canvassing
                            </Button>
                        </Link>
                    }
                />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                    <StatBlock label="Assigned Lists" value={myAssignedLists.length} icon={BigIcon(DocumentTextIcon)} />
                    <StatBlock label="Doors Knocked" value={myInteractions.length} icon={BigIcon(ChartBarIcon)} />
                    <StatBlock label="Successful IDs" value={myCanvassedCount} icon={BigIcon(CheckCircleIcon)} />
                    <StatBlock label="Progress" value={`${myCompletionPercentage}%`} icon={BigIcon(CheckCircleIcon)} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16, marginTop: 16 }}>
                    <Card style={{ padding: 16 }}>
                        <div className="atlas-label" style={{ marginBottom: 12 }}>My Active Walk Lists</div>
                        <div style={{ display: 'grid', gap: 14 }}>
                            {myAssignedLists.length > 0 ? myAssignedLists.map(list => {
                                const assignment = assignments.find(a => a.listId === list.id);
                                const listVoterIds = list.voterIds;
                                const interactionsInList = myInteractions.filter(i => assignment && i.assignment_id === assignment.id).length;
                                const progress = listVoterIds.length > 0 ? Math.round((interactionsInList / listVoterIds.length) * 100) : 0;

                                return (
                                    <div key={list.id}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>{list.name}</div>
                                            <div className="atlas-mono">{progress}%</div>
                                        </div>
                                        <div style={{ height: 10, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-drafting)', overflow: 'hidden', background: 'rgba(244,247,249,0.92)' }}>
                                            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--color-action)' }} />
                                        </div>
                                        <div className="atlas-help" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                                            <span>{interactionsInList} of {list.voterIds.length} contacted</span>
                                            <Link to="/my-turf" style={{ color: 'var(--color-action)', textDecoration: 'none' }}>Open Map →</Link>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="atlas-help" style={{ padding: 16, textAlign: 'center' }}>No walk lists currently assigned.</div>
                            )}
                        </div>
                    </Card>

                    <Card style={{ padding: 16 }}>
                        <div className="atlas-label" style={{ marginBottom: 12 }}>Recent Activity</div>
                        <div style={{ display: 'grid', gap: 10, maxHeight: 420, overflow: 'auto' }}>
                            {myInteractions.length > 0 ? myInteractions.slice().reverse().map(interaction => {
                                const voter = voters.find(v => v.id === interaction.voter_id);
                                return (
                                    <div key={interaction.id} className="atlas-card" style={{ padding: 12, background: 'rgba(244,247,249,0.65)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
                                            <div>
                                                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>{voter ? `${voter.firstName} ${voter.lastName}` : 'Unknown Voter'}</div>
                                                <div className="atlas-help">{voter?.address}</div>
                                            </div>
                                            <div className="atlas-chip">{interaction.result_code.replace('_', ' ')}</div>
                                        </div>
                                        {interaction.notes ? <div className="atlas-help" style={{ marginTop: 6, fontStyle: 'italic' }}>“{interaction.notes}”</div> : null}
                                    </div>
                                );
                            }) : (
                                <div className="atlas-help" style={{ padding: 16, textAlign: 'center' }}>No interactions recorded yet.</div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div>
            <PageHeader title="Campaign Overview" />

            {mergeAlertCount !== null && mergeAlertCount > 0 && (
                <Card style={{ padding: 12, marginBottom: 16, borderColor: 'rgba(255, 130, 0, 0.45)' }}>
                    <div className="atlas-help">
                        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>Data to review:</span> {mergeAlertCount} potential lead matches found.{' '}
                        <Link to="/voters?tab=merge" style={{ color: 'var(--color-action)', textDecoration: 'none' }}>Review →</Link>
                    </div>
                </Card>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                <StatBlock label="Total Voters" value={voters.length} icon={BigIcon(UserGroupIcon)} />
                <StatBlock label="Active Walk Lists" value={walkLists.length} icon={BigIcon(DocumentTextIcon)} />
                <StatBlock label="Doors Knocked" value={interactions.length} icon={BigIcon(ChartBarIcon)} />
                <StatBlock label="Total Progress" value={`${globalCompletionPercentage}%`} icon={BigIcon(CheckCircleIcon)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 16, marginTop: 16 }}>
                <Card style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: 12, borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="atlas-label">Live Interaction Stream</div>
                        <div className="atlas-mono" style={{ fontSize: 11, opacity: 0.7 }}>live</div>
                    </div>
                    <TableShell>
                        <thead>
                            <tr>
                                <th>Voter</th>
                                <th>Outcome</th>
                                <th>Field Rep</th>
                            </tr>
                        </thead>
                        <tbody>
                            {interactions.slice(-6).reverse().map(interaction => {
                                const voter = voters.find(v => v.id === interaction.voter_id);
                                const canvasser = canvassers.find(c => c.id === interaction.user_id);
                                return (
                                    <tr key={interaction.id}>
                                        <td>{voter ? `${voter.firstName} ${voter.lastName}` : 'N/A'}</td>
                                        <td><span className="atlas-chip">{interaction.result_code.replace('_', ' ')}</span></td>
                                        <td className="atlas-mono" style={{ opacity: 0.8 }}>{canvasser ? canvasser.name : 'N/A'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </TableShell>
                    <div style={{ padding: 12, borderTop: '1px solid var(--color-border)' }}>
                        <Link to="/live" style={{ color: 'var(--color-action)', textDecoration: 'none', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 12 }}>View Live Map →</Link>
                    </div>
                </Card>

                <Card style={{ padding: 16 }}>
                    <div className="atlas-label" style={{ marginBottom: 12 }}>Regional Turf Progress</div>
                    <div style={{ display: 'grid', gap: 14 }}>
                        {walkLists.map(list => {
                            const assignment = assignments.find(a => a.listId === list.id);
                            const listInteractions = interactions.filter(i => assignment && i.assignment_id === assignment.id).length;
                            const progress = list.voterIds.length > 0 ? Math.round((listInteractions / list.voterIds.length) * 100) : 0;

                            return (
                                <div key={list.id}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <div>
                                            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>{list.name}</div>
                                            <div className="atlas-help">{list.voterIds.length} targeted voters</div>
                                        </div>
                                        <div className="atlas-chip">{progress}%</div>
                                    </div>
                                    <div style={{ height: 10, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-drafting)', overflow: 'hidden', background: 'rgba(244,247,249,0.92)' }}>
                                        <div style={{ height: '100%', width: `${progress}%`, background: 'var(--color-action)' }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Dashboard;
