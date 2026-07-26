import { NextRequest, NextResponse } from 'next/server';
import { getSettings, saveSettings, isValidProvider } from '@/lib/settingsStorage';

export const runtime = 'nodejs';

/**
 * GET /api/settings - Get application settings
 */
export async function GET() {
  try {
    const settings = getSettings();
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings - Update application settings
 */
export async function PUT(request: NextRequest) {
  try {
    const { aiProvider } = await request.json();

    if (!isValidProvider(aiProvider)) {
      return NextResponse.json(
        { success: false, error: 'Invalid aiProvider. Must be "gemini" or "openai".' },
        { status: 400 }
      );
    }

    const current = getSettings();
    const success = saveSettings({ ...current, aiProvider });

    if (success) {
      const settings = getSettings();
      return NextResponse.json({
        success: true,
        settings,
        message: 'Settings updated successfully',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
