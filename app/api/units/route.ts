import { NextRequest, NextResponse } from 'next/server';
import { getAllUnits, addUnit, deleteUnit, saveAllUnits, discoverUnitsFromReceipts } from '@/lib/unitsStorage';
import { getAllReceipts } from '@/lib/receiptStorage';

export const runtime = 'nodejs';

/**
 * GET /api/units - Get all units
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'discover') {
      // Discover units from receipts
      const receipts = getAllReceipts();
      const units = discoverUnitsFromReceipts(receipts);
      return NextResponse.json({ success: true, units });
    }

    const units = getAllUnits();
    return NextResponse.json({ success: true, units });
  } catch (error) {
    console.error('Error fetching units:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch units' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/units - Add a new unit
 */
export async function POST(request: NextRequest) {
  try {
    const { unit } = await request.json();
    
    if (!unit || typeof unit !== 'string' || !unit.trim()) {
      return NextResponse.json(
        { success: false, error: 'Unit is required' },
        { status: 400 }
      );
    }

    const success = addUnit(unit);
    
    if (success) {
      const units = getAllUnits();
      return NextResponse.json({ success: true, units, message: 'Unit added successfully' });
    } else {
      return NextResponse.json(
        { success: false, error: 'Unit already exists or failed to add' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error adding unit:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add unit' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/units - Delete a unit
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const unit = searchParams.get('unit');
    
    if (!unit) {
      return NextResponse.json(
        { success: false, error: 'Unit is required' },
        { status: 400 }
      );
    }

    const success = deleteUnit(unit);
    
    if (success) {
      const units = getAllUnits();
      return NextResponse.json({ success: true, units, message: 'Unit deleted successfully' });
    } else {
      return NextResponse.json(
        { success: false, error: 'Unit not found or failed to delete' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error deleting unit:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete unit' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/units - Update all units (for bulk operations)
 */
export async function PUT(request: NextRequest) {
  try {
    const { units } = await request.json();
    
    if (!Array.isArray(units)) {
      return NextResponse.json(
        { success: false, error: 'Units must be an array' },
        { status: 400 }
      );
    }

    const success = saveAllUnits(units);
    
    if (success) {
      const updatedUnits = getAllUnits();
      return NextResponse.json({ success: true, units: updatedUnits, message: 'Units updated successfully' });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to update units' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating units:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update units' },
      { status: 500 }
    );
  }
}

