const express = require('express');
const { getMetricsJson, getMetricsPrometheus } = require('../controllers/metricsController');

const router = express.Router();

router.get('/', getMetricsJson);
router.get('/prometheus', getMetricsPrometheus);

module.exports = router;