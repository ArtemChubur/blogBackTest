const postService = require('../services/postService');
const multer = require('multer');
const path = require('path');
const { Readable } = require('stream');
const cloudinary = require('../config/cloudinary');

const uploadToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: process.env.CLOUDINARY_FOLDER || 'blog',
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      }
    );

    Readable.from(file.buffer).pipe(uploadStream);
  });
};

const uploadManyToCloudinary = async (files) => {
  const uploaded = [];

  for (const file of files) {
    const result = await uploadToCloudinary(file);
    uploaded.push(result);
  }

  return uploaded;
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /png|jpeg|jpg|webp|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Invalid file type'));
  }
});

class PostController {
  async publish(req, res) {
    let uploadedImages = [];

    try {
      const { text } = req.body;
      uploadedImages = req.files && req.files.length > 0 ? await uploadManyToCloudinary(req.files) : [];
      const images = uploadedImages.map(image => image.secure_url);
      const post = await postService.createPost({ text, images }, req.user.id);
      res.json({ success: true, data: post });
    } catch (error) {
      if (uploadedImages.length > 0) {
        await postService.deleteImages(uploadedImages.map(image => image.secure_url)).catch(() => {});
      }
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getPosts(req, res) {
    try {
      const query = { ...req.query, userId: req.user?.id };
      const posts = await postService.getPosts(query);
      res.json({ success: true, data: posts });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getImages(req, res) {
    try {
      const images = await postService.getSavedImages(req.query);
      res.json({ success: true, data: images });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async editPost(req, res) {
    let uploadedImages = [];

    try {
      const { id } = req.params;
      const updates = req.body;
      if (req.files && req.files.length > 0) {
        uploadedImages = await uploadManyToCloudinary(req.files);
        updates.images = uploadedImages.map(image => image.secure_url);
      }
      const post = await postService.updatePost(id, updates);
      res.json({ success: true, data: post });
    } catch (error) {
      if (uploadedImages.length > 0) {
        await postService.deleteImages(uploadedImages.map(image => image.secure_url)).catch(() => {});
      }
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async deletePost(req, res) {
    try {
      const { id } = req.params;
      await postService.deletePost(id);
      res.json({ success: true, message: 'Post deleted' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async react(req, res) {
    try {
      const { postId, type } = req.body;
      await postService.handleReaction(req.user.id, postId, type);
      res.json({ success: true, message: 'Reaction updated' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = { PostController: new PostController(), upload };
