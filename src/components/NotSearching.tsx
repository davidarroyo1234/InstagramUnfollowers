import React, { useRef, useState } from 'react';
import { CancelRequest } from '../model/cancel-request';
import { parsePendingRequests } from '../utils/cancel-requests';

interface NotSearchingProps {
  onScan?: () => void;
  // Pending Requests feature: a parsed pending_follow_requests.json hands the requests up to the app.
  onLoadRequests?: (requests: readonly CancelRequest[]) => void;
}

export const NotSearching = ({ onScan, onLoadRequests }: NotSearchingProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const processFile = (file: File) => {
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const requests = parsePendingRequests(ev.target?.result as string);
        if (requests.length === 0) {
          alert('No pending follow requests found in this file.');
          return;
        }
        onLoadRequests?.(requests);
      } catch (err) {
        alert(`Could not read the file: ${err instanceof Error ? err.message : 'unknown error'}`);
      }
    };
    reader.onerror = () => alert('Failed to read the file');
    reader.readAsText(file);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = ''; // reset so re-picking the same file re-triggers onChange
    if (file) {
      if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
        alert('Please select a .json file (pending_follow_requests.json).');
        return;
      }
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
        alert('Please drop a .json file (pending_follow_requests.json).');
        return;
      }
      processFile(file);
    }
  };

  return (
    <section className="launch-screen">
      <div className="launch-copy">
        <span className="eyebrow">Local account audit</span>
        <h1>Find the follows that do not follow back.</h1>
        <p>
          Scan your Instagram follows, review risk signals, protect whitelisted accounts,
          and act only on the users you select.
        </p>
        <div className="launch-actions">
          <button className="run-scan" onClick={onScan}>
            Run Scan
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden-file-input"
            onChange={handleInput}
          />
          <div
            className={`cr-dropzone ${dragging ? 'cr-dropzone-active' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragEnter={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={e => { e.preventDefault(); setDragging(false); }}
            onDrop={handleDrop}
            role="button"
            tabIndex={0}
          >
            <strong>Manage Pending Requests</strong>
            <span>Drag &amp; drop your <code>pending_follow_requests.json</code></span>
          </div>
        </div>
        <span className="launch-note">Runs in this browser session only</span>
      </div>
      <div className="launch-panel" aria-hidden="true">
        <div className="scan-orbit">
          <span />
          <span />
          <span />
        </div>
        <div className="signal-card primary">
          <span>Ready</span>
          <strong>0%</strong>
        </div>
        <div className="signal-card">
          <span>Protected</span>
          <strong>Whitelist</strong>
        </div>
        <div className="signal-card accent">
          <span>Review</span>
          <strong>Select first</strong>
        </div>
      </div>
    </section>
  );
};
