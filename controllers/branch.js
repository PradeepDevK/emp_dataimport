"use strict";

let express = require('express');
let router = express.Router();
let BranchModel = require('../models/BranchModel.js');

/**
 * Get master company list
 * @param req Contains the request object.
 * @param res Contains the response object.
 */
router.get('/master/locationLists', (req, res) => {
    let branchModelObject = new BranchModel();
    branchModelObject.uuid = "UUID=" + res._headers['x-request-id'];
    global.async.waterfall([
        //Get location lists
        function (waterfallCb) {
            branchModelObject.getMasterLocationLists((err, response) => {
                if (err) {
                    return waterfallCb(err);
                }
                waterfallCb(null, response);
            });
        }
    ], (err, data) => {
        if (err) {
            return res.json({
                "responseCode": global.config.default_error_code,
                "responseDesc": err
            });
        }
        res.json({
            "responseCode": global.config.default_success_code,
            "responseDesc": 'success',
            "data": data
        });
    });
});

module.exports = router;