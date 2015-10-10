'use strict';

var fs = require('fs');

var tor_db = require('../models/tor');
var get_user_ip = require('./get-user-ip');
var path = require('path');
var config = require('../../config');

var root = path.join(__dirname, '../..');
var no_limit_cookie_file = path.join(root, config.no_limit_cookie_file);
var no_limit_cookie_string = '';

/* check_tor:
    - checks if ip is a TOR exit node
    calls callback(err) on completion
*/
module.exports = function(req, callback) {
    /* get IP */
    var user_ip = get_user_ip(req);

    /* lookup IP */
    tor_db
        .find({
            ip: user_ip
        })
        .exec(function(e, d) {
            if (d[0] && req.files && req.files.image && req.files.image.size !== 0) {
                return callback(new Error('No files can be submitted from TOR.'));
            }
            else
            {
                return callback();
            }
        });
};
