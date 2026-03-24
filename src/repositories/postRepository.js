const pool = require('../config/database');

class PostRepository {
  async create(post) {
    const { text, images, authorId } = post;
    const result = await pool.query(
      'INSERT INTO posts (text, images, author_id) VALUES ($1, $2, $3) RETURNING *',
      [text, images, authorId]
    );
    return result.rows[0];
  }

  async findAll({ limit = 20, page = 1, hashtag, q }) {
    let query = `
      SELECT p.*, u.username as author_username,
             COUNT(r.id) as likes_count,
             COUNT(CASE WHEN r.type = 'dislike' THEN 1 END) as dislikes_count
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN reactions r ON p.id = r.post_id
    `;
    const values = [];
    let whereClauses = [];
    let index = 1;

    if (hashtag) {
      query += `
        LEFT JOIN post_hashtags ph ON p.id = ph.post_id
        LEFT JOIN hashtags h ON ph.hashtag_id = h.id
      `;
      whereClauses.push(`h.name = $${index}`);
      values.push(hashtag);
      index++;
    }

    if (q) {
      whereClauses.push(`p.text ILIKE $${index}`);
      values.push(`%${q}%`);
      index++;
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    query += `
      GROUP BY p.id, u.username
      ORDER BY p.created_at DESC
      LIMIT $${index} OFFSET $${index + 1}
    `;
    values.push(limit, (page - 1) * limit);

    const result = await pool.query(query, values);
    return result.rows;
  }

  async findById(id) {
    const result = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
    return result.rows[0];
  }

  async update(id, updates) {
    const fields = [];
    const values = [];
    let index = 1;
    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = $${index}`);
      values.push(value);
      index++;
    }
    values.push(id);
    const result = await pool.query(
      `UPDATE posts SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${index} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async delete(id) {
    await pool.query('DELETE FROM posts WHERE id = $1', [id]);
  }

  async getReactions(postId) {
    const result = await pool.query(
      'SELECT type, COUNT(*) as count FROM reactions WHERE post_id = $1 GROUP BY type',
      [postId]
    );
    return result.rows;
  }
}

module.exports = new PostRepository();
