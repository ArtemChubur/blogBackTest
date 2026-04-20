const express = require('express');
const { PostController, upload } = require('../controllers/postController');
const { CommentController } = require('../controllers/commentController');
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
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: Filter posts by author id
 *       - in: query
 *         name: username
 *         schema:
 *           type: string
 *         description: Filter posts by author username
 *     responses:
 *       200:
 *         description: List of posts
 */
router.get('/list', optionalAuthenticateToken, PostController.getPosts);

/**
 * @swagger
 * /post/user/{userId}:
 *   get:
 *     summary: Get posts by user id
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
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
 *     responses:
 *       200:
 *         description: User posts list
 */
router.get('/user/:userId', optionalAuthenticateToken, PostController.getPosts);

/**
 * @swagger
 * /post/user/username/{username}:
 *   get:
 *     summary: Get posts by user username
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
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
 *     responses:
 *       200:
 *         description: User posts list
 */
router.get('/user/username/:username', optionalAuthenticateToken, PostController.getPosts);

/**
 * @swagger
 * /post/{postId}/comments:
 *   get:
 *     summary: Get comments list for a post
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Max comments per page
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *     responses:
 *       200:
 *         description: Comment list
 */
router.get('/:postId/comments', optionalAuthenticateToken, CommentController.list);

/**
 * @swagger
 * /post/{postId}/comment:
 *   post:
 *     summary: Create a comment on a post
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Comment created
 */
router.post('/:postId/comment', authenticateToken, CommentController.create);

/**
 * @swagger
 * /post/comment/{id}:
 *   put:
 *     summary: Edit a comment
 *     tags: [Comments]
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
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Comment updated
 */
router.put('/comment/:id', authenticateToken, CommentController.update);

/**
 * @swagger
 * /post/comment/{id}:
 *   delete:
 *     summary: Delete a comment
 *     tags: [Comments]
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
 *         description: Comment deleted
 */
router.delete('/comment/:id', authenticateToken, CommentController.delete);

/**
 * @swagger
 * /post/images:
 *   get:
 *     summary: Get all saved images
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           maximum: 50
 *         description: Number of images to return
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *     responses:
 *       200:
 *         description: List of saved images
 */
router.get('/images', PostController.getImages);

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
 *               hashtags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of hashtags, e.g. ["#1", "#2"]
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
 *         description: Требуются права администратора
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
 *               hashtags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Replace current hashtags with this list
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
 *         description: Требуются права администратора
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
 *         description: Пост удалён
 *       403:
 *         description: Требуются права администратора
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
 *         description: Реакция обновлена
 *       400:
 *         description: Bad request
 */
router.post('/reaction', authenticateToken, PostController.react);

module.exports = router;
