const express = require('express');
const router = express.Router();
const {createPost, getAllPosts, getPost, deletePost} = require('../controller/post-controller');
const {authenticateUser} = require('../middleware/authMiddleware');
const {createPostLimiter, deletePostLimiter} = require('../middleware/rateLimiters');

// Rate limiter BEFORE auth
router.post('/create-post', createPostLimiter, authenticateUser, createPost)
router.get('/', getAllPosts)
router.get('/:id', getPost)
router.delete('/delete-post', deletePostLimiter, authenticateUser, deletePost)

module.exports = router;