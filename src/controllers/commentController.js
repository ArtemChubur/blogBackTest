const commentService = require('../services/commentService');
const { translateErrorMessage } = require('../utils/errorMessages');

class CommentController {
  async create(req, res) {
    try {
      const { postId } = req.params;
      const { content } = req.body;
      const comment = await commentService.createComment(Number(postId), req.user.id, content);
      res.json({ success: true, data: comment });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: translateErrorMessage(error) });
    }
  }

  async list(req, res) {
    try {
      const { postId } = req.params;
      const comments = await commentService.getCommentsByPostId(Number(postId), req.query);
      res.json({ success: true, data: comments });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: translateErrorMessage(error) });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const comment = await commentService.updateComment(Number(id), req.user.id, req.user.isAdmin, content);
      res.json({ success: true, data: comment });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: translateErrorMessage(error) });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      await commentService.deleteComment(Number(id), req.user.id, req.user.isAdmin);
      res.json({ success: true, message: translateErrorMessage('Comment deleted') });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: translateErrorMessage(error) });
    }
  }
}

module.exports = { CommentController: new CommentController() };