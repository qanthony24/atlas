import React, { useState, useContext } from 'react';
import { AppContext } from './AppContext';
import { Voter } from '../types';
import { XMarkIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { Card } from '../src/design/components/Card';
import { Button } from '../src/design/components/Button';

interface AddVoterModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const AddVoterModal: React.FC<AddVoterModalProps> = ({ onClose, onSuccess }) => {
  const context = useContext(AppContext);

  const [formData, setFormData] = useState<Partial<Voter>>({
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    party: 'Unenrolled',
    phone: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof Voter, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.firstName || !formData.lastName || !formData.address) {
      setError('First Name, Last Name, and Address are required.');
      return;
    }

    if (!context) return;

    setSaving(true);
    try {
      await context.client.addVoter(formData);
      onSuccess();
    } catch (err: any) {
      console.error('Failed to add voter', err);
      setError(err.message || 'Failed to create voter record.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="atlas-modal-overlay" role="dialog" aria-modal="true">
      <Card className="atlas-modal" style={{ padding: 0 }}>
        <div className="atlas-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              className="atlas-card"
              style={{
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '999px',
              }}
            >
              <UserPlusIcon style={{ width: 18, height: 18, color: 'var(--color-primary)' }} />
            </div>
            <div>
              <div className="atlas-label">Lead</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 18 }}>Add New Voter</div>
            </div>
          </div>

          <Button variant="secondary" onClick={onClose} aria-label="Close">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <XMarkIcon style={{ width: 18, height: 18 }} />
              Close
            </span>
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="atlas-modal-body">
            {error ? (
              <div className="atlas-error" style={{ marginBottom: 12 }}>
                {error}
              </div>
            ) : null}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <div className="atlas-label" style={{ marginBottom: 6 }}>
                  First Name <span className="atlas-mono">*</span>
                </div>
                <input
                  type="text"
                  className="atlas-input"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                />
              </div>
              <div>
                <div className="atlas-label" style={{ marginBottom: 6 }}>
                  Last Name <span className="atlas-mono">*</span>
                </div>
                <input
                  type="text"
                  className="atlas-input"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div className="atlas-label" style={{ marginBottom: 6 }}>
                Street Address <span className="atlas-mono">*</span>
              </div>
              <input
                type="text"
                placeholder="123 Main St"
                className="atlas-input"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <div className="atlas-label" style={{ marginBottom: 6 }}>
                  City
                </div>
                <input
                  type="text"
                  className="atlas-input"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                />
              </div>
              <div>
                <div className="atlas-label" style={{ marginBottom: 6 }}>
                  State
                </div>
                <input
                  type="text"
                  className="atlas-input"
                  value={formData.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                />
              </div>
              <div>
                <div className="atlas-label" style={{ marginBottom: 6 }}>
                  Zip
                </div>
                <input
                  type="text"
                  className="atlas-input"
                  value={formData.zip}
                  onChange={(e) => handleChange('zip', e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div className="atlas-label" style={{ marginBottom: 6 }}>
                  Party
                </div>
                <select
                  className="atlas-input"
                  value={formData.party}
                  onChange={(e) => handleChange('party', e.target.value)}
                >
                  <option value="Unenrolled">Unenrolled</option>
                  <option value="Democrat">Democrat</option>
                  <option value="Republican">Republican</option>
                  <option value="Independent">Independent</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <div className="atlas-label" style={{ marginBottom: 6 }}>
                  Phone (Optional)
                </div>
                <input
                  type="tel"
                  className="atlas-input"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="atlas-modal-footer">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Adding…' : 'Add Voter'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AddVoterModal;
