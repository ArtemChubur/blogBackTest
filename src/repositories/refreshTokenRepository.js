const pool = require('../config/database');

class RefreshTokenRepository {
  async create(token) {
    const { userId, token: tokenValue, expiresAt } = token;
    const result = await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3) RETURNING *',
      [userId, tokenValue, expiresAt]
    );
    return result.rows[0];
  }

  async findByToken(token) {
    const result = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token = $1',
      [token]
    );
    return result.rows[0];
  }

  async delete(token) {
    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
  }

  async deleteExpired() {
    await pool.query('DELETE FROM refresh_tokens WHERE expires_at < CURRENT_TIMESTAMP');
  }
}

module.exports = new RefreshTokenRepository();