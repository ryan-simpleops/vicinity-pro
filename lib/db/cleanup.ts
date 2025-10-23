import db from './database';

export function cleanupOldConversations() {
  try {
    // Delete conversations older than 1 hour
    const result = db.prepare(`
      DELETE FROM conversations
      WHERE datetime(created_at) < datetime('now', '-1 hour')
    `).run();

    if (result.changes > 0) {
      console.log(`Cleaned up ${result.changes} old conversations`);
    }
  } catch (error) {
    console.error('Error cleaning up old conversations:', error);
  }
}

// Run cleanup every 15 minutes
export function startCleanupScheduler() {
  // Run immediately on startup
  cleanupOldConversations();

  // Then run every 15 minutes
  setInterval(() => {
    cleanupOldConversations();
  }, 15 * 60 * 1000); // 15 minutes
}
