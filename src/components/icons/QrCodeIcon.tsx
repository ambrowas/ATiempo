
import React from 'react';

export const QrCodeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className={className} 
        fill="none" 
        viewBox="0 0 24 24" 
        strokeWidth={1.5} 
        stroke="currentColor"
    >
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 15.75h3.375a1.125 1.125 0 011.125 1.125v3.375a1.125 1.125 0 01-1.125 1.125h-3.375" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6.75h.008v.008H6V6.75z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 16.5h.008v.008H6v-.008z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6.75h.008v.008h-.008V6.75z" />
    </svg>
);
