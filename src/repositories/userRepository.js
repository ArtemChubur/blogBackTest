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
