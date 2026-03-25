const postRepository = require('../repositories/postRepository');
const reactionRepository = require('../repositories/reactionRepository');
const fs = require('fs').promises;
const path = require('path');
const cloudinary = require('../config/cloudinary');

const getCloudinaryPublicId = (imageUrl) => {
  if (typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
    return null;
  }

  try {
    const url = new URL(imageUrl);
    if (!url.hostname.includes('cloudinary.com')) {
      return null;
    }

    const uploadMarker = '/upload/';
    const markerIndex = url.pathname.indexOf(uploadMarker);
    if (markerIndex === -1) {
      return null;
    }

    const afterUpload = url.pathname.slice(markerIndex + uploadMarker.length);
    const segments = afterUpload.split('/').filter(Boolean);
    const versionIndex = segments.findIndex(segment => /^v\d+$/.test(segment));
    const publicIdSegments = versionIndex >= 0 ? segments.slice(versionIndex + 1) : segments;

    if (publicIdSegments.length === 0) {
      return null;
    }

    const lastSegment = publicIdSegments[publicIdSegments.length - 1];
    publicIdSegments[publicIdSegments.length - 1] = lastSegment.replace(/\.[^.]+$/, '');
    return publicIdSegments.join('/');
  } catch (error) {
    return null;
  }
};

class PostService {
  async createPost(postData, authorId) {
    const post = await postRepository.create({ ...postData, authorId });
    return post;
  }

  async getPosts(query) {
    const posts = await postRepository.findAll(query);

    if (!query?.userId) {
      return posts.map((post) => ({
        ...post,
        user_reaction: null,
      }));
    }

    const reactions = await reactionRepository.findByUserAndPosts(
      query.userId,
      posts.map(post => post.id)
    );
    const reactionByPostId = new Map(reactions.map(reaction => [reaction.post_id, reaction.type]));

    return posts.map((post) => ({
      ...post,
      user_reaction: reactionByPostId.get(post.id) || null,
    }));
  }

  async getSavedImages(query) {
    return await postRepository.findAllImages(query);
  }

  async getPostById(id) {
    return await postRepository.findById(id);
  }

  async updatePost(id, updates) {
    const post = await postRepository.findById(id);
    const previousImages = Array.isArray(post?.images) ? post.images : [];
    const shouldReplaceImages = Object.prototype.hasOwnProperty.call(updates, 'images');
    const updatedPost = await postRepository.update(id, updates);

    if (shouldReplaceImages && previousImages.length > 0) {
      await this.deleteImages(previousImages);
    }

    return updatedPost;
  }

  async deletePost(id) {
    const post = await postRepository.findById(id);
    if (post) {
      const client = await require('../config/database').connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM reactions WHERE post_id = $1', [id]);
        await client.query('DELETE FROM post_hashtags WHERE post_id = $1', [id]);
        await client.query('DELETE FROM posts WHERE id = $1', [id]);
        await client.query('COMMIT');

        if (Array.isArray(post.images) && post.images.length > 0) {
          await this.deleteImages(post.images);
        }
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
  }

  async handleReaction(userId, postId, type) {
    const existing = await reactionRepository.findByUserAndPost(userId, postId);
    if (!existing) {
      await reactionRepository.create({ userId, postId, type });
    } else if (existing.type === type) {
      await reactionRepository.delete(userId, postId);
    } else {
      await reactionRepository.create({ userId, postId, type });
    }
  }

  async deleteImages(imagePaths) {
    if (!Array.isArray(imagePaths) || imagePaths.length === 0) {
      return;
    }

    for (const imagePath of imagePaths) {
      try {
        const publicId = getCloudinaryPublicId(imagePath);
        if (publicId) {
          await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
          continue;
        }

        await fs.unlink(path.join(__dirname, '../../uploads', imagePath));
      } catch (error) {
        console.error(`Failed to delete image ${imagePath}:`, error);
      }
    }
  }
}

module.exports = new PostService();
