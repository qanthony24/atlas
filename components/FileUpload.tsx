import React, { useEffect, useMemo, useRef, useState, useContext } from 'react';
import { AppContext } from './AppContext';
import { JobStatus } from '../types';
import { ClockIcon, CheckCircleIcon, XCircleIcon, DocumentIcon } from '@heroicons/react/24/outline';

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
      setError(`File is too large (${(f.size / 1024 / 1024).toFixed(2)}MB). Limit is ${(MAX_FILE_SIZE_BYTES / 1024 / 1024).toFixed(0)}MB.`);
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
        setError('Heads up: this looks like the same file you uploaded before. Re-importing will update voter records but won’t duplicate canvassing interactions.');
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
    if (phase === 'writing_voters' && hasCounts) return `Adding ${processedRows.toLocaleString()} / ${totalRows.toLocaleString()} voters to your universe…`;
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl h-[70vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-2xl font-bold">Voter Import</h2>
        </div>

        {jobStatus === 'completed' ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircleIcon className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Import Successful</h3>
            <p className="text-gray-600 mb-8">Your file was processed by the worker.</p>
            <button onClick={onClose} className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium">Close</button>
          </div>
        ) : uploading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <ClockIcon className="h-12 w-12 text-indigo-500 animate-spin mb-4" />
            <h3 className="text-xl font-bold text-gray-800">Voter import in progress</h3>
            <p className="text-gray-600 mt-2">{primaryText}</p>

            {etaText && <p className="text-sm text-gray-500 mt-1">{etaText}</p>}
            {secondaryText && <p className="text-xs text-gray-400 mt-2 max-w-md">{secondaryText}</p>}

            <p className="text-xs text-gray-300 mt-3">Job ID: {jobId}</p>

            <div className="w-80 bg-gray-200 rounded-full h-2.5 mt-5 overflow-hidden">
              {pct === null ? (
                <div className="bg-indigo-600 h-2.5 rounded-full w-2/3 animate-pulse"></div>
              ) : (
                <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${pct}%` }}></div>
              )}
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium shadow-sm"
              >
                Close
              </button>
              <button
                onClick={() => {
                  if (jobId) {
                    pollAttemptRef.current += 1;
                    void pollJob(jobId);
                  }
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium shadow-sm"
              >
                Refresh status
              </button>
            </div>

            <p className="text-xs text-gray-400 mt-4">We’ll keep checking in automatically every few seconds.</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
                <XCircleIcon className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
                <div className="text-sm text-red-700">
                  <span className="font-bold">Import Error:</span> {error}
                </div>
              </div>
            )}

            <div className="flex-1 flex flex-col justify-center">
              <div className="p-4 bg-gray-50 border-l-4 border-indigo-400 text-sm text-gray-600 mb-4 rounded-r-md">
                <h4 className="font-bold text-gray-800 mb-1 flex items-center">
                  <DocumentIcon className="h-4 w-4 mr-1" /> Requirements
                </h4>
                <ul className="list-disc ml-5 space-y-1">
                  <li>CSV or XLSX</li>
                  <li>Max Size: {(MAX_FILE_SIZE_BYTES / 1024 / 1024).toFixed(0)}MB</li>
                  <li>Import runs asynchronously (you can keep using the app)</li>
                </ul>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center hover:bg-gray-50 transition-colors">
                <p className="mb-4 text-gray-600">Select a voter file to upload.</p>
                <input type="file" accept=".csv,.xlsx" onChange={handleFileChange} className="hidden" id="file-upload" />
                <label htmlFor="file-upload" className="cursor-pointer px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                  Browse Files
                </label>
                {file && (
                  <div className="mt-4 text-sm text-gray-700">
                    Selected: <span className="font-semibold">{file.name}</span> ({(file.size / 1024 / 1024).toFixed(2)}MB)
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-4 flex-shrink-0 pt-4 border-t border-gray-100">
              <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium shadow-sm">Cancel</button>
              <button
                onClick={startImport}
                disabled={!file}
                className="px-6 py-2 text-white rounded-md font-medium shadow-md transition-all bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg disabled:opacity-50"
              >
                Upload & Start Import
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
