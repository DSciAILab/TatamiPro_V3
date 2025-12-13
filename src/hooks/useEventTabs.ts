"use client";

import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface UseEventTabsResult {
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  configSubTab: string;
  setConfigSubTab: React.Dispatch<React.SetStateAction<string>>;
  inscricoesSubTab: string;
  setInscricoesSubTab: React.Dispatch<React.SetStateAction<string>>;
  bracketsSubTab: string;
  setBracketsSubTab: React.Dispatch<React.SetStateAction<string>>;
  // New state properties for bracket management restoration
  navSelectedMat: string | null;
  navSelectedDivisionId: string | null;
}

export const useEventTabs = (): UseEventTabsResult => {
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('inscricoes');
  const [configSubTab, setConfigSubTab] = useState('event-settings');
  const [inscricoesSubTab, setInscricoesSubTab] = useState('registered-athletes');
  const [bracketsSubTab, setBracketsSubTab] = useState('mat-distribution');
  
  // New state properties derived from navigation state
  const [navSelectedMat, setNavSelectedMat] = useState<string | null>(null);
  const [navSelectedDivisionId, setNavSelectedDivisionId] = useState<string | null>(null);

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
    if (location.state?.configSubTab) {
      setConfigSubTab(location.state.configSubTab);
    }
    if (location.state?.inscricoesSubTab) {
      setInscricoesSubTab(location.state.inscricoesSubTab);
    }
    if (location.state?.bracketsSubTab) {
      setBracketsSubTab(location.state.bracketsSubTab);
    }
    
    // Capture and reset navigation state for Mat/Division selection
    if (location.state?.selectedMat) {
      setNavSelectedMat(location.state.selectedMat);
    } else {
      setNavSelectedMat(null);
    }
    if (location.state?.selectedDivisionId) {
      setNavSelectedDivisionId(location.state.selectedDivisionId);
    } else {
      setNavSelectedDivisionId(null);
    }
  }, [location.state]);

  return {
    activeTab,
    setActiveTab,
    configSubTab,
    setConfigSubTab,
    inscricoesSubTab,
    setInscricoesSubTab,
    bracketsSubTab,
    setBracketsSubTab,
    navSelectedMat,
    navSelectedDivisionId,
  };
};