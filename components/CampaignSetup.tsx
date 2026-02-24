import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AppContext } from './AppContext';
import { PageHeader } from '../src/design/components/PageHeader';
import { Card } from '../src/design/components/Card';
import { Button } from '../src/design/components/Button';

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

const CampaignSetup: React.FC = () => {
  const context = useContext(AppContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<any>({
    office_type: '',
    district_type: '',
    election_date: isoDate(new Date()),
    win_number_target: 0,
    expected_turnout: '',
    geography_unit_type: 'precinct',
    campaign_phase: 'general',
  });

  const [goals, setGoals] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);

  // new goal form
  const [newGoal, setNewGoal] = useState<any>({
    goal_type: 'doors',
    target_value: 0,
    start_date: isoDate(new Date()),
    end_date: isoDate(new Date()),
  });

  // new unit form
  const [newUnit, setNewUnit] = useState<any>({
    unit_type: 'precinct',
    external_id: '',
    name: '',
    past_turnout: '',
    past_dem_result: '',
  });

  if (!context) return null;
  const { currentUser } = context;

  const isAdmin = currentUser?.role === 'admin';

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!context.client.getCampaignProfile || !context.client.getCampaignGoals || !context.client.getGeographyUnits) {
        throw new Error('Client missing campaign setup methods');
      }

      const [p, g, u] = await Promise.all([
        context.client.getCampaignProfile(),
        context.client.getCampaignGoals(),
        context.client.getGeographyUnits(),
      ]);

      if (p) {
        setProfile({
          office_type: p.office_type || '',
          district_type: p.district_type || '',
          election_date: p.election_date || isoDate(new Date()),
          win_number_target: p.win_number_target || 0,
          expected_turnout: p.expected_turnout ?? '',
          geography_unit_type: p.geography_unit_type || 'precinct',
          campaign_phase: p.campaign_phase || 'general',
        });
      }
      setGoals(g?.goals || []);
      setUnits(u?.units || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load campaign setup');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveProfile = async () => {
    setError(null);
    try {
      if (!context.client.upsertCampaignProfile) throw new Error('Client missing upsertCampaignProfile');
      await context.client.upsertCampaignProfile({
        ...profile,
        win_number_target: Number(profile.win_number_target) || null,
        expected_turnout: profile.expected_turnout === '' ? null : Number(profile.expected_turnout),
      });
      await load();
    } catch (e: any) {
      setError(e?.message || 'Failed to save profile');
    }
  };

  const addGoal = async () => {
    setError(null);
    try {
      if (!context.client.createCampaignGoal) throw new Error('Client missing createCampaignGoal');
      await context.client.createCampaignGoal({
        ...newGoal,
        target_value: Number(newGoal.target_value) || 0,
      });
      setNewGoal({ ...newGoal, target_value: 0 });
      await load();
    } catch (e: any) {
      setError(e?.message || 'Failed to create goal');
    }
  };

  const addUnit = async () => {
    setError(null);
    try {
      if (!context.client.upsertGeographyUnit) throw new Error('Client missing upsertGeographyUnit');
      await context.client.upsertGeographyUnit({
        ...newUnit,
        external_id: newUnit.external_id || null,
        past_turnout: newUnit.past_turnout === '' ? null : Number(newUnit.past_turnout),
        past_dem_result: newUnit.past_dem_result === '' ? null : Number(newUnit.past_dem_result),
      });
      setNewUnit({ ...newUnit, external_id: '', name: '', past_turnout: '', past_dem_result: '' });
      await load();
    } catch (e: any) {
      setError(e?.message || 'Failed to upsert geography unit');
    }
  };

  const profileComplete = useMemo(() => {
    return Boolean(profile.office_type && profile.district_type && profile.election_date && Number(profile.win_number_target) > 0);
  }, [profile]);

  if (!isAdmin) {
    return (
      <div>
        <PageHeader title="Campaign Setup" />
        <Card style={{ padding: 16 }}>
          <div className="atlas-help">Campaign setup is admin-only.</div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Campaign Setup" right={<Button variant="secondary" onClick={load}>Refresh</Button>} />

      {error ? <div className="atlas-error" style={{ marginBottom: 12 }}>{error}</div> : null}

      {loading ? (
        <Card style={{ padding: 16 }}>
          <div className="atlas-help">Loading…</div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          <Card style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div className="atlas-label">Profile</div>
                <div className="atlas-help" style={{ marginTop: 4, opacity: 0.8 }}>
                  {profileComplete ? 'Complete' : 'Incomplete'}
                </div>
              </div>
              <Button variant="primary" onClick={saveProfile}>Save</Button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <div>
                <div className="atlas-label" style={{ marginBottom: 6 }}>Office</div>
                <input className="atlas-input" value={profile.office_type} onChange={(e) => setProfile({ ...profile, office_type: e.target.value })} />
              </div>
              <div>
                <div className="atlas-label" style={{ marginBottom: 6 }}>District type</div>
                <input className="atlas-input" value={profile.district_type} onChange={(e) => setProfile({ ...profile, district_type: e.target.value })} />
              </div>
              <div>
                <div className="atlas-label" style={{ marginBottom: 6 }}>Election date</div>
                <input type="date" className="atlas-input" value={profile.election_date} onChange={(e) => setProfile({ ...profile, election_date: e.target.value })} />
              </div>
              <div>
                <div className="atlas-label" style={{ marginBottom: 6 }}>Win number</div>
                <input type="number" className="atlas-input" value={profile.win_number_target} onChange={(e) => setProfile({ ...profile, win_number_target: e.target.value })} />
              </div>
              <div>
                <div className="atlas-label" style={{ marginBottom: 6 }}>Expected turnout (optional)</div>
                <input type="number" className="atlas-input" value={profile.expected_turnout} onChange={(e) => setProfile({ ...profile, expected_turnout: e.target.value })} />
              </div>
              <div>
                <div className="atlas-label" style={{ marginBottom: 6 }}>Campaign phase</div>
                <select className="atlas-input" value={profile.campaign_phase} onChange={(e) => setProfile({ ...profile, campaign_phase: e.target.value })}>
                  <option value="primary">Primary</option>
                  <option value="general">General</option>
                </select>
              </div>
              <div>
                <div className="atlas-label" style={{ marginBottom: 6 }}>Geography unit type</div>
                <select className="atlas-input" value={profile.geography_unit_type} onChange={(e) => setProfile({ ...profile, geography_unit_type: e.target.value })}>
                  <option value="precinct">Precinct</option>
                  <option value="ward">Ward</option>
                  <option value="parish">Parish</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>
          </Card>

          <Card style={{ padding: 16 }}>
            <div className="atlas-label">Goals</div>
            <div className="atlas-help" style={{ marginTop: 4, opacity: 0.8 }}>
              Add one or more goals; we’ll use these for Phase 3 analytics.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 10, marginTop: 12, alignItems: 'end' }}>
              <div>
                <div className="atlas-label" style={{ marginBottom: 6 }}>Type</div>
                <select className="atlas-input" value={newGoal.goal_type} onChange={(e) => setNewGoal({ ...newGoal, goal_type: e.target.value })}>
                  <option value="doors">Doors</option>
                  <option value="contacts">Contacts</option>
                  <option value="ids">IDs</option>
                  <option value="turnout">Turnout</option>
                </select>
              </div>
              <div>
                <div className="atlas-label" style={{ marginBottom: 6 }}>Target</div>
                <input type="number" className="atlas-input" value={newGoal.target_value} onChange={(e) => setNewGoal({ ...newGoal, target_value: e.target.value })} />
              </div>
              <div>
                <div className="atlas-label" style={{ marginBottom: 6 }}>Start</div>
                <input type="date" className="atlas-input" value={newGoal.start_date} onChange={(e) => setNewGoal({ ...newGoal, start_date: e.target.value })} />
              </div>
              <div>
                <div className="atlas-label" style={{ marginBottom: 6 }}>End</div>
                <input type="date" className="atlas-input" value={newGoal.end_date} onChange={(e) => setNewGoal({ ...newGoal, end_date: e.target.value })} />
              </div>
              <Button variant="primary" onClick={addGoal}>Add</Button>
            </div>

            <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
              {goals.length === 0 ? (
                <div className="atlas-help">No goals yet.</div>
              ) : (
                goals.map((g) => (
                  <div key={g.id} className="atlas-card" style={{ padding: 10, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <div>
                      <span className="atlas-chip">{g.goal_type}</span>
                      <span className="atlas-mono" style={{ marginLeft: 10 }}>Target: {g.target_value}</span>
                    </div>
                    <div className="atlas-help" style={{ opacity: 0.8 }}>{g.start_date} → {g.end_date}</div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card style={{ padding: 16 }}>
            <div className="atlas-label">Geography units</div>
            <div className="atlas-help" style={{ marginTop: 4, opacity: 0.8 }}>
              Minimal v1: name + optional external id. (No advanced GIS yet.)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr 1fr 1fr auto', gap: 10, marginTop: 12, alignItems: 'end' }}>
              <div>
                <div className="atlas-label" style={{ marginBottom: 6 }}>Type</div>
                <select className="atlas-input" value={newUnit.unit_type} onChange={(e) => setNewUnit({ ...newUnit, unit_type: e.target.value })}>
                  <option value="precinct">Precinct</option>
                  <option value="ward">Ward</option>
                  <option value="parish">Parish</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <div className="atlas-label" style={{ marginBottom: 6 }}>External ID</div>
                <input className="atlas-input" value={newUnit.external_id} onChange={(e) => setNewUnit({ ...newUnit, external_id: e.target.value })} />
              </div>
              <div>
                <div className="atlas-label" style={{ marginBottom: 6 }}>Name</div>
                <input className="atlas-input" value={newUnit.name} onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })} />
              </div>
              <div>
                <div className="atlas-label" style={{ marginBottom: 6 }}>Past turnout</div>
                <input type="number" className="atlas-input" value={newUnit.past_turnout} onChange={(e) => setNewUnit({ ...newUnit, past_turnout: e.target.value })} />
              </div>
              <div>
                <div className="atlas-label" style={{ marginBottom: 6 }}>Past Dem %</div>
                <input type="number" className="atlas-input" value={newUnit.past_dem_result} onChange={(e) => setNewUnit({ ...newUnit, past_dem_result: e.target.value })} />
              </div>
              <Button variant="primary" onClick={addUnit}>Upsert</Button>
            </div>

            <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
              {units.length === 0 ? (
                <div className="atlas-help">No geography units yet.</div>
              ) : (
                units.map((u) => (
                  <div key={u.id} className="atlas-card" style={{ padding: 10, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <div>
                      <span className="atlas-chip">{u.unit_type}</span>
                      <span style={{ marginLeft: 10, fontFamily: 'var(--font-heading)', fontWeight: 700 }}>{u.name}</span>
                      {u.external_id ? <span className="atlas-mono" style={{ marginLeft: 10, opacity: 0.8 }}>({u.external_id})</span> : null}
                    </div>
                    <div className="atlas-help" style={{ opacity: 0.8 }}>
                      {u.past_turnout ? `Turnout: ${u.past_turnout}` : ''}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CampaignSetup;
