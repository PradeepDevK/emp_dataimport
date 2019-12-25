'use strict';

/**
 * Branch details
 * @class
 */
class BranchModel {
    /**
     * @constructor
     */
    constructor() {
        let self = this;
        self.response = {};
        self.response.data = {};
    }

    /**
     * Get location lists
     * @method getMasterLocationLists
     * @param {function} callback
     */
    getMasterLocationLists(callback) {
        let self = this;
        let responseData = null;
        global.async.waterfall([
            /**
             * Get master location lists
             */
            function (waterfallCb) {
                let sqlQuery = "SELECT `branch_location` AS `location` FROM ??.`branch`";
                sqlQuery = global.mysql.format(sqlQuery, ["emp_platform"]);
                global.db.getConnectionExeQuery(sqlQuery, function (err, result) {
                    if (err) {
                        global.logger.error(self.uuid, "Query execution failed", "Query=" + query, "Error=" + JSON.stringify(err), "Stacktrace=" + err.stack);
                        return waterfallCb(global.config.db_error_message);
                    }
                    responseData = result;
                    waterfallCb(null);
                });
            }
        ], (err) => {
            if (err) {
                return callback(err);
            }
            callback(null, responseData);
        });
    }
}

module.exports = BranchModel;