const express = require('express');

const ReceiveNewDetailController = require('./controller');
const excelParserMiddleware = require('./exceloarser.middleware');
const upload = require('../utils/multer/multer.service');

const router = express.Router();

router.post('/api/import' , [upload.single('file') , excelParserMiddleware.parseDetail]  , ReceiveNewDetailController.handler)

module.exports = router;