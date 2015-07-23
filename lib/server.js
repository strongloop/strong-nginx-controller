/* eslint no-console:0 */

var loopback = require('loopback');
var boot = require('loopback-boot');
var async = require('async');
var debug = require('debug')('strong-nginx-controller:server');
var url = require('url');
var Nginx = require('./nginx');

/**
 * Create and configure the Gateway controller app
 * @method setup
 * @param  {object} options Options object
 * @param  {String} options.baseDir Base directory
 * @param  {String} options.apiEndpoint URL for where API should be listening
 * @param  {String} options.nginxPath Path to Nginx executable
 * @param  {String} options.routableEndpoint URL for where Nginx should be
 *                                           listening for Service requests.
 * @param  {String} options.nginxRoot Base directory for Nginx conf/html files.
 * @param  {Class} options.Nginx Injected Nginx class for testing
 * @return {[type]}         [description]
 */
function setup(options) {
  var app = loopback();
  options.app = app;

  var _Nginx = options.Nginx || Nginx;
  app._nginx = new _Nginx(options);
  app._disableApi = true;
  app._enableExplorer = debug.enabled;

  // Set the IP and port that server should listen on
  if (options.apiEndpoint) {
    var apiEndpoint = url.parse(options.apiEndpoint);
    app.set('host', apiEndpoint.hostname);
    app.set('port', apiEndpoint.port);
    app._disableApi = false;
  }

  app.use(loopback.favicon());
  app.use(loopback.compress());
  boot(app, __dirname);
  app.use(loopback.urlNotFound());
  app.use(loopback.errorHandler());

  app.start = function start(callback) {
    var self = this;
    var tasks = [];
    if (!self._disableApi) {
      tasks.push(function(callback) {
        app.listen(function() {
          self._apiAddress = this.address();
          debug('API listening on: ', self._apiAddress);
          callback();
        });
      });
    }
    tasks.push(self._nginx.start.bind(self._nginx));
    async.series(tasks, function(err) {
      if (err) return callback(err);
      if (self._apiAddress) self.emit('listening', self._apiAddress);
      self.emit('started');
      callback();
    });
  };

  function stop(callback) {
    this._nginx.stop(callback);
  }
  app.stop = stop;

  function reload(callback) {
    this._nginx.reload(callback);
  }
  app.reload = reload;

  stopWhenDone(app);
  return app;
}

function stopWhenDone(app) {
  function dieBy(signal) {
    console.log('stopped with %s', signal);
    app.stop(function(err) {
      if (err) {
        debug('Error while exiting: ', err);
        console.log('An error occurred while stopping. ' +
          'There may be a stale nginx process.');
      }

      // re-kill ourself, so our exit status is signaled
      process.kill(process.pid, signal);
    });
  }

  function dieOn(signal) {
    process.once(signal, dieBy.bind(null, signal));
  }

  dieOn('SIGINT');
  dieOn('SIGTERM');

  process.on('exit', function() {
    app.stop();
  });

  process.once('SIGHUP', app.reload.bind(app));
}

module.exports = setup;
