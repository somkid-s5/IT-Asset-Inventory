'use client';

import { useEffect, useMemo, useRef } from 'react';

export function useUnsavedChanges(open: boolean, value: unknown) {
  const snapshot = useMemo(() => JSON.stringify(value), [value]);
  const initialSnapshot = useRef(snapshot);
  const wasOpen = useRef(false);
  const isDirtyRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpen.current) {
      initialSnapshot.current = snapshot;
      isDirtyRef.current = false;
    } else if (open) {
      isDirtyRef.current = initialSnapshot.current !== snapshot;
    } else {
      isDirtyRef.current = false;
    }
    wasOpen.current = open;
  }, [open, snapshot]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, []);

  return {
    confirmDiscard: () => !isDirtyRef.current || window.confirm('You have unsaved changes. Discard them?'),
  };
}
