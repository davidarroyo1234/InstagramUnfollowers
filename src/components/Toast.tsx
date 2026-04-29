import React from 'react';

interface ToastProps {
    show?: boolean;
    style?: 'success' | 'error' | 'warning' | 'info';
    message: string;
    onClose?: () => void;
}

/**
 * Komponen toast sederhana untuk menampilkan informasi singkat (mis. saat tool menunggu/delay).
 */
export const Toast = ({ show = false, style = 'info', message, onClose }: ToastProps) => (
    <div className={`toast ${show ? 'show' : ''} ${style}`} role='alert'>
        <p className='toast__message'>{message}</p>
        <button className='toast__close-button' onClick={onClose} title='tutup'>&times;</button>
    </div>
);
