// server/src/routes/dashboard.routes.js
// Owned by Member 1. Auto-mounted at /api/dashboard.

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getKpis } = require('../controllers/dashboard.controller');

router.get('/kpis', verifyToken, getKpis);

module.exports = router;
