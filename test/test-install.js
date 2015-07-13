'use strict';

var exec = require('child_process').exec;
var fmt = require('util').format;
var install = require('../bin/sl-nginx-ctl-install');
var path = require('path');
var tap = require('tap');

var user = 'nobody';
var group = 'nobody';

tap.test('user id', function(t) {
  exec('id -un', function(err, stdout) {
    t.ifError(err, 'getting current user');
    user = stdout.trim();
    t.end();
  });
});

tap.test('group id', function(t) {
  exec('id -gn', function(err, stdout) {
    t.ifError(err, 'getting current group');
    group = stdout.trim();
    t.end();
  });
});

// the rest of these tests use the require()'d version, this is to make sure
// that it remains runnable directly as well
tap.test('version', function(t) {
  var cmd = fmt('%s --version', require.resolve('../bin/sl-nginx-ctl-install'));
  exec(cmd, function(err, stdout) {
    // stdout = stdout.toString('utf8');
    t.ifError(err, 'should not fail');
    t.match(stdout.trim(), require('../package.json').version,
            'should output version');
    t.end();
  });
});

tap.test('help', function(t) {
  var lines = [];
  install.log = logTo(lines);
  install.error = logTo(lines);
  install(installCmd('--help'), function(err) {
    var output = lines.join('\n');
    t.ifError(err, 'should not fail');
    t.match(output, /Options:/i, 'should list usage');
    t.end();
  });
});

tap.test('bad platform', function(t) {
  var lines = [];
  install.platform = 'not-linux';
  install.ignorePlatform = false;
  install.log = logTo(lines);
  install.error = logTo(lines);
  install(installCmd('--upstart', '10.10'), function(err) {
    var output = lines.join('\n');
    t.match(err, Error(), 'should fail');
    t.match(output, /Unsupported platform/i, 'should complain about platform');
    t.end();
  });
});

tap.test('extra args', function(t) {
  var lines = [];
  install.log = logTo(lines);
  install.error = logTo(lines);
  install(installCmd('extra-args'), function(err) {
    var output = lines.join('\n');
    t.match(err, Error(), 'should fail');
    t.match(output, /extra arguments/i, 'should complain about usage');
    t.end();
  });
});

tap.test('invalid args', function(t) {
  var lines = [];
  install.log = logTo(lines);
  install.error = logTo(lines);
  install(installCmd('--systemd', '--unknown'), function(err) {
    var output = lines.join('\n');
    t.match(err, Error(), 'should fail');
    t.match(output, /near option/i, 'should complain about usage');
    t.end();
  });
});

tap.test('dry-run', function(t) {
 var lines = [];
 install.log = logTo(lines);
 install.error = logTo(lines);
 install.ignorePlatform = true;
 var args = installCmd(
   '--dry-run',
   '--force',
   '--base', __dirname,
   '--control', 'http://:8910',
   '--listen', 'http://:80',
   '--job-file', path.join(__dirname, 'upstart-test.conf')
 );

 install(args, function(err) {
   var output = lines.join('\n');
   t.ifError(err, 'should not fail');
   t.match(output, /dry-run mode/i, 'should notice dry-run mode');
   t.match(output, /strong-nginx-controller installed/, 'should claim success');
   t.end();
 });
});

function installCmd() {
  return [
    'execPath', 'installer.js',
    '--user', user,
    '--group', group,
  ].concat([].slice.apply(arguments));
}

function logTo(lineBuffer) {
  return log;

  function log() {
    lineBuffer.push(fmt.apply(null, arguments));
  }
}
