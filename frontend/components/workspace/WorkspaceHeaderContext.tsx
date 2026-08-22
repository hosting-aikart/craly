'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface HeaderState {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

interface WorkspaceHeaderContextType {
  headerState: HeaderState;
  setHeaderState: React.Dispatch<React.SetStateAction<HeaderState>>;
}

const WorkspaceHeaderContext = createContext<WorkspaceHeaderContextType | undefined>(undefined);

export function WorkspaceHeaderProvider({ children }: { children: React.ReactNode }) {
  const [headerState, setHeaderState] = useState<HeaderState>({
    title: 'Workspace',
  });

  return (
    <WorkspaceHeaderContext.Provider value={{ headerState, setHeaderState }}>
      {children}
    </WorkspaceHeaderContext.Provider>
  );
}

export function useWorkspaceHeader() {
  const context = useContext(WorkspaceHeaderContext);
  if (!context) {
    throw new Error('useWorkspaceHeader must be used within WorkspaceHeaderProvider');
  }
  return context;
}

export function WorkspacePageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  const { setHeaderState } = useWorkspaceHeader();

  useEffect(() => {
    setHeaderState({ title, subtitle, action });
  }, [title, subtitle, action, setHeaderState]);

  return null;
}
