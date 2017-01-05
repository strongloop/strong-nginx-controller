// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: strong-nginx-controller
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

'use strict';

var async = require('async');
var childProcess = require('child_process');
var configHash = require('./nginx-conf').getConfigHash;
var debug = require('debug')('strong-nginx-controller:nginx');
var lodash = require('lodash');
var nginxConf = require('./nginx-conf').genNginxConf;
var path = require('path');

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
 * The reload function can be called multiple times and in parallel if updates
 * arrive from Central. This function de-bounces the reload calls in order to
 * prevent the nginx config from being corrupted by multiple read/write and
 * prevent multiple nginx restarts.
 */
Nginx.prototype.reload = lodash.debounce(_reload, 500, {
  leading: false,
  trailing: true,
  maxWait: 1 * 1000,
});

/**
 * Generate a new nginx config. But only reload nginx if the config has changed.
 */
function _reload(callback) {
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
Nginx.prototype._reload = _reload;

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

  var cmd = ['-p', nginxConfdir, '-c', configFile];
  if (action !== 'start') cmd.push('-s', action);

  debug('CMD: %s', cmd.join(' '));
  childProcess.execFile(this._nginxPath, cmd, function(err, stdout, stderr) {
    if (err) debug('error', err);
    debug('stdout: <\n%s>', stdout);
    debug('stderr: <\n%s>', stderr);
    if (callback) callback(err);
  });
}
Nginx.prototype._cmd = _cmd;

module.exports = Nginx;
