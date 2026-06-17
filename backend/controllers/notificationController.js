const db = require('../config/db');

// 1. Get Notification History for logged-in user
const getNotifications = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await db.query(
      'SELECT id, user_id, title, message, type, channel, read_status, sent_status, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [userId]
    );
    return res.status(200).json({ notifications: result.rows });
  } catch (err) {
    console.error('Error fetching notifications:', err.message);
    return res.status(500).json({ error: 'Server error retrieving notifications.' });
  }
};

// 2. Mark notification(s) as read
const markNotificationsAsRead = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.body; // If id omitted, mark all as read

  try {
    if (id) {
      const parsedId = Number(id);
      if (isNaN(parsedId) || parsedId <= 0 || parsedId > 2147483647) {
        console.warn(`⚠️ Warning: markNotificationsAsRead received an invalid or out-of-range notification ID: ${id}`);
        return res.status(200).json({ message: 'Notification skipped (invalid or local ID).' });
      }

      const result = await db.query(
        'UPDATE notifications SET read_status = true WHERE id = $1 AND user_id = $2 RETURNING *',
        [parsedId, userId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Notification not found or access denied.' });
      }
      return res.status(200).json({ message: 'Notification marked as read.', notification: result.rows[0] });
    } else {
      await db.query(
        'UPDATE notifications SET read_status = true WHERE user_id = $1',
        [userId]
      );
      return res.status(200).json({ message: 'All notifications marked as read.' });
    }
  } catch (err) {
    console.error('Error marking notifications as read:', err.message);
    return res.status(500).json({ error: 'Server error updating notification status.' });
  }
};

// 3. Clear all notifications (delete history)
const clearNotifications = async (req, res) => {
  const userId = req.user.id;

  try {
    await db.query(
      'DELETE FROM notifications WHERE user_id = $1',
      [userId]
    );
    return res.status(200).json({ message: 'Notification history cleared successfully.' });
  } catch (err) {
    console.error('Error clearing notifications:', err.message);
    return res.status(500).json({ error: 'Server error deleting notifications.' });
  }
};

module.exports = {
  getNotifications,
  markNotificationsAsRead,
  clearNotifications
};
