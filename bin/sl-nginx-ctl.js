#!/usr/bin/env node
/* eslint no-console:0 no-process-exit:0 */

var Parser = require('posix-getopt').BasicParser;
var debug = require('debug')('strong-nginx-controller:ctl');
var mkdirp = require('mkdirp').sync;
var path = require('path');
var fs = require('fs');
var url = require('url');

var setup = require('../lib/server');

function printHelp(cmdName, prn) {
  var USAGE = fs.readFileSync(require.resolve('./sl-nginx-ctl.txt'), 'utf-8')
      .replace(/%MAIN%/g, cmdName)
      .trim();

  prn(USAGE);
}

var argv = process.argv;
var $0 = process.env.CMD ? process.env.CMD : path.basename(argv[1]);
var parser = new Parser([
    ':v(version)',
    'h(help)',
    'b:(base)',
    'c:(control)',
    'l:(listen)',
    'x:(nginx)'
  ].join(''),
  argv);

var base = '.strong-nginx-controller';
var controlUri = 'http://0.0.0.0:0';
var listenUri = 'http://0.0.0.0:8080';
var nginxPath = '/usr/sbin/nginx';
var nginxRoot = path.resolve(__dirname, '../lib/html/');
var option;

while ((option = parser.getopt()) !== undefined) {
  switch (option.option) {
    case 'v':
      console.log(require('./package.json').version);
      process.exit();
      break;
    case 'h':
      printHelp($0, console.log);
      process.exit();
      break;
    case 'b':
      base = option.optarg;
      break;
    case 'c':
      controlUri = option.optarg;
      break;
    case 'l':
      listenUri = option.optarg;
      break;
    case 'x':
      nginxPath = option.optarg;
      break;
    default:
      console.error('Invalid usage (near option \'%s\'), try `%s --help`.',
        option.optopt, $0);
      process.exit();
  }
}

base = path.resolve(base);

if (parser.optind() !== argv.length) {
  console.error('Invalid usage (extra arguments), try `%s --help`.', $0);
  process.exit();
}

if (controlUri === null) {
  console.error('Command API endpoint was not specified, try `%s --help`.', $0);
  process.exit();
}

var controlEndpoint = url.parse(controlUri);
debug('normalize control endpoint %j to %j', controlUri, controlEndpoint);

// Allow `http://:8888`
controlEndpoint.hostname = controlEndpoint.hostname || '0.0.0.0';
delete controlEndpoint.host;

var listenEndpoint = url.parse(listenUri);
debug('normalize listen endpoint %j to %j', listenUri, listenEndpoint);

// Allow `http://:8888`
listenEndpoint.hostname = listenEndpoint.hostname || '0.0.0.0';
delete listenEndpoint.host;

// Run from base directory, so files and paths are created in it.
mkdirp(base);
process.chdir(base);

var app = setup(base, nginxPath, controlEndpoint, listenEndpoint, nginxRoot);

app.on('listening', function(addr) {
  console.log('%s: control on http://%s:%s', $0, addr.address, addr.port);
  console.log('%s: nginx on  %s', $0, listenUri);
  console.log('%s: work base `%s`', $0, base);
});

app.start();
