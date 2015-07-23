'use strict';

var async = require('async');
var ejs = require('ejs');
var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');
var url = require('url');
var routeByPort = ejs.compile(
  fs.readFileSync(path.join(__dirname, '/templates/route-by-port.ejs'), 'utf8')
);

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

        console.log(services);
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
module.exports = genNginxConf;
