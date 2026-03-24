const express = require('express');
const { PostController, upload } = require('../controllers/postController');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/auth');
const adminOnly = require('../middleware/admin');

const router = express.Router();

/**
 * @swagger
 * /post/list:
 *   get:
 *     summary: Get list of posts
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           maximum: 50
 *         description: Number of posts to return
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: hashtag
 *         schema:
 *           type: string
 *         description: Filter by hashtag
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *     responses:
 *       200:
 *         description: List of posts
 */
router.get('/list', optionalAuthenticateToken, PostController.getPosts);

/**
 * @swagger
 * /post/publish:
 *   post:
 *     summary: Publish a new post (Admin only)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 5
 *     responses:
 *       200:
 *         description: Post published
 *       400:
 *         description: Bad request
 *       403:
 *         description: Admin access required
 */
router.post('/publish', authenticateToken, adminOnly, upload.array('images', 5), PostController.publish);

/**
 * @swagger
 * /post/edit/{id}:
 *   put:
 *     summary: Edit a post (Admin only)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 5
 *     responses:
 *       200:
 *         description: Post updated
 *       400:
 *         description: Bad request
 *       403:
 *         description: Admin access required
 */
router.put('/edit/:id', authenticateToken, adminOnly, upload.array('images', 5), PostController.editPost);

/**
 * @swagger
 * /post/{id}:
 *   delete:
 *     summary: Delete a post (Admin only)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Post deleted
 *       403:
 *         description: Admin access required
 */
router.delete('/:id', authenticateToken, adminOnly, PostController.deletePost);

/**
 * @swagger
 * /post/reaction:
 *   post:
 *     summary: Add or update reaction to a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - postId
 *               - type
 *             properties:
 *               postId:
 *                 type: integer
 *               type:
 *                 type: string
 *                 enum: [like, dislike]
 *     responses:
 *       200:
 *         description: Reaction updated
 *       400:
 *         description: Bad request
 */
router.post('/reaction', authenticateToken, PostController.react);

module.exports = router;
