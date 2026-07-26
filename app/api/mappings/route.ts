import { NextRequest, NextResponse } from 'next/server';
import {
  getAllMappings,
  addMapping,
  deleteMapping,
  saveAllMappings,
} from '@/lib/mappingsStorage';
import type { ItemMapping } from '@/lib/itemMappings';

export const runtime = 'nodejs';

/**
 * GET /api/mappings - Get all item mappings
 */
export async function GET() {
  try {
    const mappings = getAllMappings();
    return NextResponse.json({ success: true, mappings });
  } catch (error) {
    console.error('Error fetching mappings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch mappings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mappings - Add or update a mapping (raw name -> canonical name)
 */
export async function POST(request: NextRequest) {
  try {
    const { rawName, canonicalName } = await request.json();

    if (!rawName || typeof rawName !== 'string' || !rawName.trim()) {
      return NextResponse.json(
        { success: false, error: 'rawName is required' },
        { status: 400 }
      );
    }

    if (
      !canonicalName ||
      typeof canonicalName !== 'string' ||
      !canonicalName.trim()
    ) {
      return NextResponse.json(
        { success: false, error: 'canonicalName is required' },
        { status: 400 }
      );
    }

    const success = addMapping(rawName, canonicalName);

    if (success) {
      const mappings = getAllMappings();
      return NextResponse.json({
        success: true,
        mappings,
        message: 'Mapping saved successfully',
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid mapping (raw name already equals canonical) or failed to save',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error saving mapping:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save mapping' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/mappings?normalizedRaw=... - Delete a mapping by its key
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const normalizedRaw = searchParams.get('normalizedRaw');

    if (!normalizedRaw) {
      return NextResponse.json(
        { success: false, error: 'normalizedRaw is required' },
        { status: 400 }
      );
    }

    const success = deleteMapping(normalizedRaw);

    if (success) {
      const mappings = getAllMappings();
      return NextResponse.json({
        success: true,
        mappings,
        message: 'Mapping deleted successfully',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Mapping not found or failed to delete' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error deleting mapping:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete mapping' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/mappings - Replace the full mapping list (bulk update / clear)
 */
export async function PUT(request: NextRequest) {
  try {
    const { mappings } = await request.json();

    if (!Array.isArray(mappings)) {
      return NextResponse.json(
        { success: false, error: 'mappings must be an array' },
        { status: 400 }
      );
    }

    const success = saveAllMappings(mappings as ItemMapping[]);

    if (success) {
      const updatedMappings = getAllMappings();
      return NextResponse.json({
        success: true,
        mappings: updatedMappings,
        message: 'Mappings updated successfully',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update mappings' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error updating mappings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update mappings' },
      { status: 500 }
    );
  }
}
