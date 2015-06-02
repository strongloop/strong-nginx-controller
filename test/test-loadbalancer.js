var assert = require('assert');
var server = require('../lib/server');
var test = require('tap').test;
var path = require('path');
var url = require('url');
var async = require('async');
var fs = require('fs');

function testAppStart(t, app, cb) {
  app._nginxCmd = function(action, cmdCb) {
    t.equal(action, 'start');
    if (cmdCb) return cmdCb();
  };
  app.listen = function(lCb) {
    t.equal(app.get('host'), '0.0.0.0');
    t.equal(app.get('port'), '0');
    app.set('url', 'http://0.0.0.0:0/');
    // The listen callback (lCb below) is usually called on an httpServer
    // object, but we don't have one in this stubbed out version of listen(), so
    // fake the .address() method that's the ctl daemon will call.
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
    t.ifError(err);
    cb();
  });
}

function testAppStop(t, app, cb) {
  app._nginxCmd = function(action, cmdCb) {
    t.equal(action, 'stop');
    if (cmdCb) return cmdCb();
  };
  app.stop(function(err) {
    t.ifError(err);
    cb();
  });
}

function testAddEndpoints(t, app, cb) {
  app._nginxCmd = function(action, cmdCb) {
    t.equal(action, 'reload');
    if (cmdCb) return cmdCb();
  };

  var Config = app.models.Config;
  var Endpoint = app.models.Endpoint;

  Config.setEndpoints([
      {host: '127.0.0.1', port: '5000'}, {host: '127.0.0.1', port: '5001'}
    ], function(err) {
      t.ifError(err);

      Endpoint.find({}, function(err, endpoints) {
        assert.ifError(err);
        t.ok(endpoints.length === 2);
        t.ok(endpoints[0].host === '127.0.0.1');
        t.ok(endpoints[1].host === '127.0.0.1');

        var fdata = fs.readFileSync(path.resolve(__dirname,
            './scratch/nginx/nginx.conf'), 'utf8');

        t.ok(!!fdata.match(/listen 0.0.0.0:0;/));
        t.ok(!!fdata.match(/upstream srvc_hosts/));
        t.ok(!!fdata.match(/server 127.0.0.1:5001;/));
        t.ok(!!fdata.match(/server 127.0.0.1:5000;/));

        cb();
      });
    });
}

function testRemoveEndpoints(t, app, cb) {
  app._nginxCmd = function(action, cmdCb) {
    t.equal(action, 'reload');
    if (cmdCb) return cmdCb();
  };

  var Config = app.models.Config;
  var Endpoint = app.models.Endpoint;

  Config.setEndpoints([], function(err) {
      t.ifError(err);

      Endpoint.find({}, function(err, endpoints) {
        assert.ifError(err);
        t.ok(endpoints.length === 0);

        var fdata = fs.readFileSync(path.resolve(__dirname,
            './scratch/nginx/nginx.conf'), 'utf8');

        t.ok(!!fdata.match(/listen 0.0.0.0:0;/));
        t.ok(!!fdata.match(/return 503;/));

        cb();
      });
    });
}

test('Test service start/stop', function(t) {
  var nginxPath = '/some/path/to/nginx';
  var app = server(path.resolve(__dirname, './scratch'),
    nginxPath,
    url.parse('http://0.0.0.0:0'),
    url.parse('http://0.0.0.0:0'),
    path.resolve(__dirname, './scratch/nginx')
  );

  async.series([
    testAppStart.bind(null, t, app),
    testAddEndpoints.bind(null, t, app),
    testRemoveEndpoints.bind(null, t, app),
    testAppStop.bind(null, t, app)
  ],
    function() {
      // Clear the stubs registered in the tests above, because app.stop()
      // is called on process exit, which will try to send a stop command to
      // the nginx daemon.
      app._nginxCmd = function(action, cmdCb) {
        setImmediate(cmdCb);
      };
      t.end();
    });
});
