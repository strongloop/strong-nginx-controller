// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: strong-nginx-controller
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

'use strict';

var async = require('async');
var ejs = require('ejs');
var fs = require('fs');
var mkdirp = require('mkdirp');
var crypto = require('crypto');
var path = require('path');
var url = require('url');
var routeByPort = ejs.compile(
  fs.readFileSync(path.join(__dirname, '/templates/route-by-port.ejs'), 'utf8')
);

function getConfigHash(options, callback) {
  var baseDir = options.baseDir;
  var nginxConfdir = path.join(baseDir, 'nginx');
  mkdirp(nginxConfdir, function(err) {
    if (err) return callback(err);

    var filePath = path.join(nginxConfdir, 'nginx.conf');
    var md5Hash = crypto.createHash('md5');

    var stream = fs.createReadStream(filePath, {encoding: 'utf8'});
    stream.on('data', function(data) {
      md5Hash.update(data);
    });
    stream.on('end', function() {
      if (callback) callback(null, md5Hash.digest('hex'));
      callback = null;
    });
    stream.on('error', function(err) {
      if (callback) callback(err);
      callback = null;
    });
  });
}
exports.getConfigHash = getConfigHash;

function genNginxConf(options, callback) {
  var app = options.app;
  var baseDir = options.baseDir;

  var routableEndpoint = url.parse(options.routableEndpoint);
  var nginxHost = routableEndpoint.hostname;
  var nginxPort = routableEndpoint.port;
  var nginxRoot = options.nginxRoot;

  var Service = app.models.Service;

  var nginxConfdir = path.join(baseDir, 'nginx');
  mkdirp(nginxConfdir, function(err) {
    if (err) return callback(err);
    Service.find({}, function(err, services) {
      if (err) return callback(err);
      async.map(services, getEndpoints, function(err, services) {
        if (err) return callback(err);

        // For backward compat, there is always 1 service
        if (services.length === 0) {
          services = [{id: 1, endpoints: [], port: nginxPort}];
        }

        var templateData = {
          host: nginxHost,
          root: nginxRoot,
          services: services,
        };
        var renderedTemplate = routeByPort(templateData);
        fs.writeFile(
          path.join(nginxConfdir, 'nginx.conf'),
          renderedTemplate,
          callback
        );
      });
    });
  });

  function getEndpoints(s, callback) {
    s.endpoints(function(err, endpoints) {
      if (err) return callback(err);
      callback(null, {
        id: s.id,
        // The `-1` is because service id always starts at 1
        port: parseInt(nginxPort) + s.id - 1,
        endpoints: endpoints,
      });
    });
  }
}
exports.genNginxConf = genNginxConf;
