var nginxConf = require('./nginx-conf').genNginxConf;
var configHash = require('./nginx-conf').getConfigHash;
var path = require('path');
var debug = require('debug')('strong-nginx-controller:nginx');
var childProcess = require('child_process');
var async = require('async');

function Nginx(options) {
  this._app = options.app;
  this._nginxPath = options.nginxPath;
  this._baseDir = options.baseDir;
  this._nginxConf = nginxConf.bind(null, options);
  this._configHash = configHash.bind(null, options);
}

/**
 * Generate the nginx config and start nginx.
 */
function start(callback) {
  async.series([
    this._nginxConf,
    this._cmd.bind(this, 'start')
  ], callback);
}
Nginx.prototype.start = start;

/**
 * Generate a new nginx config. But only reload nginx if the config has changed.
 */
function reload(callback) {
  var self = this;

  self._configHash(function(err, originalHash) {
    debug('Original hash: %s', originalHash);
    if (err) return callback(err);
    self._nginxConf(function(err) {
      if (err) return callback(err);
      self._configHash(function(err, newHash) {
        debug('Updated hash: %s', newHash);
        if (err) return callback(err);
        if (originalHash !== newHash) {
          debug('Reloading nginx');
          return self._cmd('reload', callback);
        }
        debug('Config has not changed. No reload necessary');
        setImmediate(callback);
      });
    });
  });
}
Nginx.prototype.reload = reload;

/**
 * Stop nginx.
 */
function stop(callback) {
  this._cmd('stop', callback);
}
Nginx.prototype.stop = stop;

function onRequest(req, callback) {
  debug('onRequest(%j)', req);
  switch (req.cmd) {
    case 'update':
      return this._app.updateService(
        req.data.serviceId, req.data.endpoints, callback
      );
    case 'sync':
      return this._app.syncEndpoints(req.data, callback);
    default:
      debug('Unknown command');
  }
  setImmediate(callback);
}
Nginx.prototype.onRequest = onRequest;

function _cmd(action, callback) {
  var nginxConfdir = path.join(this._baseDir, 'nginx');
  var configFile = path.join(nginxConfdir, 'nginx.conf');

  var cmd = [this._nginxPath, '-p', nginxConfdir, '-c', configFile];
  if (action !== 'start') cmd.push('-s', action);

  debug('CMD: %s', cmd.join(' '));
  childProcess.exec(cmd.join(' '), function(err, stdout, stderr) {
    if (err) debug('error', err);
    debug('stdout: <\n%s>', stdout);
    debug('stderr: <\n%s>', stderr);
    if (callback) callback(err);
  });
}
Nginx.prototype._cmd = _cmd;

module.exports = Nginx;
