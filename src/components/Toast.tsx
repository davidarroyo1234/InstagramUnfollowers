import React from 'react';

interface ToastProps {
    show?: boolean;
    style?: 'success' | 'error' | 'warning' | 'info';
    message: string;
    onClose?: () => void;
}

export const Toast = ({ show = false, style = 'info', message, onClose }: ToastProps) => (
    <div className={`toast ${show ? 'show' : ''} ${style}`} role='alert'>
        <p className='toast__message'>{message}</p>
        <button className='toast__close-button' onClick={onClose} title='close'>&times;</button>
    </div>
);
