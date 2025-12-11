import { NextRequest, NextResponse } from 'next/server';
import { getAllReceipts, saveReceipt, updateReceipt, deleteReceipt, exportReceipts } from '@/lib/receiptStorage';

export const runtime = 'nodejs';

/**
 * GET /api/receipts - Get all receipts
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'export') {
      const format = searchParams.get('format') as 'json' | 'csv' || 'json';
      const data = exportReceipts(format);
      
      return new NextResponse(data, {
        headers: {
          'Content-Type': format === 'json' ? 'application/json' : 'text/csv',
          'Content-Disposition': `attachment; filename="receipts_${new Date().toISOString().split('T')[0]}.${format}"`,
        },
      });
    }

    const receipts = getAllReceipts();
    return NextResponse.json({ success: true, receipts });
  } catch (error) {
    console.error('Error fetching receipts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch receipts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/receipts - Save a new receipt
 */
export async function POST(request: NextRequest) {
  try {
    const receipt = await request.json();
    
    // Validate required fields
    if (!receipt.id || !receipt.extractedData || !receipt.storeNameSelected) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const success = saveReceipt(receipt);
    
    if (success) {
      return NextResponse.json({ success: true, message: 'Receipt saved successfully' });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to save receipt' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error saving receipt:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save receipt' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/receipts - Update an existing receipt
 */
export async function PATCH(request: NextRequest) {
  try {
    const { id, updates } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Receipt ID is required' },
        { status: 400 }
      );
    }

    const success = updateReceipt(id, updates);
    
    if (success) {
      return NextResponse.json({ success: true, message: 'Receipt updated successfully' });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to update receipt' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating receipt:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update receipt' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/receipts - Delete a receipt
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Receipt ID is required' },
        { status: 400 }
      );
    }

    const success = deleteReceipt(id);
    
    if (success) {
      return NextResponse.json({ success: true, message: 'Receipt deleted successfully' });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to delete receipt' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error deleting receipt:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete receipt' },
      { status: 500 }
    );
  }
}

