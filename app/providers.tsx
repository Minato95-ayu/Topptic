'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { getBackendStatus, listProjects, readFile, writeFile } from '@/app/lib/backend';
import type { BackendStatus, Project } from '@/app/lib/types';

interface AppContextType {
  activeNav: string;
  setActiveNav: (id: string) => void;
  backendStatus: BackendStatus | null;
  projects: Project[];
  refreshProjects: () => Promise<void>;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  selectedFilePath: string | null;
  setSelectedFilePath: (path: string | null) => void;
  fileContent: string;
  setFileContent: (content: string) => void;
  saveCurrentFile: () => Promise<void>;
  
  // High-performance isolated editor states
  getLiveContent: () => string;
  setLiveContent: (content: string) => void;

  // Safe AI Apply UX states
  pendingDiff: { original: string; modified: string; filePath: string } | null;
  setPendingDiff: (diff: { original: string; modified: string; filePath: string } | null) => void;
  acceptPendingDiff: () => Promise<void>;
  rejectPendingDiff: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function Providers({ children }: { children: ReactNode }) {
  const [activeNav, setActiveNav] = useState('projects');
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  
  // Monaco live isolated state
  const liveContentRef = useRef('');

  // Safe AI Apply state
  const [pendingDiff, setPendingDiff] = useState<{ original: string; modified: string; filePath: string } | null>(null);

  const getLiveContent = () => liveContentRef.current;
  const setLiveContent = (content: string) => {
    liveContentRef.current = content;
  };

  const acceptPendingDiff = async () => {
    if (!pendingDiff) return;
    const modified = pendingDiff.modified;
    setFileContent(modified);
    liveContentRef.current = modified;
    setPendingDiff(null);
  };

  const rejectPendingDiff = () => {
    setPendingDiff(null);
  };

  const refreshProjects = async () => {
    try {
      const data = await listProjects();
      setProjects(data);
      if (data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data[0].id);
      }
    } catch (error) {
      console.error('Failed to list projects:', error);
    }
  };

  const saveCurrentFile = async () => {
    if (!selectedFilePath) return;
    try {
      const currentContent = liveContentRef.current;
      await writeFile({ path: selectedFilePath, content: currentContent });
      // Update baseline state to synchronize UI/dirty state
      setFileContent(currentContent);
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  };

  useEffect(() => {
    setPendingDiff(null); // Reset pending diff when switching files
    if (selectedFilePath) {
      void readFile({ path: selectedFilePath }).then((content) => {
        setFileContent(content);
        liveContentRef.current = content;
      });
    } else {
      setFileContent('');
      liveContentRef.current = '';
    }
  }, [selectedFilePath]);

  useEffect(() => {
    // Initial fetch
    void refreshProjects();
    
    // Poll backend status
    const fetchStatus = async () => {
      const status = await getBackendStatus();
      setBackendStatus(status);
    };
    
    void fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AppContext.Provider
      value={{
        activeNav,
        setActiveNav,
        backendStatus,
        projects,
        refreshProjects,
        selectedProjectId,
        setSelectedProjectId,
        selectedFilePath,
        setSelectedFilePath,
        fileContent,
        setFileContent,
        saveCurrentFile,
        getLiveContent,
        setLiveContent,
        pendingDiff,
        setPendingDiff,
        acceptPendingDiff,
        rejectPendingDiff,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
