var mkdirp = require('mkdirp');
var path = require('path');
var server = require('../lib/server');
var test = require('tap').test;
var Nginx = require('../lib/nginx');

module.exports = function(title, runTests) {
  test(title, function(t) {
    var nginxPath = '/some/path/to/nginx';
    var baseDir = path.resolve(__dirname, './scratch');
    var app = server({
      baseDir: baseDir,
      nginxPath: nginxPath,
      apiEndpoint: 'http://0.0.0.0:0',
      routableEndpoint: 'http://0.0.0.0:0',
      nginxRoot: path.resolve(__dirname, './scratch/nginx'),
      Nginx: Nginx,
    });
    mkdirp(baseDir, function(err) {
      t.ifError(err);

      t.test('start server', function(tt) {
        tt.plan(4);
        Nginx.prototype._cmd = function(action, cmdCb) {
          tt.equal(action, 'start');
          if (cmdCb) return cmdCb();
        };

        app.listen = function(lCb) {
          tt.equal(app.get('host'), '0.0.0.0');
          tt.equal(app.get('port'), '0');
          app.set('url', 'http://0.0.0.0:0/');
          // The listen callback (lCb below) is usually called on an httpServer
          // object, but we don't have one in this stubbed out version of
          // listen(), so fake the .address() method that's the ctl daemon will
          // call.
          var server = {
            address: function() {
              return {
                port: 8888,
              };
            },
          };

          if (lCb) return lCb.call(server);
        };

        app.start(function(err) {
          tt.ifError(err);
          tt.end();
        });
      });

      runTests(t, app, baseDir, Nginx);

      t.test('stop service', function(tt) {
        tt.plan(2);
        Nginx.prototype._cmd = function(action, cmdCb) {
          // Gets called 2 times, one when app.stop() is called and again when
          // the app exits.
          if (cmdCb) {
            tt.equal(action, 'stop');
            return cmdCb();
          }
        };
        app.stop(function(err) {
          tt.ifError(err);
          tt.end();
        });
      });

      t.on('end', function() {
        // Remove mocks
        Nginx.prototype._cmd = function() {};
      });
    });
  });
};
