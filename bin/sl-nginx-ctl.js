#!/usr/bin/env node
/* eslint no-console:0 no-process-exit:0 */

var Parser = require('posix-getopt').BasicParser;
var defaults = require('strong-url-defaults');
var fs = require('fs');
var mkdirp = require('mkdirp').sync;
var path = require('path');

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
    'L:(api)',
    'n(no-api)',
    'C:(control)',
    'R:(routable-addr)',
    'x:(nginx)'
  ].join(''),
  argv);

var base = '.strong-nginx-controller';
var apiEndpoint = 'http://';
var disableApi = false;
var routableEndpoint = 'http://';
var controlUri = null;
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
    case 'C':
      controlUri = option.optarg;
      break;
    case 'L':
      apiEndpoint = option.optarg;
      break;
    case 'n':
      disableApi = true;
      break;
    case 'R':
      routableEndpoint = option.optarg;
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

if (disableApi && !controlUri) {
  console.error(
    'Must either connect to a control point (-C) or ' +
    'listen for API requests (-L), try `%s --help`.', $0
  );
  process.exit();
}

if (!disableApi) {
  apiEndpoint = defaults(apiEndpoint, {
    host: '0.0.0.0',
    port: 8702,
  });
}

routableEndpoint = defaults(routableEndpoint, {
  host: '0.0.0.0',
  port: 8080,
});

if (controlUri) {
  controlUri = defaults(controlUri, {
    host: '127.0.0.1',
    port: 8701,
  }, {
    protocol: 'ws',
    path: 'gateway-control',
  });
}

// Run from base directory, so files and paths are created in it.
mkdirp(base);
process.chdir(base);

var app = setup({
  baseDir: base,
  nginxPath: nginxPath,
  nginxRoot: nginxRoot,
  routableEndpoint: routableEndpoint,
  apiEndpoint: disableApi ? null : apiEndpoint,
  controlUri: controlUri,
});

app.on('started', function() {
  console.log('%s: nginx on  %s', $0, routableEndpoint);
  console.log('%s: work base `%s`', $0, base);
  if (controlUri) {
    console.log('%s: connecting to Central server `%s`', $0, controlUri);
  }
});

app.on('listening', function(addr) {
  console.log('%s: API on http://%s:%s', $0, addr.address, addr.port);
});

app.start();
