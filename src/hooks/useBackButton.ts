import { useEffect, useRef } from 'react';
import { ActiveTab } from '../types';

export interface ModalRegistration {
  name: string;
  isOpen: boolean;
  close: () => void;
}

interface BackButtonOptions {
  activeTab?: ActiveTab;
  setActiveTab?: (tab: ActiveTab) => void;
  openModals: ModalRegistration[];
}

/**
 * Handles Android hardware back button and gesture navigation.
 * Closes topmost modal first, then returns to planner tab, then allows exit.
 */
export function useBackButton({ activeTab, setActiveTab, openModals }: BackButtonOptions) {
  const optionsRef = useRef({ activeTab, setActiveTab, openModals });
  optionsRef.current = { activeTab, setActiveTab, openModals };

  const prevOpenCountRef = useRef(0);

  // Push history state whenever a modal opens
  useEffect(() => {
    const currentOpenCount = openModals.filter((m) => m.isOpen).length;
    if (currentOpenCount > prevOpenCountRef.current) {
      window.history.pushState({ kplannerModalOpen: true }, '');
    }
    prevOpenCountRef.current = currentOpenCount;
  }, [openModals]);

  useEffect(() => {
    const handlePopState = () => {
      const { activeTab, setActiveTab, openModals } = optionsRef.current;

      // Close topmost modal
      const opened = [...openModals].reverse().find((m) => m.isOpen);
      if (opened) {
        opened.close();
        return;
      }

      // If on secondary tab, return to planner
      if (activeTab && setActiveTab && activeTab !== 'planner') {
        setActiveTab('planner');
        window.history.pushState({ kplannerTab: 'planner' }, '');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);
}
