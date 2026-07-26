import fs from 'fs';
import path from 'path';

export type AIProvider = 'gemini' | 'openai';

export const AI_PROVIDERS: AIProvider[] = ['gemini', 'openai'];

export interface AppSettings {
  aiProvider: AIProvider;
}

const DEFAULT_SETTINGS: AppSettings = {
  aiProvider: 'openai',
};

/**
 * Get settings data directory
 */
export function getSettingsDataDir(): string {
  return path.join(process.cwd(), 'data', 'settings');
}

/**
 * Ensure data directory exists
 */
export function ensureSettingsDataDirExists(): void {
  const dir = getSettingsDataDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Type guard for a valid AI provider value
 */
export function isValidProvider(value: unknown): value is AIProvider {
  return typeof value === 'string' && (AI_PROVIDERS as string[]).includes(value);
}

/**
 * Get application settings from JSON file
 */
export function getSettings(): AppSettings {
  ensureSettingsDataDirExists();
  const filePath = path.join(getSettingsDataDir(), 'settings_data.json');

  if (!fs.existsSync(filePath)) {
    // If file doesn't exist, initialize with defaults
    saveSettings(DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(fileContent);
    return {
      aiProvider: isValidProvider(parsed?.aiProvider)
        ? parsed.aiProvider
        : DEFAULT_SETTINGS.aiProvider,
    };
  } catch (error) {
    console.error('Error reading settings data:', error);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Save application settings to JSON file
 */
export function saveSettings(settings: AppSettings): boolean {
  ensureSettingsDataDirExists();
  const filePath = path.join(getSettingsDataDir(), 'settings_data.json');

  try {
    const safeSettings: AppSettings = {
      aiProvider: isValidProvider(settings.aiProvider)
        ? settings.aiProvider
        : DEFAULT_SETTINGS.aiProvider,
    };
    fs.writeFileSync(filePath, JSON.stringify(safeSettings, null, 2), 'utf-8');
    console.log(`✅ Saved settings (aiProvider: ${safeSettings.aiProvider})`);
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
}

/**
 * Update the active AI provider preference
 */
export function setAIProvider(provider: AIProvider): boolean {
  const current = getSettings();
  return saveSettings({ ...current, aiProvider: provider });
}
