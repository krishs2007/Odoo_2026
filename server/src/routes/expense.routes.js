const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { createExpense, getExpenses } = require('../controllers/expense.controller');

const allowed = requireRole('FleetManager', 'FinancialAnalyst');

router.post('/', verifyToken, allowed, createExpense);
router.get('/', verifyToken, allowed, getExpenses);

module.exports = router;