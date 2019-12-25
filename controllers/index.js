'use strict';
let express = require('express');
let router = express.Router();

router.use('/emp', require('./branch'));

module.exports = router;