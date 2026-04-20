const pool = require('../config/database');

class UserRepository {
  async create(user) {
    const { email, username, passwordHash, isAdmin = false } = user;
    const result = await pool.query(
      'INSERT INTO users (email, username, password_hash, is_admin) VALUES ($1, $2, $3, $4) RETURNING *',
      [email, username, passwordHash, isAdmin]
    );
    return result.rows[0];
  }

  async findByEmailOrUsername(identifier) {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $1',
      [identifier]
    );
    return result.rows[0];
  }

  async findById(id) {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  }

  async findProfileById(id) {
    const userResult = await pool.query(
      `WITH stats AS (
        SELECT
          (SELECT COUNT(*) FROM subscriptions WHERE subscriber_id = $1) AS following_count,
          (SELECT COUNT(*) FROM posts WHERE author_id = $1) AS post_count
      )
      SELECT u.*, stats.following_count, stats.post_count
      FROM users u, stats
      WHERE u.id = $1`,
      [id]
    );

    const user = userResult.rows[0];
    if (!user) {
      return null;
    }

    const followingResult = await pool.query(
      `SELECT u.id, u.username
       FROM subscriptions s
       JOIN users u ON s.following_id = u.id
       WHERE s.subscriber_id = $1
       ORDER BY u.username`,
      [id]
    );

    return {
      ...user,
      following: followingResult.rows,
    };
  }

  async createSubscription(subscriberId, followingId) {
    if (subscriberId === followingId) {
      return;
    }
    await pool.query(
      'INSERT INTO subscriptions (subscriber_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [subscriberId, followingId]
    );
  }

  async deleteSubscription(subscriberId, followingId) {
    await pool.query(
      'DELETE FROM subscriptions WHERE subscriber_id = $1 AND following_id = $2',
      [subscriberId, followingId]
    );
  }

  async update(id, updates) {
    const fields = [];
    const values = [];
    let index = 1;

    const columnMap = {
      passwordHash: 'password_hash',
      isAdmin: 'is_admin',
    };

    for (const [key, value] of Object.entries(updates)) {
      const column = columnMap[key] || key;
      fields.push(`${column} = $${index}`);
      values.push(value);
      index++;
    }

    if (fields.length === 0) {
      return await this.findById(id);
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${index} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async delete(id) {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
  }
}

module.exports = new UserRepository();
