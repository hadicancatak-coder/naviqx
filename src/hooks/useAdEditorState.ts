import { useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/logger";

interface EditorState {
  adId: string | null;
  hasUnsavedChanges: boolean;
  draftData: any;
}

const STORAGE_KEY = "ad_editor_draft";

export function useAdEditorState(adId: string | null) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [draftData, setDraftData] = useState<any>(null);

  // Load draft from localStorage
  useEffect(() => {
    if (adId) {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${adId}`);
      if (stored) {
        try {
          setDraftData(JSON.parse(stored));
          setHasUnsavedChanges(true);
        } catch (error) {
          logger.error("Failed to parse draft data:", error);
        }
      }
    }
  }, [adId]);

  // Save draft to localStorage
  const saveDraft = useCallback(
    (data: any) => {
      if (adId) {
        localStorage.setItem(`${STORAGE_KEY}_${adId}`, JSON.stringify(data));
        setDraftData(data);
        setHasUnsavedChanges(true);
      }
    },
    [adId]
  );

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    if (adId) {
      localStorage.removeItem(`${STORAGE_KEY}_${adId}`);
      setDraftData(null);
      setHasUnsavedChanges(false);
    }
  }, [adId]);

  // Warn before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return {
    hasUnsavedChanges,
    draftData,
    saveDraft,
    clearDraft,
    setHasUnsavedChanges,
  };
}
