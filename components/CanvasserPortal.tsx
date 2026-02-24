import React, { useState, useContext, useMemo, useEffect, useRef } from 'react';
import { AppContext } from './AppContext';
import { Voter, InteractionResultCode, InteractionCreate } from '../types';
import {
  MapIcon,
  ListBulletIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  NoSymbolIcon,
  PencilSquareIcon,
  ChevronRightIcon,
  CloudArrowUpIcon,
  CheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { PageHeader } from '../src/design/components/PageHeader';
import { Card } from '../src/design/components/Card';
import { Button } from '../src/design/components/Button';
import { atlasTokens } from '../src/design/tokens';

declare const google: any;

const CanvasserPortal: React.FC = () => {
  const context = useContext(AppContext);

  // Local state
  const [myAssignments, setMyAssignments] = useState(context?.assignments || []);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selectedVoterId, setSelectedVoterId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Sync UI State
  const [syncState, setSyncState] = useState<'synced' | 'syncing' | 'error'>('synced');

  // Map References
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (context) {
      context.client.getMyAssignments().then(setMyAssignments);
    }
  }, [context]);

  if (!context || !context.currentUser) return null;
  const { walkLists, voters, client, refreshData, currentUser, currentOrg, interactions } = context;

  const myLists = walkLists.filter((list) => myAssignments.some((a) => a.listId === list.id));

  const activeList = useMemo(() => myLists.find((l) => l.id === selectedListId), [myLists, selectedListId]);

  const activeVoters = useMemo(() => {
    if (!activeList) return [];
    return voters.filter((v) => activeList.voterIds.includes(v.id));
  }, [voters, activeList]);

  const selectedVoter = useMemo(() => {
    if (!selectedVoterId) return null;
    return voters.find((v) => v.id === selectedVoterId) || null;
  }, [selectedVoterId, voters]);

  const selectedVoterHistory = useMemo(() => {
    if (!selectedVoterId) return [];
    return interactions
      .filter((i) => i.voter_id === selectedVoterId)
      .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
  }, [selectedVoterId, interactions]);

  // Initialize/Update Map when viewing active list in map mode
  useEffect(() => {
    if (selectedListId && viewMode === 'map' && mapRef.current && typeof google !== 'undefined') {
      if (!mapInstance.current) {
        mapInstance.current = new google.maps.Map(mapRef.current, {
          center: { lat: 40.7128, lng: -74.006 },
          zoom: 14,
          disableDefaultUI: true,
          zoomControl: true,
        });
      }

      // Update Markers
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      const bounds = new google.maps.LatLngBounds();

      activeVoters.forEach((v, index) => {
        if (!v.geom) return;

        const status = v.lastInteractionStatus;
        const isSelected = selectedVoterId === v.id;

        // Map marker colors mapped to canonical tokens
        let fillColor = atlasTokens.color.border; // pending / unknown
        if (status === 'contacted') fillColor = atlasTokens.color.action;
        else if (status === 'not_home') fillColor = atlasTokens.color.primary;
        else if (status === 'refused') fillColor = atlasTokens.color.critical;

        const marker = new google.maps.Marker({
          position: v.geom,
          map: mapInstance.current,
          label: {
            text: (index + 1).toString(),
            color: 'white',
            fontSize: '10px',
            fontWeight: 'bold',
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: isSelected ? 12 : 10,
            fillColor,
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: isSelected ? atlasTokens.color.action : '#FFFFFF',
          },
        });

        marker.addListener('click', () => {
          setSelectedVoterId(v.id);
          mapInstance.current.panTo(v.geom);
        });

        markersRef.current.push(marker);
        bounds.extend(v.geom);
      });

      if (activeVoters.length > 0) {
        mapInstance.current.fitBounds(bounds);
      }
    }
  }, [selectedListId, viewMode, activeVoters, selectedVoterId]);

  const handleRecordInteraction = async (resultCode: InteractionResultCode, supportLevel?: number, notes?: string) => {
    if (!selectedVoterId || !selectedListId || !currentUser || !currentOrg) return;

    setSyncState('syncing');

    const assignment = myAssignments.find((a) => a.listId === selectedListId);

    const payload: InteractionCreate = {
      client_interaction_uuid: crypto.randomUUID(),
      org_id: currentOrg.id,
      voter_id: selectedVoterId,
      assignment_id: assignment?.id,
      occurred_at: new Date().toISOString(),
      channel: 'canvass',
      result_code: resultCode,
      notes,
      survey_responses: supportLevel ? { support_level: supportLevel } : undefined,
    };

    try {
      await client.logInteraction(payload);
      await refreshData();
      setSyncState('synced');
      setSelectedVoterId(null);
    } catch (e) {
      console.error('Sync failed', e);
      setSyncState('error');
    }
  };

  const VoterItem: React.FC<{ voter: Voter; index: number }> = ({ voter, index }) => {
    const isSelected = selectedVoterId === voter.id;
    const partyChip =
      voter.party === 'Democrat'
        ? 'atlas-chip atlas-chip--party-dem'
        : voter.party === 'Republican'
          ? 'atlas-chip atlas-chip--party-rep'
          : 'atlas-chip';

    const statusChip = voter.lastInteractionStatus
      ? voter.lastInteractionStatus === 'contacted'
        ? 'atlas-chip atlas-chip--status-contacted'
        : voter.lastInteractionStatus === 'not_home'
          ? 'atlas-chip atlas-chip--status-not-home'
          : 'atlas-chip atlas-chip--status-refused'
      : null;

    return (
      <div
        onClick={() => setSelectedVoterId(voter.id)}
        className="atlas-card"
        style={{
          padding: 12,
          cursor: 'pointer',
          borderColor: isSelected ? 'rgba(0, 163, 224, 0.65)' : undefined,
          background: isSelected ? 'rgba(0, 163, 224, 0.04)' : undefined,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
          <div className="atlas-chip" style={{ width: 28, justifyContent: 'center' }}>
            {index + 1}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                {voter.firstName} {voter.lastName}
              </div>
              <span className={partyChip}>{voter.party ? voter.party[0] : 'U'}</span>
            </div>
            <div className="atlas-help" style={{ marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {voter.address}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {statusChip ? (
            <span className={statusChip}>{voter.lastInteractionStatus?.replace('_', ' ')}</span>
          ) : (
            <ChevronRightIcon style={{ width: 16, height: 16, opacity: 0.6 }} />
          )}
        </div>
      </div>
    );
  };

  const syncPill =
    syncState === 'synced' ? (
      <span className="atlas-chip atlas-chip--registered" style={{ gap: 6 }}>
        <CheckIcon style={{ width: 14, height: 14 }} /> Synced
      </span>
    ) : syncState === 'syncing' ? (
      <span className="atlas-chip atlas-chip--party-dem" style={{ gap: 6 }}>
        <CloudArrowUpIcon style={{ width: 14, height: 14 }} /> Syncing…
      </span>
    ) : (
      <span className="atlas-chip atlas-chip--party-rep" style={{ gap: 6 }}>
        <ExclamationTriangleIcon style={{ width: 14, height: 14 }} /> Error
      </span>
    );

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 6rem)' }}>
      <PageHeader
        title="Field Workspace"
        right={
          selectedListId ? (
            <Button
              variant="secondary"
              onClick={() => {
                setSelectedListId(null);
                setSelectedVoterId(null);
              }}
            >
              Exit List
            </Button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="atlas-card" style={{ padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <MapIcon style={{ width: 16, height: 16 }} />
                {syncPill}
              </span>
            </div>
          )
        }
      />

      {!selectedListId ? (
        <div style={{ marginTop: 16, display: 'grid', gap: 12, overflow: 'auto' }}>
          <div className="atlas-label">My assigned lists</div>

          {myLists.length > 0 ? (
            myLists.map((list) => (
              <Card
                key={list.id}
                style={{ padding: 16, cursor: 'pointer' }}
                onClick={() => setSelectedListId(list.id) as any}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <div className="atlas-card" style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ListBulletIcon style={{ width: 20, height: 20, color: atlasTokens.color.primary }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16 }}>{list.name}</div>
                      <div className="atlas-help">{list.voterIds.length} households</div>
                    </div>
                  </div>
                  <span className="atlas-chip atlas-chip--registered">Open Turf</span>
                </div>
              </Card>
            ))
          ) : (
            <Card style={{ padding: 20, textAlign: 'center' }}>
              <ClockIcon style={{ width: 32, height: 32, opacity: 0.45 }} />
              <div className="atlas-help" style={{ marginTop: 10 }}>
                No turf assigned yet.
              </div>
            </Card>
          )}
        </div>
      ) : (
        <Card style={{ marginTop: 16, padding: 0, overflow: 'hidden', minHeight: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div
            className="atlas-card"
            style={{
              borderRadius: 0,
              borderLeft: 'none',
              borderRight: 'none',
              borderTop: 'none',
              padding: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div>
              <div className="atlas-label">List</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>{activeList?.name}</div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant={viewMode === 'list' ? 'primary' : 'secondary'} onClick={() => setViewMode('list')}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <ListBulletIcon style={{ width: 16, height: 16 }} /> List
                </span>
              </Button>
              <Button variant={viewMode === 'map' ? 'primary' : 'secondary'} onClick={() => setViewMode('map')}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <MapIcon style={{ width: 16, height: 16 }} /> Map
                </span>
              </Button>
            </div>
          </div>

          <div style={{ display: 'flex', minHeight: 0, flex: 1 }}>
            {/* Left: voter list/map */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto', borderRight: '1px solid rgba(209, 217, 224, 0.65)' }}>
              {viewMode === 'list' ? (
                <div style={{ display: 'grid', gap: 8, padding: 12 }}>
                  {activeVoters.map((v, idx) => (
                    <VoterItem key={v.id} voter={v} index={idx} />
                  ))}
                </div>
              ) : (
                <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: 420, background: 'rgba(209, 217, 224, 0.25)' }} />
              )}
            </div>

            {/* Right: interaction panel */}
            {selectedVoterId ? (
              <div style={{ width: '42%', minWidth: 360, maxWidth: 520, minHeight: 0, overflow: 'auto' }}>
                <div style={{ padding: 12 }}>
                  <Card style={{ padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <div className="atlas-label">Voter</div>
                        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 18, marginTop: 4 }}>
                          {selectedVoter?.firstName} {selectedVoter?.lastName}
                        </div>
                        <div className="atlas-help" style={{ marginTop: 4 }}>
                          {selectedVoter?.address}
                        </div>
                      </div>
                      <Button variant="secondary" onClick={() => setSelectedVoterId(null)}>
                        Back
                      </Button>
                    </div>
                  </Card>

                  {selectedVoterHistory.length > 0 ? (
                    <Card style={{ padding: 14, marginTop: 12 }}>
                      <div className="atlas-label">Previous interactions</div>
                      <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                        {selectedVoterHistory.slice(0, 10).map((hist) => (
                          <div key={hist.id} className="atlas-card" style={{ padding: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                              <span
                                className={
                                  hist.result_code === 'contacted'
                                    ? 'atlas-chip atlas-chip--status-contacted'
                                    : hist.result_code === 'not_home'
                                      ? 'atlas-chip atlas-chip--status-not-home'
                                      : 'atlas-chip atlas-chip--status-refused'
                                }
                              >
                                {hist.result_code.replace('_', ' ')}
                              </span>
                              <span className="atlas-help" style={{ opacity: 0.7 }}>
                                {new Date(hist.occurred_at).toLocaleDateString()}
                              </span>
                            </div>
                            {hist.notes ? (
                              <div className="atlas-help" style={{ marginTop: 6, fontStyle: 'italic' }}>
                                “{hist.notes}”
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </Card>
                  ) : null}

                  <Card style={{ padding: 14, marginTop: 12 }}>
                    <div className="atlas-label">Record result</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                      <Button variant="primary" onClick={() => handleRecordInteraction('contacted', 5)}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <CheckCircleIcon style={{ width: 18, height: 18 }} /> At Home
                        </span>
                      </Button>
                      <Button variant="secondary" onClick={() => handleRecordInteraction('not_home')}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <ClockIcon style={{ width: 18, height: 18 }} /> Not Home
                        </span>
                      </Button>
                      <Button variant="critical" onClick={() => handleRecordInteraction('refused')}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <NoSymbolIcon style={{ width: 18, height: 18 }} /> Refused
                        </span>
                      </Button>
                      <Button variant="secondary" onClick={() => handleRecordInteraction('inaccessible')}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <XCircleIcon style={{ width: 18, height: 18 }} /> Inaccessible
                        </span>
                      </Button>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <div className="atlas-label" style={{ marginBottom: 6 }}>
                        Field notes
                      </div>
                      <div style={{ position: 'relative' }}>
                        <PencilSquareIcon style={{ width: 16, height: 16, position: 'absolute', top: 12, left: 12, opacity: 0.65 }} />
                        <textarea
                          className="atlas-input"
                          style={{ paddingLeft: 36, minHeight: 110, resize: 'vertical' }}
                          placeholder="Support level? Yard sign requested?"
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
                      <Button variant="secondary" onClick={() => setSelectedVoterId(null)} style={{ flex: 1 }}>
                        Skip
                      </Button>
                      <Button variant="primary" onClick={() => handleRecordInteraction('contacted', 3, 'Recorded through portal')} style={{ flex: 2 }}>
                        Save Entry
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>
            ) : null}
          </div>
        </Card>
      )}
    </div>
  );
};

export default CanvasserPortal;
