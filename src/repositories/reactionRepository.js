const pool = require('../config/database');

class ReactionRepository {
  async create(reaction) {
    const { userId, postId, type } = reaction;
    const result = await pool.query(
      'INSERT INTO reactions (user_id, post_id, type) VALUES ($1, $2, $3) ON CONFLICT (user_id, post_id) DO UPDATE SET type = EXCLUDED.type RETURNING *',
      [userId, postId, type]
    );
    return result.rows[0];
  }

  async findByUserAndPost(userId, postId) {
    const result = await pool.query(
      'SELECT * FROM reactions WHERE user_id = $1 AND post_id = $2',
      [userId, postId]
    );
    return result.rows[0];
  }

  async delete(userId, postId) {
    await pool.query(
      'DELETE FROM reactions WHERE user_id = $1 AND post_id = $2',
      [userId, postId]
    );
  }

  async findByUserAndPosts(userId, postIds) {
    if (!userId || !Array.isArray(postIds) || postIds.length === 0) {
      return [];
    }

    const result = await pool.query(
      'SELECT post_id, type FROM reactions WHERE user_id = $1 AND post_id = ANY($2::int[])',
      [userId, postIds]
    );
    return result.rows;
  }
}

module.exports = new ReactionRepository();
