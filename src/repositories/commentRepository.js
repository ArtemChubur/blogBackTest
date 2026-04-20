const pool = require('../config/database');

class CommentRepository {
  async create(comment) {
    const { postId, authorId, content } = comment;
    const result = await pool.query(
      'INSERT INTO comments (post_id, author_id, content) VALUES ($1, $2, $3) RETURNING *',
      [postId, authorId, content]
    );
    return result.rows[0];
  }

  async findById(id) {
    const result = await pool.query('SELECT * FROM comments WHERE id = $1', [id]);
    return result.rows[0];
  }

  async findByPostId(postId, limit = 100, page = 1) {
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 200);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const offset = (safePage - 1) * safeLimit;

    const items = await pool.query(
      `SELECT c.*, u.username as author_username
       FROM comments c
       LEFT JOIN users u ON c.author_id = u.id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC
       LIMIT $2 OFFSET $3`,
      [postId, safeLimit, offset]
    );

    const countResult = await pool.query('SELECT COUNT(*)::int AS total FROM comments WHERE post_id = $1', [postId]);
    const total = countResult.rows[0].total;

    return {
      items: items.rows,
      pagination: {
        limit: safeLimit,
        page: safePage,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / safeLimit),
      },
    };
  }

  async update(id, content) {
    const result = await pool.query(
      'UPDATE comments SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [content, id]
    );
    return result.rows[0];
  }

  async delete(id) {
    await pool.query('DELETE FROM comments WHERE id = $1', [id]);
  }
}

module.exports = new CommentRepository();