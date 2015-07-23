var fs = require('fs');
var test = require('./helper');
var path = require('path');

test('Test Legacy REST API behavior', function(t, app, baseDir, Nginx) {
  t.test('add endpoints', function(tt) {
    tt.plan(10);
    Nginx.prototype._cmd = function(action, cmdCb) {
      tt.equal(action, 'reload');
      if (cmdCb) return cmdCb();
    };

    var Config = app.models.Config;
    var Endpoint = app.models.Endpoint;

    Config.setEndpoints([
        {host: '127.0.0.1', port: '5000'},
        {host: '127.0.0.1', port: '5001'}
      ], function(err) {
        tt.ifError(err);

        Endpoint.find({}, function(err, endpoints) {
          tt.ifError(err);
          tt.equal(endpoints.length, 2);
          tt.equal(endpoints[0].host, '127.0.0.1');
          tt.equal(endpoints[1].host, '127.0.0.1');

          var fdata = fs.readFileSync(path.resolve(baseDir,
              './nginx/nginx.conf'), 'utf8');

          tt.match(fdata, /listen 0.0.0.0:0;/);
          tt.match(fdata, /upstream svc_1/);
          tt.match(fdata, /server 127.0.0.1:5001;/);
          tt.match(fdata, /server 127.0.0.1:5000;/);
        });
      });
  });

  t.test('remove endpoints', function(tt) {
    tt.plan(6);
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
      });
    });
  });
});
