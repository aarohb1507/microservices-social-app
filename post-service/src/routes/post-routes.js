const express = require('express');
const router = express.Router();
const {createPost, getAllPosts, getPost, deletePost} = require('../controller/post-controller');
const logger = require('../utils/logger');