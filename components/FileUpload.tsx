import React, { useEffect, useMemo, useRef, useState, useContext } from 'react';
import { AppContext } from './AppContext';
import { JobStatus } from '../types';
import { ClockIcon, CheckCircleIcon, XCircleIcon, DocumentIcon } from '@heroicons/react/24/outline';
import { Card } from '../src/design/components/Card';
import { Button } from '../src/design/components/Button';

/**
 * Phase 2 hardening note:
 * For real operations, voters should be imported by uploading the raw file (CSV/XLSX)
 * and letting the backend worker process it asynchronously.
 *
 * This component intentionally avoids client-side parsing/mapping (which is brittle and
 * browser-limited) and instead mirrors the production flow.
 */

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB (backend + object storage are the real limit)

interface FileUploadProps {
  onClose: () => void;
  onComplete?: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onClose, onComplete }) => {
  const context = useContext(AppContext);

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobMeta, setJobMeta] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [lastUpdateMs, setLastUpdateMs] = useState<number | null>(null);

  // Polling backoff
  const pollAttemptRef = useRef(0);
  const pollTimerRef = useRef<number | null>(null);
  const processedHistoryRef = useRef<Array<{ t: number; p: number }>>([]);

  if (!context) return null;

  const clearPollTimer = () => {
    if (pollTimerRef.current) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const scheduleNextPoll = (id: string) => {
    const attempt = pollAttemptRef.current;

    // Fast for the first ~15s, then back off.
    // (Keeps UX snappy, reduces backend log spam.)
    const delayMs = attempt < 10 ? 1000 : attempt < 20 ? 2500 : 8000;

    clearPollTimer();
    pollTimerRef.current = window.setTimeout(() => {
      pollAttemptRef.current += 1;
      void pollJob(id);
    }, delayMs);
  };

  const pollJob = async (id: string) => {
    try {
      const job: any = await context.client.getJob(id);
      setJobStatus(job.status);
      setJobMeta(job.metadata || null);
      setLastUpdateMs(Date.now());

      // Capture progress history for ETA estimation (only if backend provides real counts)
      const progress = job?.metadata?.progress;
      const processed = Number(progress?.processed_rows);
      if (Number.isFinite(processed)) {
        const now = Date.now();
        processedHistoryRef.current.push({ t: now, p: processed });
        // Keep last ~60s
        processedHistoryRef.current = processedHistoryRef.current.filter((x) => now - x.t <= 60_000);
      }

      if (job.status === 'completed') {
        clearPollTimer();
        setUploading(false);
        if (onComplete) onComplete();
      } else if (job.status === 'failed') {
        clearPollTimer();
        setUploading(false);
        setError(job.error || 'Import failed');
      } else {
        scheduleNextPoll(id);
      }
    } catch (e: any) {
      clearPollTimer();
      setUploading(false);
      setError(e?.message || 'Lost connection while checking your import job');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const f = e.target.files?.[0] || null;
    if (!f) return;

    if (f.size > MAX_FILE_SIZE_BYTES) {
      setError(
        `File is too large (${(f.size / 1024 / 1024).toFixed(2)}MB). Limit is ${(MAX_FILE_SIZE_BYTES / 1024 / 1024).toFixed(0)}MB.`
      );
      return;
    }

    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (!['csv', 'xlsx'].includes(ext)) {
      setError('Please upload a .csv or .xlsx file');
      return;
    }

    setFile(f);
  };

  const startImport = async () => {
    if (!file) return;
    setUploading(true);
    setJobStatus('pending');
    setJobMeta(null);
    setError(null);
    setStartedAtMs(Date.now());
    setLastUpdateMs(Date.now());
    pollAttemptRef.current = 0;
    processedHistoryRef.current = [];

    try {
      const job: any = await context.client.uploadVotersFile(file);
      setJobId(job.id);

      if (job?.duplicate_of_job_id) {
        setError(
          'Heads up: this looks like the same file you uploaded before. Re-importing will update voter records but won’t duplicate canvassing interactions.'
        );
      }

      void pollJob(job.id);
    } catch (e: any) {
      clearPollTimer();
      setUploading(false);
      setJobStatus('failed');
      setError(e?.message || 'Failed to start import');
    }
  };

  const msToClock = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${mm}:${String(ss).padStart(2, '0')}`;
  };

  const progress = jobMeta?.progress;
  const phase = String(progress?.phase || jobStatus || '').trim();
  const processedRows = Number(progress?.processed_rows);
  const totalRows = Number(progress?.total_rows);

  const hasCounts = Number.isFinite(processedRows) && Number.isFinite(totalRows) && totalRows > 0;
  const pct = hasCounts ? Math.min(99, Math.max(0, Math.floor((processedRows / totalRows) * 100))) : null;

  const primaryText = useMemo(() => {
    if (!uploading) return '';

    // Campaign/field organizer friendly language
    if (phase === 'writing_voters' && hasCounts)
      return `Adding ${processedRows.toLocaleString()} / ${totalRows.toLocaleString()} voters to your universe…`;
    if (phase === 'finalizing') return 'Finalizing voter import…';
    if (phase === 'parsing_rows') return 'Checking rows and matching columns…';
    if (phase === 'reading_file') return 'Reading your file…';
    if (phase === 'starting') return 'Getting your import ready…';

    // fallback by status
    if (jobStatus === 'pending') return 'Import queued—worker is picking it up…';
    if (jobStatus === 'processing') return 'Building your voter universe…';

    return 'Working on your voter import…';
  }, [uploading, phase, hasCounts, processedRows, totalRows, jobStatus]);

  const secondaryText = useMemo(() => {
    if (!uploading) return '';

    const startedAgo = startedAtMs ? msToClock(Date.now() - startedAtMs) : null;
    const lastUpdateAgo = lastUpdateMs ? msToClock(Date.now() - lastUpdateMs) : null;

    const parts: string[] = [];
    if (startedAgo) parts.push(`Started ${startedAgo} ago`);
    if (lastUpdateAgo) parts.push(`Last check-in ${lastUpdateAgo} ago`);

    // Gentle reassurance if it’s taking a bit
    if (startedAtMs && Date.now() - startedAtMs > 60_000) {
      parts.push('Big lists can take a few minutes. You can close this window and keep working.');
    }

    return parts.join(' • ');
  }, [uploading, startedAtMs, lastUpdateMs]);

  const etaText = useMemo(() => {
    if (!uploading) return null;
    if (!hasCounts) return null;

    // Need at least 2 samples to estimate throughput
    const hist = processedHistoryRef.current;
    if (hist.length < 2) return null;

    const first = hist[0];
    const last = hist[hist.length - 1];
    const dp = last.p - first.p;
    const dt = (last.t - first.t) / 1000;

    if (dt <= 0 || dp <= 0) return null;

    const rowsPerSec = dp / dt;
    const remaining = Math.max(0, totalRows - processedRows);
    const etaSec = remaining / rowsPerSec;

    // Avoid showing jittery ETAs for very small remaining times
    if (!Number.isFinite(etaSec) || etaSec < 5) return null;

    const etaMs = etaSec * 1000;
    return `Est. ${msToClock(etaMs)} remaining`;
  }, [uploading, hasCounts, totalRows, processedRows]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => clearPollTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="atlas-modal-overlay" role="dialog" aria-modal="true">
      <Card className="atlas-modal" style={{ padding: 0, maxWidth: 840 }}>
        <div className="atlas-modal-header">
          <div>
            <div className="atlas-label">Import</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 18 }}>Voter Import</div>
          </div>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="atlas-modal-body">
          {jobStatus === 'completed' ? (
            <div style={{ padding: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <CheckCircleIcon style={{ width: 22, height: 22, color: 'var(--color-action)' }} />
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16 }}>Import Successful</div>
              </div>
              <div className="atlas-help">Your file was processed by the worker.</div>
            </div>
          ) : uploading ? (
            <div style={{ padding: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ClockIcon style={{ width: 18, height: 18, color: 'var(--color-primary)' }} />
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16 }}>Import in progress</div>
              </div>
              <div className="atlas-help" style={{ marginTop: 6 }}>
                {primaryText}
              </div>
              {etaText ? (
                <div className="atlas-help" style={{ marginTop: 4 }}>
                  {etaText}
                </div>
              ) : null}
              {secondaryText ? (
                <div className="atlas-help" style={{ marginTop: 6, opacity: 0.75 }}>
                  {secondaryText}
                </div>
              ) : null}

              <div className="atlas-help atlas-mono" style={{ marginTop: 10, opacity: 0.65 }}>
                Job: {jobId || '—'}
              </div>

              <div className="atlas-card" style={{ marginTop: 12, padding: 10 }}>
                <div
                  style={{
                    height: 10,
                    borderRadius: 999,
                    background: 'rgba(209, 217, 224, 0.65)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: 10,
                      width: pct === null ? '66%' : `${pct}%`,
                      background: 'var(--color-action)',
                      transition: 'width 250ms ease',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (jobId) {
                      pollAttemptRef.current += 1;
                      void pollJob(jobId);
                    }
                  }}
                >
                  Refresh status
                </Button>
              </div>

              <div className="atlas-help" style={{ marginTop: 10, opacity: 0.75 }}>
                We’ll keep checking in automatically.
              </div>
            </div>
          ) : (
            <>
              {error ? (
                <div className="atlas-error" style={{ marginBottom: 12, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <XCircleIcon style={{ width: 18, height: 18 }} />
                  <div>
                    <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>Import error</div>
                    <div className="atlas-help" style={{ marginTop: 4, opacity: 0.9 }}>
                      {error}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="atlas-card" style={{ padding: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <DocumentIcon style={{ width: 16, height: 16 }} />
                  <div className="atlas-label">Requirements</div>
                </div>
                <ul className="atlas-help" style={{ marginTop: 8, marginLeft: 18 }}>
                  <li>CSV or XLSX</li>
                  <li>Max Size: {(MAX_FILE_SIZE_BYTES / 1024 / 1024).toFixed(0)}MB</li>
                  <li>Import runs asynchronously (you can keep using the app)</li>
                </ul>
              </div>

              <Card style={{ padding: 16 }}>
                <div className="atlas-help" style={{ marginBottom: 10 }}>
                  Select a voter file to upload.
                </div>
                <input type="file" accept=".csv,.xlsx" onChange={handleFileChange} style={{ display: 'block' }} />
                {file ? (
                  <div className="atlas-help" style={{ marginTop: 10 }}>
                    Selected: <span className="atlas-mono">{file.name}</span> ({(file.size / 1024 / 1024).toFixed(2)}MB)
                  </div>
                ) : null}
              </Card>
            </>
          )}
        </div>

        <div className="atlas-modal-footer">
          {jobStatus === 'completed' ? (
            <Button variant="primary" onClick={onClose}>
              Done
            </Button>
          ) : uploading ? (
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" onClick={startImport} disabled={!file}>
                Upload & Start Import
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default FileUpload;
