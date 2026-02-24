import React, { useState, useContext, useRef, useEffect } from 'react';
import { AppContext } from './AppContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { calculateDistance } from '../utils/geoUtils';
import { MapIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '../src/design/components/PageHeader';
import { Card } from '../src/design/components/Card';
import { Button } from '../src/design/components/Button';
import { atlasTokens } from '../src/design/tokens';

declare const google: any;

const TurfCutter: React.FC = () => {
  const context = useContext(AppContext);
  const [selectedVoters, setSelectedVoters] = useState<string[]>([]);
  const [filterParty, setFilterParty] = useState<string>('All');
  const [filterCity, setFilterCity] = useState<string>('All');
  const [listName, setListName] = useState('');

  // Geolocation state
  const { location, error, loading, getLocation } = useGeolocation();
  const [useProximity, setUseProximity] = useState(false);
  const [radius, setRadius] = useState(5); // km

  // Map State
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  if (!context) return null;
  const { voters, client, refreshData } = context;

  const filteredVoters = voters.filter((voter) => {
    const partyMatch = filterParty === 'All' || voter.party === filterParty;
    const cityMatch = filterCity === 'All' || voter.city === filterCity;

    let proximityMatch = true;
    if (useProximity && location && voter.geom) {
      const distance = calculateDistance(location.lat, location.lng, voter.geom.lat, voter.geom.lng);
      proximityMatch = distance <= radius;
    }

    return partyMatch && cityMatch && proximityMatch;
  });

  // Initialize Map
  useEffect(() => {
    if (mapRef.current && !mapInstance.current && typeof google !== 'undefined') {
      mapInstance.current = new google.maps.Map(mapRef.current, {
        center: { lat: 40.7128, lng: -74.006 },
        zoom: 12,
        mapTypeControl: false,
        styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
      });
    }
  }, []);

  // Update Map Markers based on filteredVoters
  useEffect(() => {
    if (!mapInstance.current || typeof google === 'undefined') return;

    // Clear markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    let hasPoints = false;

    filteredVoters.forEach((voter) => {
      if (!voter.geom) return;

      const isSelected = selectedVoters.includes(voter.id);

      // Party colors are mapped onto canonical tokens (no ad-hoc hexes)
      const partyColor =
        voter.party === 'Democrat'
          ? atlasTokens.color.action
          : voter.party === 'Republican'
            ? atlasTokens.color.critical
            : atlasTokens.color.border;

      const marker = new google.maps.Marker({
        position: voter.geom,
        map: mapInstance.current,
        title: `${voter.firstName} ${voter.lastName}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: isSelected ? 6 : 4,
          fillColor: isSelected ? atlasTokens.color.primary : partyColor,
          fillOpacity: 0.85,
          strokeWeight: isSelected ? 2 : 1,
          strokeColor: '#FFFFFF',
        },
      });

      // Click to select
      marker.addListener('click', () => {
        handleSelectVoter(voter.id);
      });

      markersRef.current.push(marker);
      bounds.extend(voter.geom);
      hasPoints = true;
    });

    if (hasPoints) {
      mapInstance.current.fitBounds(bounds);
    }
  }, [filteredVoters, selectedVoters, location]);

  const handleSelectVoter = (voterId: string) => {
    setSelectedVoters((prev) => (prev.includes(voterId) ? prev.filter((id) => id !== voterId) : [...prev, voterId]));
  };

  const handleSaveList = async () => {
    if (!listName || selectedVoters.length === 0) {
      alert('Please provide a list name and select at least one voter.');
      return;
    }
    try {
      await client.createWalkList(listName, selectedVoters);
      await refreshData();
      setListName('');
      setSelectedVoters([]);
      alert('Walk list created successfully!');
    } catch (e) {
      console.error(e);
      alert('Error creating list');
    }
  };

  const handleUseLocation = () => {
    getLocation();
    setUseProximity(true);
  };

  const uniqueCities = ['All', ...Array.from(new Set(voters.map((v) => v.city).filter(Boolean)))];
  const uniqueParties = ['All', ...Array.from(new Set(voters.map((v) => v.party).filter(Boolean)))];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 6rem)' }}>
      <PageHeader title="Turf Cutter" />

      <div style={{ marginTop: 16, flex: 1, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, minHeight: 0 }}>
        {/* Visual Turf Cutter Map */}
        <Card style={{ position: 'relative', overflow: 'hidden', minHeight: 0 }}>
          <div
            className="atlas-card"
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              zIndex: 10,
              padding: 10,
            }}
          >
            <div className="atlas-label">Voters found</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 18 }}>{filteredVoters.length}</div>
            <div className="atlas-help" style={{ marginTop: 4 }}>
              {selectedVoters.length} selected
            </div>
          </div>

          <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: 420, background: 'rgba(209, 217, 224, 0.25)' }} />
        </Card>

        {/* Filter & Selection Panel */}
        <Card style={{ padding: 16, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 16, overflow: 'auto' }}>
          <div>
            <div className="atlas-label">Filter</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16, marginTop: 4 }}>Filter-Based Cutter</div>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <div className="atlas-label" style={{ marginBottom: 6 }}>
                Party
              </div>
              <select onChange={(e) => setFilterParty(e.target.value)} value={filterParty} className="atlas-input">
                {uniqueParties.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="atlas-label" style={{ marginBottom: 6 }}>
                City
              </div>
              <select onChange={(e) => setFilterCity(e.target.value)} value={filterCity} className="atlas-input">
                {uniqueCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Geolocation Section */}
          <Card style={{ padding: 12 }}>
            <div className="atlas-label">Geolocation</div>
            <div className="atlas-help" style={{ marginTop: 4 }}>
              Optional proximity filter. Uses your device location.
            </div>

            <div style={{ marginTop: 10 }}>
              {!location || !useProximity ? (
                <Button variant="secondary" onClick={handleUseLocation} disabled={loading} style={{ width: '100%' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center', width: '100%' }}>
                    <MapIcon style={{ width: 18, height: 18 }} />
                    {loading ? 'Locating…' : 'Find Voters Near Me'}
                  </span>
                </Button>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div className="atlas-help">
                      <span className="atlas-chip atlas-chip--registered">Location active</span>
                    </div>
                    <Button variant="secondary" onClick={() => setUseProximity(false)}>
                      Clear
                    </Button>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div className="atlas-label">Radius</div>
                      <div className="atlas-mono">{radius} km</div>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={radius}
                      onChange={(e) => setRadius(parseInt(e.target.value))}
                      style={{ width: '100%', marginTop: 6 }}
                    />
                  </div>
                </div>
              )}
              {error ? (
                <div className="atlas-error" style={{ marginTop: 10 }}>
                  {error}
                </div>
              ) : null}
            </div>
          </Card>

          {/* Results */}
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>Results</div>
              <div className="atlas-help">{filteredVoters.length}</div>
            </div>

            <Card style={{ padding: 8, overflow: 'auto', minHeight: 140, flex: 1 }}>
              {filteredVoters.length > 0 ? (
                filteredVoters.map((voter) => (
                  <div
                    key={voter.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      padding: '8px 8px',
                      borderBottom: '1px solid rgba(209, 217, 224, 0.35)',
                    }}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={selectedVoters.includes(voter.id)}
                        onChange={() => handleSelectVoter(voter.id)}
                      />
                      <div>
                        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 13 }}>
                          {voter.firstName} {voter.lastName}
                        </div>
                        <div className="atlas-help">
                          {voter.city || '—'} • {voter.party || '—'}
                        </div>
                      </div>
                    </label>
                  </div>
                ))
              ) : (
                <div className="atlas-help" style={{ textAlign: 'center', padding: 16 }}>
                  No voters match the criteria.
                </div>
              )}
            </Card>
          </div>

          {/* Save list */}
          <Card style={{ padding: 12 }}>
            <div className="atlas-label">New walk list</div>
            <input
              type="text"
              placeholder="New Walk List Name"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              className="atlas-input"
              style={{ marginTop: 8 }}
            />
            <div style={{ marginTop: 10 }}>
              <Button variant="primary" onClick={handleSaveList} style={{ width: '100%' }}>
                Save List & Assign
              </Button>
            </div>
          </Card>
        </Card>
      </div>
    </div>
  );
};

export default TurfCutter;
