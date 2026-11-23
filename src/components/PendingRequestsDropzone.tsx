import React, { useRef, useState } from 'react';
import { Language, t } from '../utils/i18n';
import { CancelRequest } from '../model/cancel-request';
import { parsePendingRequests } from '../utils/cancel-requests';

interface PendingRequestsDropzoneProps {
  lang: Language;
  // A parsed pending_follow_requests.json hands the requests up to the app.
  onLoadRequests?: (requests: readonly CancelRequest[]) => void;
}

// Pending Requests feature: drop or pick the pending_follow_requests.json from the Instagram export.
export const PendingRequestsDropzone = ({ lang, onLoadRequests }: PendingRequestsDropzoneProps) => {
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
          alert(t(lang, "noPendingRequestsFound"));
          return;
        }
        onLoadRequests?.(requests);
      } catch (err) {
        alert(t(lang, "couldNotReadFile", err instanceof Error ? err.message : t(lang, "unknownError")));
      }
    };
    reader.onerror = () => alert(t(lang, "failedToReadFile"));
    reader.readAsText(file);
  };

  const isJsonFile = (file: File) =>
    file.name.toLowerCase().endsWith('.json') || file.type === 'application/json';

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = ''; // reset so re-picking the same file re-triggers onChange
    if (file) {
      if (!isJsonFile(file)) {
        alert(t(lang, "selectJsonFile"));
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
      if (!isJsonFile(file)) {
        alert(t(lang, "dropJsonFile"));
        return;
      }
      processFile(file);
    }
  };

  return (
    <>
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
      <strong>{t(lang, "managePendingRequests")}</strong>
      <span>{t(lang, "dragDropPendingJson")} <code>pending_follow_requests.json</code></span>
    </div>
    </>
  );
};
