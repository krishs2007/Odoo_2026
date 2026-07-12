// server/src/routes/auth.routes.js
// Owned by Member 1. Auto-mounted at /api/auth.

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { register, login, me } = require('../controllers/auth.controller');

router.post('/register', register);
router.post('/login', login);
router.get('/me', verifyToken, me);

module.exports = router;
