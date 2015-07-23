var nginxConf = require('./nginx-conf');
var path = require('path');
var debug = require('debug')('strong-nginx-controller:nginx');
var childProcess = require('child_process');
var async = require('async');

function Nginx(options) {
  this._app = options.app;
  this._nginxPath = options.nginxPath;
  this._baseDir = options.baseDir;
  this._nginxConf = nginxConf.bind(null, options);
}

function start(callback) {
  async.series([
    this._nginxConf,
    this._cmd.bind(this, 'reload')
  ], callback);
}
Nginx.prototype.start = start;
Nginx.prototype.reload = start;

function stop(callback) {
  this._cmd('stop', callback);
}
Nginx.prototype.stop = stop;

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
    callback(err);
  });
}
Nginx.prototype._cmd = _cmd;

module.exports = Nginx;
