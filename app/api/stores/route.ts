import { NextRequest, NextResponse } from 'next/server';
import { getAllStores, addStore, deleteStore, saveAllStores } from '@/lib/storesStorage';

export const runtime = 'nodejs';

/**
 * GET /api/stores - Get all stores
 */
export async function GET(request: NextRequest) {
  try {
    const stores = getAllStores();
    return NextResponse.json({ success: true, stores });
  } catch (error) {
    console.error('Error fetching stores:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stores' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stores - Add a new store
 */
export async function POST(request: NextRequest) {
  try {
    const { store } = await request.json();
    
    if (!store || typeof store !== 'string' || !store.trim()) {
      return NextResponse.json(
        { success: false, error: 'Store name is required' },
        { status: 400 }
      );
    }

    const success = addStore(store);
    
    if (success) {
      const stores = getAllStores();
      return NextResponse.json({ success: true, stores, message: 'Store added successfully' });
    } else {
      return NextResponse.json(
        { success: false, error: 'Store already exists or failed to add' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error adding store:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add store' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/stores - Delete a store
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const store = searchParams.get('store');
    
    if (!store) {
      return NextResponse.json(
        { success: false, error: 'Store name is required' },
        { status: 400 }
      );
    }

    const success = deleteStore(store);
    
    if (success) {
      const stores = getAllStores();
      return NextResponse.json({ success: true, stores, message: 'Store deleted successfully' });
    } else {
      return NextResponse.json(
        { success: false, error: 'Store not found or failed to delete' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error deleting store:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete store' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/stores - Update all stores (for bulk operations)
 */
export async function PUT(request: NextRequest) {
  try {
    const { stores } = await request.json();
    
    if (!Array.isArray(stores)) {
      return NextResponse.json(
        { success: false, error: 'Stores must be an array' },
        { status: 400 }
      );
    }

    const success = saveAllStores(stores);
    
    if (success) {
      const updatedStores = getAllStores();
      return NextResponse.json({ success: true, stores: updatedStores, message: 'Stores updated successfully' });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to update stores' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating stores:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update stores' },
      { status: 500 }
    );
  }
}

