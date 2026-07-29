"use client";

import { useState, useEffect } from "react";
import NewReportModal from "./NewReportModal";

export default function GlobalModalProvider() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const handleOpenModal = () => setIsModalOpen(true);
    window.addEventListener('open-new-report', handleOpenModal);
    
    // Also listen for a specific ID-based event if needed by other buttons
    return () => {
      window.removeEventListener('open-new-report', handleOpenModal);
    };
  }, []);

  if (!isModalOpen) return null;

  return (
    <NewReportModal 
      onClose={() => setIsModalOpen(false)} 
    />
  );
}
