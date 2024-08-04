import React from 'react';

interface NotSearchingProps {
  onScan?: () => void;
}

export const NotSearching = ({onScan}: NotSearchingProps) => (
  <button className='run-scan' onClick={onScan}>
    RUN
  </button>
);
