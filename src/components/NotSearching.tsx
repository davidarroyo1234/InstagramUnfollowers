import React from 'react';

interface NotSearchingProps {
  onScan?: () => void;
}

/**
 * Layar awal sebelum scanning dimulai.
 * Tombol ini mengubah state app dari "initial" -> "scanning".
 */
export const NotSearching = ({onScan}: NotSearchingProps) => (
  <button className='run-scan' onClick={onScan}>
    MULAI
  </button>
);
