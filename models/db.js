'use strict';
var mysql = require("mysql");
var fs = require('fs');

/**
 * Defines database operations.
 * @class
 */
var DB = function(){};

DB.prototype.createPool = function(){
    var sslOptions = false;
    if(global.envConfig[global.envConfig.environmentName].mysqlSSL.enabled) {
        try {
            var ca = fs.readFileSync(global.envConfig[global.envConfig.environmentName].mysqlSSL.ca, 'utf8');
            var certificate = fs.readFileSync(global.envConfig[global.envConfig.environmentName].mysqlSSL.cert, 'utf8');
            var privateKey  = fs.readFileSync(global.envConfig[global.envConfig.environmentName].mysqlSSL.key, 'utf8');
            sslOptions = {"ca" : ca, "cert" : certificate, "key" : privateKey};
        } catch(e) {
            throw new Error("Error reading mysql ssl files - " + JSON.stringify(e));
        }
    }
    return mysql.createPool({
        host     : global.envConfig[global.envConfig.environmentName].mysqlConfig.host,
        user     : global.envConfig[global.envConfig.environmentName].mysqlConfig.user,
        password : global.envConfig[global.envConfig.environmentName].mysqlConfig.password,
        ssl : sslOptions,
        connectionLimit : global.envConfig[global.envConfig.environmentName].mysqlConfig.connectionLimit
    });
};

/**
 * Establishes mysql connection and returns the connection object.
 * @function
 * @param {object} pool - Mysql pool object.
 * @param {function} callback - Callback.
 */
DB.prototype.getConnection = function(pool,callback){
    pool.getConnection(function(err, connection) {
        if(err) {
            //logging here
            global.logger.warn({message:'Error connecting to sql pool', errorData: JSON.stringify(err)});
            callback('Error connecting to sql pool');
            return;
        }
        if(global.connectionThreadId[connection.threadId] === undefined) {
            global.connectionThreadId[connection.threadId] = "0";
            connection.on('error', function(err) {
                if(err.code === "PROTOCOL_CONNECTION_LOST") {
                    connection.destroy();
                } else {
                    global.logger.warn({'Message': 'Sql connection error', errorData: JSON.stringify(err), stackTrace:err.stack});
                    connection.release();
                }
                return;
            });
        }
        callback(null,connection);
    });
};

/**
 * Establishes mysql connection, begins transaction and returns the transactio connection object.
 * @function
 * @param {object} pool - Mysql pool object.
 * @param {function} callback - Callback.
 */
DB.prototype.createTransaction = function(pool,callback) {
    var self = this;
    self.getConnection(pool,function(err,connection){
        if(err) {
            //logging here
            callback('Error connecting to sql pool');
            return;
        }
        connection.beginTransaction(function(err) {
            if(err){
                global.logger.warn({message:'Error in begining transaction', errorData: JSON.stringify(err)});
                callback('Error in begining transaction');
                return;
            }
            callback(null,connection);
        });
    });
};

/**
 * Establishes mysql connection, executes query, releases connection, returns response.
 * @function
 * @param {string} query - Query to be executed.
 * @param {array} inserts - Array data to format the query with.
 * @param {function} callback - Callback.
 */
DB.prototype.getConnectionExeQuery = function(query, inserts, callback) {
    var self = this;
    self.getConnection(global.SQLpool, function(err, connection){
        if(err) {
            return callback(err);
        }
        var formatedQuery = connection.query(query, inserts, function(err, rows) {
            connection.release();
            if(err) {
                global.logger.warn({message:'Error in executing query', query: formatedQuery.sql, errorData: JSON.stringify(err)});
                return callback(err);
            }
            callback(null, rows);
        });
    });
};

/**
 * Ends transaction connection depending on err value.
 * @function
 * @param {any} err - Instructs the function to process error or success scenario depending on value.
 * @param {object} transactionConnection - Transaction Connection object to end.
 * @param {function} callback - callback function.
 */
DB.prototype.endTransaction = function(err, transactionConnection, callback) {
    if(!transactionConnection) {
        return callback(err);
    }
    if(err) {
        transactionConnection.rollback(function() {
            transactionConnection.release();
            global.logger.warn({message:"Rollbacked", error: JSON.stringify(err)});
            callback(err);
        });
        return;
    }
    transactionConnection.commit(function(err) {
        if (err) {
            transactionConnection.rollback(function() {
                transactionConnection.release();
                global.logger.warn({message:"Rollbacked during commit", error: JSON.stringify(err)});
                callback(err);
            });
            return;
        }
        transactionConnection.release();
        callback(null);
    });
};

module.exports = new DB();
