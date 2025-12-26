const express = require("express");
const { searchPostController } = require("../controller/search-controller");
const { authenticateUser } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateUser);

router.get("/posts", searchPostController);

module.exports = router;