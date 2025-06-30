const express = require('express');
const router = express.Router();
const { verifyFaces, analyzeFace } = require('../controllers/faceMatchController');

// Route for face verification
router.post('/verify', verifyFaces);

// Route for face analysis
router.post('/analyze', analyzeFace);

module.exports = router; 