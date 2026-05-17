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
  
  // Tab Management
  openFiles: string[];
  dirtyFiles: Record<string, boolean>;
  openFile: (path: string) => Promise<void>;
  closeFile: (path: string) => void;
  saveFile: (path: string) => Promise<void>;
  
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
  
  // Tab Management state
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [dirtyFiles, setDirtyFiles] = useState<Record<string, boolean>>({});
  
  // Monaco isolated state refs
  const liveContentRef = useRef('');
  const savedContentsRef = useRef<Record<string, string>>({});
  const liveContentsRef = useRef<Record<string, string>>({});

  // Safe AI Apply state
  const [pendingDiff, setPendingDiff] = useState<{ original: string; modified: string; filePath: string } | null>(null);

  const getLiveContent = () => liveContentRef.current;
  
  const setLiveContent = (content: string) => {
    liveContentRef.current = content;
    if (selectedFilePath) {
      liveContentsRef.current[selectedFilePath] = content;
      
      const baseline = savedContentsRef.current[selectedFilePath] ?? '';
      const isDirty = content !== baseline;
      
      setDirtyFiles((prev) => {
        if (prev[selectedFilePath] === isDirty) return prev;
        return { ...prev, [selectedFilePath]: isDirty };
      });
    }
  };

  const acceptPendingDiff = async () => {
    if (!pendingDiff) return;
    const modified = pendingDiff.modified;
    setFileContent(modified);
    liveContentRef.current = modified;
    if (selectedFilePath) {
      liveContentsRef.current[selectedFilePath] = modified;
      const baseline = savedContentsRef.current[selectedFilePath] ?? '';
      const isDirty = modified !== baseline;
      setDirtyFiles((prev) => ({ ...prev, [selectedFilePath]: isDirty }));
    }
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

  const openFile = async (path: string) => {
    if (!openFiles.includes(path)) {
      try {
        const content = await readFile({ path });
        savedContentsRef.current[path] = content;
        liveContentsRef.current[path] = content;
        setOpenFiles((prev) => [...prev, path]);
      } catch (err) {
        console.error('Failed to open file:', err);
        return;
      }
    }
    setSelectedFilePath(path);
  };

  const closeFile = (path: string) => {
    setOpenFiles((prev) => {
      const next = prev.filter((p) => p !== path);
      delete savedContentsRef.current[path];
      delete liveContentsRef.current[path];
      setDirtyFiles((d) => {
        const nextD = { ...d };
        delete nextD[path];
        return nextD;
      });
      
      if (selectedFilePath === path) {
        if (next.length > 0) {
          setSelectedFilePath(next[next.length - 1]);
        } else {
          setSelectedFilePath(null);
        }
      }
      return next;
    });
  };

  const saveFile = async (path: string) => {
    try {
      const liveVal = liveContentsRef.current[path] ?? '';
      await writeFile({ path, content: liveVal });
      savedContentsRef.current[path] = liveVal;
      
      if (selectedFilePath === path) {
        setFileContent(liveVal);
      }
      
      setDirtyFiles((prev) => ({ ...prev, [path]: false }));
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  };

  const saveCurrentFile = async () => {
    if (selectedFilePath) {
      await saveFile(selectedFilePath);
    }
  };

  // Reset tabs when project changes
  useEffect(() => {
    setOpenFiles([]);
    setDirtyFiles({});
    setSelectedFilePath(null);
    savedContentsRef.current = {};
    liveContentsRef.current = {};
  }, [selectedProjectId]);

  useEffect(() => {
    setPendingDiff(null); // Reset pending diff when switching files
    if (selectedFilePath) {
      const baseline = savedContentsRef.current[selectedFilePath] ?? '';
      const live = liveContentsRef.current[selectedFilePath] ?? '';
      setFileContent(baseline);
      liveContentRef.current = live;
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
        openFiles,
        dirtyFiles,
        openFile,
        closeFile,
        saveFile,
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
