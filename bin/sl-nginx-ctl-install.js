#!/usr/bin/env node

var Parser = require('posix-getopt').BasicParser;
var fs = require('fs');
var path = require('path');
var slServiceInstall = require('strong-service-install');

module.exports = install;
install.log = console.log;
install.error = console.error;
install.platform = process.platform;
install.$0 = process.env.CMD || path.basename(process.argv[1]);
install.execPath = process.execPath;
install.slSvcInstall = slServiceInstall;

if (require.main === module) {
  install(process.argv, function(err) {
    process.exit(err ? 1 : 0);
  });
}

function printHelp($0, prn) {
  var usageFile = require.resolve('./sl-nginx-ctl-install.txt');
  var USAGE = fs.readFileSync(usageFile, 'utf-8')
                .replace(/%MAIN%/g, $0)
                .trim();
  prn(USAGE);
}

function install(argv, callback) {
  var $0 = install.$0;
  var parser = new Parser([
      ':v(version)',
      'h(help)',
      'b:(base)',
      'u:(user)',
      'g:(group)',
      'c:(control)',
      'l:(listen)',
      'j:(job-file)',
      'n(dry-run)',
      'f(force)',
      'x(nginx)',
      'i:(upstart)', // -i unused, posix-getopt doesn't do long-only options
      's(systemd)',
    ].join(''),
    argv);

  var jobConfig = {
    user: 'strong-nginx-controller',
    group: 'strong-nginx-controller',
    // this should be options.cwd from fillInHome
    ctlBaseDir: '.strong-nginx-controller',
    controlUri: 'http://0.0.0.0:0',
    listenUri: 'http://0.0.0.0:8080',
    dryRun: false,
    jobFile: null, // strong-service-install provides an init-specific default
    force: false,
    nginx: '/usr/sbin/nginx',
    upstart: false,
    systemd: false
  };

  var option;
  while ((option = parser.getopt()) !== undefined) {
    switch (option.option) {
      case 'v':
        install.log(require('../package.json').version);
        return callback();
      case 'h':
        printHelp($0, install.log);
        return callback();
      case 'b':
        jobConfig.ctlBaseDir = option.optarg;
        break;
      case 'c':
        jobConfig.controlUri = option.optarg;
        break;
      case 'l':
        jobConfig.listenUri = option.optarg;
        break;
      case 'u':
        jobConfig.user = option.optarg;
        break;
      case 'g':
        jobConfig.group = option.optarg;
        break;
      case 'j':
        jobConfig.jobFile = option.optarg;
        break;
      case 'n':
        jobConfig.dryRun = true;
        break;
      case 'f':
        jobConfig.force = true;
        break;
      case 'i': // actually --upstart
        jobConfig.upstart = option.optarg;
        break;
      case 's':
        jobConfig.systemd = true;
        break;
      default:
        install.error('Invalid usage (near option \'%s\'), try `%s --help`.',
          option.optopt, $0);
        return callback(Error('usage'));
    }
  }

  if (parser.optind() !== argv.length) {
    install.error('Invalid usage (extra arguments), try `%s --help`.', $0);
    return callback(Error('usage'));
  }

  jobConfig.name = 'strong-nginx-controller';
  jobConfig.description = 'StrongLoop Nginx Controller';

  slServiceInstall.log = install.log;
  slServiceInstall.error = install.error;
  slServiceInstall.$0 = install.$0;
  slServiceInstall.platform = install.platform;
  slServiceInstall.ignorePlatform = install.ignorePlatform;

  if (jobConfig.ctlBaseDir) {
    jobConfig.ctlBaseDir = path.resolve(jobConfig.ctlBaseDir);
    jobConfig.dirs = [jobConfig.ctlBaseDir];
  }

  jobConfig.command = [
    install.execPath,
    require.resolve('./sl-nginx-ctl'),
    '--control', jobConfig.controlUri,
    '--listen', jobConfig.listenUri,
    '--base', jobConfig.ctlBaseDir || '.',
  ];

  return install.slSvcInstall(jobConfig, report);

  function report(err) {
    if (err) {
      install.error('Error installing service \'%s\':',
                    jobConfig.name, err.message);
    }
    return callback(err);
  }
}
