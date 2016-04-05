// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: strong-nginx-controller
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

var helper = require('./helper');
var fs = require('fs');
var path = require('path');

helper('Test route updates', function(t, app, baseDir, Nginx) {
  var nginx = app._nginx;

  t.test('initial sync', function(tt) {
    tt.plan(7);
    Nginx.prototype._cmd = function(action, cmdCb) {
      tt.equal(action, 'reload', 'Nginx server should reload');
      if (cmdCb) return cmdCb();
    };

    var Endpoint = app.models.Endpoint;

    nginx.onRequest({
      cmd: 'sync',
      data: [{serviceId: 1, endpoints: [{
        serviceId: 1,
        host: '127.0.0.1',
        port: 3000
      }]}],
    }, function() {
      Endpoint.find({}, function(err, endpoints) {
        tt.ifError(err);

        tt.equal(endpoints.length, 1, 'Should have 1 endpoints');
        var fdata = fs.readFileSync(path.resolve(baseDir,
            './nginx/nginx.conf'), 'utf8');

        tt.match(fdata, /listen 0.0.0.0:0;/, 'Nginx should be listening');
        tt.notMatch(fdata, /return 503;/, 'Nginx should not return 503');
        tt.match(fdata, /upstream svc_1/, 'There should be a service 1');
        tt.notMatch(fdata, /upstream svc_2/, 'There should be no service 2');
      });
    });
  });

  t.test('add second service end', function(tt) {
    tt.plan(7);
    Nginx.prototype._cmd = function(action, cmdCb) {
      tt.equal(action, 'reload', 'Nginx server should reload');
      if (cmdCb) return cmdCb();
    };

    var Endpoint = app.models.Endpoint;

    nginx.onRequest({
      cmd: 'update',
      data: {serviceId: 2, endpoints: [{
        serviceId: 2,
        host: '127.0.0.1',
        port: 3001
      }, {
        serviceId: 2,
        host: '127.0.0.1',
        port: 3002
      }]},
    }, function() {
      Endpoint.find({}, function(err, endpoints) {
        tt.ifError(err);

        tt.equal(endpoints.length, 3, 'Should have 3 endpoints');
        var fdata = fs.readFileSync(path.resolve(baseDir,
            './nginx/nginx.conf'), 'utf8');

        tt.match(fdata, /listen 0.0.0.0:0;/, 'Nginx should be listening');
        tt.notMatch(fdata, /return 503;/, 'Nginx should not return 503');
        tt.match(fdata, /upstream svc_1/, 'There should be a service 1');
        tt.match(fdata, /upstream svc_2/, 'There should be a service 2');
      });
    });
  });

  t.test('remove endpoints for service one', function(tt) {
    tt.plan(7);
    Nginx.prototype._cmd = function(action, cmdCb) {
      tt.equal(action, 'reload', 'Nginx server should reload');
      if (cmdCb) return cmdCb();
    };

    var Endpoint = app.models.Endpoint;

    nginx.onRequest({
      cmd: 'update',
      data: {serviceId: 1, endpoints: []},
    }, function() {
      Endpoint.find({}, function(err, endpoints) {
        tt.ifError(err);

        tt.equal(endpoints.length, 2, 'Should have 2 endpoints');
        var fdata = fs.readFileSync(path.resolve(baseDir,
            './nginx/nginx.conf'), 'utf8');

        tt.match(fdata, /listen 0.0.0.0:1;/, 'Nginx should be listening');
        tt.notMatch(fdata, /return 503;/, 'Nginx should not return 503');
        tt.notMatch(fdata, /upstream svc_1/, 'There should not a service 1');
        tt.match(fdata, /upstream svc_2/, 'There should be a service 2');
      });
    });
  });
});
