const express = require('express');

const queryController = require('./controller');
const middlewareValidator = require('./middleware');

const router = express.Router();

router.get('/api/products' , middlewareValidator.validate , queryController.handler);

module.exports = router;