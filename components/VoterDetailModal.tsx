import React, { useState, useContext, useMemo } from 'react';
import { Voter } from '../types';
import { AppContext } from './AppContext';
import { XMarkIcon, PencilSquareIcon, CheckIcon, UserIcon, ClockIcon } from '@heroicons/react/24/outline';
import { Card } from '../src/design/components/Card';
import { Button } from '../src/design/components/Button';

interface VoterDetailModalProps {
  voter: Voter;
  onClose: () => void;
}

const VoterDetailModal: React.FC<VoterDetailModalProps> = ({ voter, onClose }) => {
  const context = useContext(AppContext);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Voter>>({ ...voter });
  const [saving, setSaving] = useState(false);

  if (!context) return null;
  const { client, interactions, refreshData, canvassers } = context;

  // Get interactions specific to this voter for the history timeline
  const history = useMemo(() => {
    return interactions
      .filter((i) => i.voter_id === voter.id)
      .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
  }, [interactions, voter.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await client.updateVoter(voter.id, formData);
      await refreshData();
      setIsEditing(false);
    } catch (e) {
      console.error('Failed to update voter', e);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof Voter, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const partyChip =
    voter.party === 'Democrat'
      ? 'atlas-chip atlas-chip--party-dem'
      : voter.party === 'Republican'
        ? 'atlas-chip atlas-chip--party-rep'
        : 'atlas-chip';

  return (
    <div className="atlas-modal-overlay" role="dialog" aria-modal="true">
      <Card className="atlas-modal" style={{ padding: 0, maxWidth: 1040 }}>
        {/* Header */}
        <div className="atlas-modal-header">
          <div style={{ minWidth: 0 }}>
            <div className="atlas-label">Voter</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 18, marginTop: 4 }}>
              {isEditing ? 'Edit Voter Profile' : `${voter.firstName} ${voter.lastName}`}
            </div>
            <div className="atlas-help atlas-mono" style={{ marginTop: 4, opacity: 0.7 }}>
              {voter.externalId ? `Reg #: ${voter.externalId}` : 'No registration #'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {!isEditing ? (
              <Button variant="secondary" onClick={() => setIsEditing(true)}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <PencilSquareIcon style={{ width: 16, height: 16 }} /> Edit
                </span>
              </Button>
            ) : (
              <Button variant="primary" onClick={handleSave} disabled={saving}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <CheckIcon style={{ width: 16, height: 16 }} /> {saving ? 'Saving…' : 'Save'}
                </span>
              </Button>
            )}

            <Button variant="secondary" onClick={onClose} aria-label="Close">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <XMarkIcon style={{ width: 18, height: 18 }} /> Close
              </span>
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="atlas-modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            {/* Left Column: Demographics & Info */}
            <div style={{ display: 'grid', gap: 16 }}>
              <Card style={{ padding: 14 }}>
                <div className="atlas-label">Basic information</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                  {isEditing ? (
                    <>
                      <div>
                        <div className="atlas-label" style={{ marginBottom: 6 }}>
                          First name
                        </div>
                        <input
                          className="atlas-input"
                          value={formData.firstName || ''}
                          onChange={(e) => handleChange('firstName', e.target.value)}
                        />
                      </div>
                      <div>
                        <div className="atlas-label" style={{ marginBottom: 6 }}>
                          Last name
                        </div>
                        <input
                          className="atlas-input"
                          value={formData.lastName || ''}
                          onChange={(e) => handleChange('lastName', e.target.value)}
                        />
                      </div>
                      <div>
                        <div className="atlas-label" style={{ marginBottom: 6 }}>
                          Age
                        </div>
                        <input
                          className="atlas-input"
                          type="number"
                          value={formData.age || ''}
                          onChange={(e) => handleChange('age', parseInt(e.target.value))}
                        />
                      </div>
                      <div>
                        <div className="atlas-label" style={{ marginBottom: 6 }}>
                          Gender
                        </div>
                        <select
                          className="atlas-input"
                          value={formData.gender || ''}
                          onChange={(e) => handleChange('gender', e.target.value)}
                        >
                          <option value="M">Male</option>
                          <option value="F">Female</option>
                          <option value="NB">Non-Binary</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <div className="atlas-label" style={{ marginBottom: 6 }}>
                          Party
                        </div>
                        <select
                          className="atlas-input"
                          value={formData.party || ''}
                          onChange={(e) => handleChange('party', e.target.value)}
                        >
                          <option value="Democrat">Democrat</option>
                          <option value="Republican">Republican</option>
                          <option value="Independent">Independent</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <div className="atlas-label" style={{ marginBottom: 6 }}>
                          Phone
                        </div>
                        <input
                          className="atlas-input"
                          value={formData.phone || ''}
                          onChange={(e) => handleChange('phone', e.target.value)}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <div className="atlas-label">Full name</div>
                        <div style={{ marginTop: 6, fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                          {voter.firstName} {voter.middleName} {voter.lastName} {voter.suffix}
                        </div>
                      </div>
                      <div>
                        <div className="atlas-label">Party</div>
                        <div style={{ marginTop: 6 }}>
                          <span className={partyChip}>{voter.party || 'Unenrolled'}</span>
                        </div>
                      </div>
                      <div>
                        <div className="atlas-label">Age / gender</div>
                        <div style={{ marginTop: 6 }} className="atlas-help">
                          <span className="atlas-mono">{voter.age || 'N/A'}</span> / <span className="atlas-mono">{voter.gender || 'N/A'}</span>
                        </div>
                      </div>
                      <div>
                        <div className="atlas-label">Race</div>
                        <div style={{ marginTop: 6 }} className="atlas-help">
                          {voter.race || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="atlas-label">Phone</div>
                        <div style={{ marginTop: 6 }} className="atlas-help atlas-mono">
                          {voter.phone || 'N/A'}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </Card>

              <Card style={{ padding: 14 }}>
                <div className="atlas-label">Address</div>

                {isEditing ? (
                  <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                    <input
                      className="atlas-input"
                      placeholder="Address Line 1"
                      value={formData.address || ''}
                      onChange={(e) => handleChange('address', e.target.value)}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                      <input
                        className="atlas-input"
                        placeholder="City"
                        value={formData.city || ''}
                        onChange={(e) => handleChange('city', e.target.value)}
                      />
                      <input
                        className="atlas-input"
                        placeholder="State"
                        value={formData.state || ''}
                        onChange={(e) => handleChange('state', e.target.value)}
                      />
                      <input
                        className="atlas-input"
                        placeholder="Zip"
                        value={formData.zip || ''}
                        onChange={(e) => handleChange('zip', e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                      {voter.address} {voter.unit}
                    </div>
                    <div className="atlas-help">{voter.city}, {voter.state} {voter.zip}</div>
                  </div>
                )}
              </Card>
            </div>

            {/* Right Column: Interaction History */}
            <div>
              <Card style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ClockIcon style={{ width: 16, height: 16 }} />
                  <div className="atlas-label">Campaign history</div>
                </div>

                <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                  {history.length > 0 ? (
                    history.map((interaction) => {
                      const canvasser = canvassers.find((c) => c.id === interaction.user_id);
                      const resultChip =
                        interaction.result_code === 'contacted'
                          ? 'atlas-chip atlas-chip--status-contacted'
                          : interaction.result_code === 'not_home'
                            ? 'atlas-chip atlas-chip--status-not-home'
                            : 'atlas-chip atlas-chip--status-refused';

                      return (
                        <div key={interaction.id} className="atlas-card" style={{ padding: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                            <div>
                              <div className="atlas-help atlas-mono" style={{ opacity: 0.8 }}>
                                {new Date(interaction.occurred_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{' '}
                                {new Date(interaction.occurred_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <div style={{ marginTop: 6 }}>
                                <span className={['atlas-chip', resultChip].join(' ')}>
                                  {interaction.result_code.replace('_', ' ')}
                                </span>
                              </div>
                            </div>

                            <div className="atlas-help" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, opacity: 0.8 }}>
                              <UserIcon style={{ width: 14, height: 14 }} />
                              {canvasser?.name || 'Unknown'}
                            </div>
                          </div>

                          {interaction.notes ? (
                            <div className="atlas-help" style={{ marginTop: 10, fontStyle: 'italic' }}>
                              “{interaction.notes}”
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  ) : (
                    <div className="atlas-help" style={{ opacity: 0.75 }}>
                      No history recorded yet.
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>

        <div className="atlas-modal-footer">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default VoterDetailModal;
