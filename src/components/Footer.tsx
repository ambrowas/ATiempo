
import React, { useState, useEffect, useCallback } from 'react';
import { RefreshIcon } from './icons';

const Footer: React.FC = () => {
  const [refran, setRefran] = useState('');
  const [refranes, setRefranes] = useState<{ id: number; refran: string }[]>([]);

  useEffect(() => {
   import('../data/refranes')
      .then(module => setRefranes(module.default))
      .catch(err => console.error("Failed to load refranes:", err));
  }, []);

  const getNewRefran = useCallback(() => {
    if (refranes && refranes.length > 0) {
      const randomIndex = Math.floor(Math.random() * refranes.length);
      setRefran(refranes[randomIndex].refran);
    }
  }, [refranes]);

  useEffect(() => {
    getNewRefran();
  }, [getNewRefran]);

  return (
    <footer className="bg-[#003366] text-white px-6 py-3 flex items-center justify-between border-t-2 border-black h-[56px] flex-shrink-0">
      <div className="flex-1 flex items-center justify-center gap-2">
        <span className="italic">"{refran}"</span>
        <button
          onClick={getNewRefran}
          className="p-1 rounded-full hover:bg-white/20 transition-colors"
          aria-label="Cambiar refrán"
        >
          <RefreshIcon className="h-5 w-5 opacity-80" />
        </button>
      </div>
      <div className="text-right text-xs leading-tight space-y-0.5">
        <div>Version Demo 1.0.0 (Cad: 1/02/2026)</div>
        <div>© 2025 Iniciativas Elebi </div>
      </div>
    </footer>
  );
};


export default Footer;
