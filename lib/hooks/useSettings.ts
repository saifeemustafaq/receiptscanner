'use client';

import { useEffect, useState } from 'react';
import type { MutationResult } from '@/lib/types';

export type AIProvider = 'gemini' | 'openai';

export interface ProviderOption {
  id: AIProvider;
  label: string;
  model: string;
  description: string;
}

/**
 * Client-safe provider metadata (mirrors PROVIDERS in lib/ai, kept separate to
 * avoid pulling server-only SDKs into the client bundle).
 */
export const PROVIDER_OPTIONS: ProviderOption[] = [
  {
    id: 'gemini',
    label: 'Google Gemini',
    model: 'gemini-2.0-flash-exp',
    description: 'Requires GEMINI_API_KEY in .env.local',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    model: 'gpt-4o',
    description: 'Requires OPENAI_API_KEY in .env.local',
  },
];

// Canonical fallback default. Matches the seeded server default
// (`settingsStorage.DEFAULT_SETTINGS.aiProvider`) so client and server agree
// before a setting is persisted. The user's active selection is loaded from
// /api/settings and can be switched in Settings.
const DEFAULT_PROVIDER: AIProvider = 'openai';

export function useSettings() {
  const [aiProvider, setAIProvider] = useState<AIProvider>(DEFAULT_PROVIDER);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      if (typeof window === 'undefined') return;

      const response = await fetch('/api/settings');
      const data = await response.json();

      if (data.success && data.settings?.aiProvider) {
        setAIProvider(data.settings.aiProvider);
      } else {
        setAIProvider(DEFAULT_PROVIDER);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setAIProvider(DEFAULT_PROVIDER);
    } finally {
      setIsLoading(false);
    }
  };

  const setProvider = async (provider: AIProvider): Promise<MutationResult> => {
    // Optimistic update so the radio responds immediately
    const previous = aiProvider;
    setAIProvider(provider);

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiProvider: provider }),
      });

      const data = await response.json();

      if (data.success && data.settings?.aiProvider) {
        setAIProvider(data.settings.aiProvider);
        return { success: true };
      }
      console.error('Failed to update provider:', data.error);
      setAIProvider(previous);
      return { success: false, error: data.error || 'Failed to update provider' };
    } catch (error) {
      console.error('Error updating provider:', error);
      setAIProvider(previous);
      return { success: false, error: 'Failed to update provider' };
    }
  };

  return {
    aiProvider,
    setProvider,
    isLoading,
    reload: loadSettings,
  };
}
