import { NextResponse } from 'next/server';
import { cleanupOldConversations } from '@/lib/db/cleanup';

export async function GET() {
  try {
    cleanupOldConversations();
    return NextResponse.json({ success: true, message: 'Cleanup completed' });
  } catch (error: any) {
    console.error('Error running cleanup:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
