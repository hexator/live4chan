'use strict';
/*
    LiveChan is a live imageboard web application.
    Copyright (C) 2014 LiveChan Team

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
var fs = require('fs');
var path = require('path');
var root = path.join(__dirname, '..');
var tor_file = path.join(root, 'tmp/tor_nodes');
var mongoose = require('mongoose');
var async = require('async');

var cxn = mongoose.connect('mongodb://localhost/livechan_db');
var tor_db = require('./models/tor');

function update_tor()
{
async.series([
    function(callback) {
        tor_db.find({}).remove(callback);
    },
    function(callback) {
        var rl = require('readline').createInterface({
            input: fs.createReadStream(tor_file),
            output: process.stdout,
            terminal: false
        });

        rl.on('close', function() {
            // Dump the database
            callback();
        });


        rl.on('line', function (line) {
            // Comments begin with #
            if (line.charAt(0) != '#')
            {
                var data = new tor_db({
             
       ip: line
                });
                data.save(function(err) {
                    if (err) { console.log('error saving'); throw err; }
                });
            }
        });
    },
    function() {
        process.exit(0);
        callback();
        }
 ]);
}

update_tor();
