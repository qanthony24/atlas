import React, { useState, useContext } from 'react';
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
  const [error, setError] = useState<string | null>(null);

  if (!context) return null;

  const pollJob = async (id: string) => {
    try {
      const job = await context.client.getJob(id);
      setJobStatus(job.status);

      if (job.status === 'completed') {
        setUploading(false);
        if (onComplete) onComplete();
      } else if (job.status === 'failed') {
        setUploading(false);
        setError(job.error || 'Import failed');
      } else {
        setTimeout(() => pollJob(id), 1000);
      }
    } catch (e: any) {
      setUploading(false);
      setError(e?.message || 'Lost connection while polling job');
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
    setError(null);

    try {
      const job = await context.client.uploadVotersFile(file);
      setJobId(job.id);
      pollJob(job.id);
    } catch (e: any) {
      setUploading(false);
      setJobStatus('failed');
      setError(e?.message || 'Failed to start import');
    }
  };

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
            <h3 className="text-xl font-bold text-gray-800">Processing Import Job</h3>
            <p className="text-gray-500 mt-2">Job ID: {jobId}</p>
            <p className="text-sm text-gray-400 mt-1">Status: {jobStatus?.toUpperCase()}...</p>
            <div className="w-64 bg-gray-200 rounded-full h-2.5 mt-4">
              <div className="bg-indigo-600 h-2.5 rounded-full w-2/3 animate-pulse"></div>
            </div>
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
