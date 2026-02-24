import React, { useContext, useEffect, useRef } from 'react';
import { AppContext } from './AppContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { PageHeader } from '../src/design/components/PageHeader';
import { Card } from '../src/design/components/Card';
import { atlasTokens } from '../src/design/tokens';

declare const google: any;

const LiveTracking: React.FC = () => {
  const context = useContext(AppContext);
  const { location, getLocation } = useGeolocation();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  // Initialize Map
  useEffect(() => {
    if (mapRef.current && !mapInstance.current && typeof google !== 'undefined') {
      mapInstance.current = new google.maps.Map(mapRef.current, {
        center: { lat: 40.73061, lng: -73.935242 }, // default
        zoom: 11,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
      });
    }
  }, []);

  if (!context) return null;
  const { interactions, voters, canvassers } = context;

  // Update Markers
  useEffect(() => {
    if (!mapInstance.current || typeof google === 'undefined') return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    let hasPoints = false;

    // 1. Plot Canvassers (Action token)
    canvassers.forEach((c) => {
      if (!c.location) return;

      const marker = new google.maps.Marker({
        position: c.location,
        map: mapInstance.current,
        title: c.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: atlasTokens.color.action,
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: '#FFFFFF',
        },
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `<div style="padding:4px; font-weight:bold;">${c.name}</div>`,
      });
      marker.addListener('click', () => infoWindow.open(mapInstance.current, marker));

      markersRef.current.push(marker);
      bounds.extend(c.location);
      hasPoints = true;
    });

    // 2. Plot Current User (Critical token)
    if (location) {
      const marker = new google.maps.Marker({
        position: location,
        map: mapInstance.current,
        title: 'You',
        zIndex: 999,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: atlasTokens.color.critical,
          fillOpacity: 1,
          strokeWeight: 3,
          strokeColor: '#FFFFFF',
        },
      });
      markersRef.current.push(marker);
      bounds.extend(location);
      hasPoints = true;
    }

    if (hasPoints) {
      mapInstance.current.fitBounds(bounds);
      const listener = google.maps.event.addListener(mapInstance.current, 'idle', () => {
        if (mapInstance.current.getZoom() > 15) mapInstance.current.setZoom(15);
        google.maps.event.removeListener(listener);
      });
    }
  }, [canvassers, location]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 6rem)' }}>
      <PageHeader title="Real-Time Monitoring" />

      <div style={{ marginTop: 16, flex: 1, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, minHeight: 0 }}>
        {/* Live Map */}
        <Card style={{ position: 'relative', overflow: 'hidden', minHeight: 0 }}>
          <div className="atlas-card" style={{ position: 'absolute', top: 12, left: 12, zIndex: 10, padding: 10 }}>
            <div className="atlas-label">Live field view</div>
            <div className="atlas-help" style={{ marginTop: 4 }}>
              <span className="atlas-chip atlas-chip--party-dem">Canvasser</span> <span className="atlas-chip atlas-chip--lead">You</span>
            </div>
          </div>

          <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: 420, background: 'rgba(209, 217, 224, 0.25)' }} />
        </Card>

        {/* Live Interaction Feed */}
        <Card style={{ padding: 16, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div className="atlas-label">Feed</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16, marginTop: 4 }}>Live Feed</div>
            </div>
            <span className="atlas-chip atlas-chip--registered">Live</span>
          </div>

          <div style={{ overflow: 'auto', paddingRight: 4, display: 'grid', gap: 10 }}>
            {interactions
              .slice()
              .reverse()
              .map((interaction) => {
                const voter = voters.find((v) => v.id === interaction.voter_id);
                const canvasser = canvassers.find((c) => c.id === interaction.user_id);

                const resultColor =
                  interaction.result_code === 'contacted'
                    ? 'atlas-chip--status-contacted'
                    : interaction.result_code === 'not_home'
                      ? 'atlas-chip--status-not-home'
                      : 'atlas-chip--status-refused';

                return (
                  <Card key={interaction.id} style={{ padding: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                        {canvasser?.name || 'Unknown'}
                      </div>
                      <div className="atlas-help" style={{ opacity: 0.7 }}>
                        Just now
                      </div>
                    </div>

                    <div className="atlas-help" style={{ marginTop: 6 }}>
                      Recorded{' '}
                      <span className={['atlas-chip', resultColor].join(' ')} style={{ marginLeft: 6 }}>
                        {interaction.result_code.replace('_', ' ')}
                      </span>{' '}
                      for {voter?.firstName} {voter?.lastName}
                    </div>

                    {interaction.notes ? (
                      <div className="atlas-help" style={{ marginTop: 8, fontStyle: 'italic' }}>
                        “{interaction.notes}”
                      </div>
                    ) : null}
                  </Card>
                );
              })}

            {interactions.length === 0 ? (
              <div className="atlas-help" style={{ textAlign: 'center', padding: 16, opacity: 0.8 }}>
                Waiting for field activity…
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LiveTracking;
