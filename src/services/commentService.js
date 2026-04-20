const commentRepository = require('../repositories/commentRepository');
const postRepository = require('../repositories/postRepository');

class CommentService {
  async createComment(postId, authorId, content) {
    const post = await postRepository.findById(postId);
    if (!post) {
      const err = new Error('Post not found');
      err.statusCode = 404;
      throw err;
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      const err = new Error('Content is required');
      err.statusCode = 400;
      throw err;
    }

    return await commentRepository.create({ postId, authorId, content: content.trim() });
  }

  async getCommentsByPostId(postId, query = {}) {
    const post = await postRepository.findById(postId);
    if (!post) {
      const err = new Error('Post not found');
      err.statusCode = 404;
      throw err;
    }

    return await commentRepository.findByPostId(postId, query.limit, query.page);
  }

  async updateComment(commentId, userId, isAdmin, content) {
    const comment = await commentRepository.findById(commentId);
    if (!comment) {
      const err = new Error('Comment not found');
      err.statusCode = 404;
      throw err;
    }

    if (comment.author_id !== userId && !isAdmin) {
      const err = new Error('Forbidden');
      err.statusCode = 403;
      throw err;
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      const err = new Error('Content is required');
      err.statusCode = 400;
      throw err;
    }

    return await commentRepository.update(commentId, content.trim());
  }

  async deleteComment(commentId, userId, isAdmin) {
    const comment = await commentRepository.findById(commentId);
    if (!comment) {
      const err = new Error('Comment not found');
      err.statusCode = 404;
      throw err;
    }

    if (comment.author_id !== userId && !isAdmin) {
      const err = new Error('Forbidden');
      err.statusCode = 403;
      throw err;
    }

    await commentRepository.delete(commentId);
    return;
  }
}

module.exports = new CommentService();