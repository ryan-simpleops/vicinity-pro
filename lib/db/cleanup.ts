import { sql } from '@vercel/postgres';

export async function cleanupOldConversations() {
  try {
    // Delete conversations older than 1 hour
    const result = await sql`
      DELETE FROM conversations
      WHERE created_at < NOW() - INTERVAL '1 hour'
    `;

    console.log(`Cleaned up ${result.rowCount} old conversations`);
    return { success: true, deletedCount: result.rowCount };
  } catch (error) {
    console.error('Error cleaning up conversations:', error);
    return { success: false, error };
  }
}
