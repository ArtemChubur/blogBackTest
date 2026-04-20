const pool = require('../config/database');

class PostRepository {
  normalizeHashtags(hashtags) {
    if (!Array.isArray(hashtags)) {
      return [];
    }

    return [...new Set(
      hashtags
        .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
        .filter((tag) => tag.length > 0)
    )];
  }

  async syncPostHashtags(client, postId, hashtags) {
    const normalized = this.normalizeHashtags(hashtags);
    await client.query('DELETE FROM post_hashtags WHERE post_id = $1', [postId]);

    if (normalized.length === 0) {
      return;
    }

    const insertTags = normalized.map((_, idx) => `($${idx + 1})`).join(', ');
    await client.query(`INSERT INTO hashtags (name) VALUES ${insertTags} ON CONFLICT (name) DO NOTHING`, normalized);

    const hashtagResult = await client.query(
      'SELECT id, name FROM hashtags WHERE name = ANY($1)',
      [normalized]
    );

    if (hashtagResult.rows.length === 0) {
      return;
    }

    const insertRelations = hashtagResult.rows
      .map((_, idx) => `($1, $${idx + 2})`)
      .join(', ');
    const relationParams = [postId, ...hashtagResult.rows.map((row) => row.id)];
    await client.query(
      `INSERT INTO post_hashtags (post_id, hashtag_id) VALUES ${insertRelations} ON CONFLICT DO NOTHING`,
      relationParams
    );
  }

  async create(post) {
    const { text, images, authorId, hashtags } = post;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const result = await client.query(
        'INSERT INTO posts (text, images, author_id) VALUES ($1, $2, $3) RETURNING *',
        [text, images, authorId]
      );
      const postRow = result.rows[0];

      if (hashtags !== undefined) {
        await this.syncPostHashtags(client, postRow.id, hashtags);
      }

      await client.query('COMMIT');
      return await this.findById(postRow.id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findAll({ limit = 20, page = 1, hashtag, q, userId, username }) {
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    let query = `
      SELECT p.*, u.username as author_username,
             COALESCE(reaction_counts.likes_count, 0) as likes_count,
             COALESCE(reaction_counts.dislikes_count, 0) as dislikes_count,
             COALESCE(ph_tags.hashtags, '[]'::json) AS hashtags,
             (SELECT COALESCE(json_agg(json_build_object(
               'id', c.id,
               'post_id', c.post_id,
               'content', c.content,
               'author_id', c.author_id,
               'author_username', cu.username,
               'created_at', c.created_at,
               'updated_at', c.updated_at
             ) ORDER BY c.created_at ASC), '[]'::json)
              FROM comments c
              LEFT JOIN users cu ON c.author_id = cu.id
              WHERE c.post_id = p.id) AS comments,
             (SELECT COUNT(*) FROM comments WHERE post_id = p.id)::int AS comments_count
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN (
        SELECT post_id,
               COUNT(*) FILTER (WHERE type = 'like') AS likes_count,
               COUNT(*) FILTER (WHERE type = 'dislike') AS dislikes_count
        FROM reactions
        GROUP BY post_id
      ) reaction_counts ON reaction_counts.post_id = p.id
      LEFT JOIN (
        SELECT ph.post_id,
               json_agg(json_build_object('id', h.id, 'name', h.name)) AS hashtags
        FROM post_hashtags ph
        JOIN hashtags h ON ph.hashtag_id = h.id
        GROUP BY ph.post_id
      ) ph_tags ON ph_tags.post_id = p.id
    `;
    const values = [];
    let whereClauses = [];
    let index = 1;

    if (hashtag) {
      query += `
      LEFT JOIN post_hashtags ph_filter ON p.id = ph_filter.post_id
      LEFT JOIN hashtags h ON ph_filter.hashtag_id = h.id
      `;
      whereClauses.push(`h.name = $${index}`);
      values.push(hashtag);
      index++;
    }

    if (userId !== undefined) {
      whereClauses.push(`p.author_id = $${index}`);
      values.push(userId);
      index++;
    }

    if (username !== undefined) {
      whereClauses.push(`u.username = $${index}`);
      values.push(username);
      index++;
    }

    if (q) {
      const qWildcard = `%${q}%`;
      whereClauses.push(`(
        p.text ILIKE $${index}
        OR p.text % $${index + 1}
        OR EXISTS (
          SELECT 1
          FROM post_hashtags ph_search
          JOIN hashtags h_search ON ph_search.hashtag_id = h_search.id
          WHERE ph_search.post_id = p.id
            AND h_search.name ILIKE $${index}
        )
      )`);
      values.push(qWildcard, q);
      index += 2;
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    query += `
      ORDER BY ${q ? 'GREATEST(similarity(p.text, $' + (index - 1) + '), 0) DESC,' : ''} p.created_at DESC
      LIMIT $${index} OFFSET $${index + 1}
    `;
    values.push(safeLimit, (safePage - 1) * safeLimit);

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
    const result = await pool.query(
      `
      SELECT p.*, u.username as author_username,
             COALESCE(ph_tags.hashtags, '[]'::json) AS hashtags
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN (
        SELECT ph.post_id,
               json_agg(json_build_object('id', h.id, 'name', h.name)) AS hashtags
        FROM post_hashtags ph
        JOIN hashtags h ON ph.hashtag_id = h.id
        GROUP BY ph.post_id
      ) ph_tags ON ph_tags.post_id = p.id
      WHERE p.id = $1
      `,
      [id]
    );
    return result.rows[0];
  }

  async update(id, updates) {
    const { hashtags, ...fieldsToUpdate } = updates;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      if (Object.keys(fieldsToUpdate).length > 0) {
        const fields = [];
        const values = [];
        let index = 1;
        for (const [key, value] of Object.entries(fieldsToUpdate)) {
          fields.push(`${key} = $${index}`);
          values.push(value);
          index++;
        }
        values.push(id);
        await client.query(
          `UPDATE posts SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${index}`,
          values
        );
      }

      if (hashtags !== undefined) {
        await this.syncPostHashtags(client, id, hashtags);
      }

      await client.query('COMMIT');
      return await this.findById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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
