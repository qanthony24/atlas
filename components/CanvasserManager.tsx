
import React, { useState, useContext } from 'react';
import { AppContext } from './AppContext';
import { User } from '../types';
import { PageHeader } from '../src/design/components/PageHeader';
import { Button } from '../src/design/components/Button';
import { Card } from '../src/design/components/Card';

const CanvasserManager: React.FC = () => {
    const context = useContext(AppContext);
    const [showModal, setShowModal] = useState(false);
    const [newCanvasser, setNewCanvasser] = useState({ name: '', email: '', phone: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!context) return null;
    const { canvassers, client, refreshData } = context;

    const handleAddCanvasser = async () => {
        setError(null);
        if (!newCanvasser.name || !newCanvasser.email) {
            setError('Name and email are required.');
            return;
        }
        setSaving(true);
        try {
            await client.addCanvasser(newCanvasser);
            await refreshData();
            setShowModal(false);
            setNewCanvasser({ name: '', email: '', phone: '' });
        } catch (e: any) {
            setError(e?.message || 'Failed to add user');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <PageHeader
                title="Canvasser Management"
                right={
                    <Button variant="primary" onClick={() => setShowModal(true)}>
                        Add Canvasser
                    </Button>
                }
            />

            <Card style={{ padding: 16 }}>
                <div style={{ overflowX: 'auto' }}>
                    <div className="atlas-card" style={{ overflow: 'hidden' }}>
                        <table className="atlas-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {canvassers.map(canvasser => (
                                    <tr key={canvasser.id}>
                                        <td style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 15 }}>{canvasser.name}</td>
                                        <td className="atlas-mono" style={{ opacity: 0.85 }}>{canvasser.email}</td>
                                        <td className="atlas-mono" style={{ opacity: 0.85 }}>{canvasser.phone || '—'}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <Button variant="secondary" disabled>
                                                Edit
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Card>

            {showModal && (
                <div className="fixed inset-0" style={{ background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
                    <div className="atlas-card atlas-auth-card--blueprint" style={{ width: '100%', maxWidth: 520, padding: 16 }}>
                        <div className="atlas-h1" style={{ fontSize: 22, marginBottom: 12, color: 'rgba(255,255,255,0.92)' }}>Add New Canvasser</div>

                        {error ? <div className="atlas-error" style={{ marginBottom: 12 }}>{error}</div> : null}

                        <div style={{ display: 'grid', gap: 12 }}>
                            <input type="text" placeholder="Name" value={newCanvasser.name} onChange={e => setNewCanvasser({ ...newCanvasser, name: e.target.value })} className="atlas-input atlas-input--dark" />
                            <input type="email" placeholder="Email" value={newCanvasser.email} onChange={e => setNewCanvasser({ ...newCanvasser, email: e.target.value })} className="atlas-input atlas-input--dark" />
                            <input type="tel" placeholder="Phone" value={newCanvasser.phone} onChange={e => setNewCanvasser({ ...newCanvasser, phone: e.target.value })} className="atlas-input atlas-input--dark" />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                            <Button variant="secondary" className="atlas-btn-secondary--dark" onClick={() => { setError(null); setShowModal(false); }}>
                                Cancel
                            </Button>
                            <Button variant="primary" disabled={saving} onClick={handleAddCanvasser}>
                                {saving ? 'Saving…' : 'Save'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CanvasserManager;
