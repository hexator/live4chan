'use strict';

var mongoose = require('mongoose');

var config = require('../../config');

var tor_schema = new mongoose.Schema({
    ip: String
});

module.exports = mongoose.model('tor_db', tor_schema);
