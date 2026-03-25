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
             COUNT(r.id) FILTER (WHERE r.type = 'like') as likes_count,
             COUNT(r.id) FILTER (WHERE r.type = 'dislike') as dislikes_count
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

  async findAllImages({ limit = 20, page = 1 }) {
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const offset = (safePage - 1) * safeLimit;

    const itemsResult = await pool.query(
      `
        WITH image_rows AS (
          SELECT
            p.id AS post_id,
            p.text AS post_text,
            p.author_id,
            p.created_at,
            img.image_url
          FROM posts p
          CROSS JOIN LATERAL unnest(COALESCE(p.images, ARRAY[]::text[])) AS img(image_url)
        )
        SELECT
          image_rows.post_id,
          image_rows.post_text,
          image_rows.author_id,
          image_rows.created_at,
          image_rows.image_url,
          u.username AS author_username
        FROM image_rows
        LEFT JOIN users u ON u.id = image_rows.author_id
        ORDER BY image_rows.created_at DESC, image_rows.post_id DESC
        LIMIT $1 OFFSET $2
      `,
      [safeLimit, offset]
    );

    const totalResult = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM posts p
      CROSS JOIN LATERAL unnest(COALESCE(p.images, ARRAY[]::text[])) AS img(image_url)
    `);

    const total = totalResult.rows[0]?.total || 0;

    return {
      items: itemsResult.rows,
      pagination: {
        limit: safeLimit,
        page: safePage,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / safeLimit),
      },
    };
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
