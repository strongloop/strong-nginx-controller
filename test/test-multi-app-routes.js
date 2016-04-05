// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: strong-nginx-controller
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

var helper = require('./helper');
var fs = require('fs');
var path = require('path');

helper('Test multi-app REST API behavior', function(t, app, baseDir, Nginx) {
  t.test('add endpoints', function(tt) {
    tt.plan(11);
    Nginx.prototype._cmd = function(action, cmdCb) {
      tt.equal(action, 'reload');
      if (cmdCb) return cmdCb();
    };

    var Config = app.models.Config;
    var Endpoint = app.models.Endpoint;

    Config.setEndpoints([
        {host: '127.0.0.1', port: '5000', serviceId: 1},
        {host: '127.0.0.2', port: '5001', serviceId: 2}
      ], function(err) {
        tt.ifError(err);

        Endpoint.find({}, function(err, endpoints) {
          tt.ifError(err);
          tt.equal(endpoints.length, 2);
          tt.equal(endpoints[0].host, '127.0.0.1');
          tt.equal(endpoints[1].host, '127.0.0.2');

          var fdata = fs.readFileSync(path.resolve(baseDir,
              './nginx/nginx.conf'), 'utf8');

          tt.match(fdata, /listen 0.0.0.0:0;/);
          tt.match(fdata, /upstream svc_1/);
          tt.match(fdata, /server 127.0.0.2:5001;/);
          tt.match(fdata, /upstream svc_2/);
          tt.match(fdata, /server 127.0.0.2:5001;/);
        });
      });
  });

  t.test('remove endpoints', function(tt) {
    tt.plan(8);
    Nginx.prototype._cmd = function(action, cmdCb) {
      tt.equal(action, 'reload');
      if (cmdCb) return cmdCb();
    };

    var Config = app.models.Config;
    var Endpoint = app.models.Endpoint;

    Config.setEndpoints([], function(err) {
      tt.ifError(err);

      Endpoint.find({}, function(err, endpoints) {
        tt.ifError(err);
        tt.equal(endpoints.length, 0);

        var fdata = fs.readFileSync(path.resolve(baseDir,
            './nginx/nginx.conf'), 'utf8');

        tt.match(fdata, /listen 0.0.0.0:0;/);
        tt.match(fdata, /return 503;/);
        tt.notMatch(fdata, /upstream svc_1/);
        tt.notMatch(fdata, /upstream svc_2/);
      });
    });
  });
});
