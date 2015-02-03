var fs = require('fs');
var fmt = require('util').format;
var path = require('path');
var mkdirp = require('mkdirp');

function genNginxConf(app, next) {
  var Endpoint = app.models.Endpoint;

  Endpoint.find({}, function(err, endpoints) {
    if (err) return next(err);

    var nginxConfdir = path.join(Endpoint.app.get('baseDir'), 'nginx');
    mkdirp(nginxConfdir, function(err) {
      if (err) return next(err);

      var templatePath = path.resolve(__dirname, './nginx-conf.txt');
      fs.readFile(templatePath, {encoding: 'utf8'}, function(err, template){
        if (err) return next(err);

        if (endpoints.length > 0) {
          var output = [];
          output.push('  upstream srvc_hosts {');
          for (var i in endpoints) {
            if (!endpoints.hasOwnProperty(i)) continue;
            var endpoint = endpoints[i];
            output.push(fmt('    server %s:%s;', endpoint.host, endpoint.port));
          }
          output.push('  }');

          template = template.replace('%%PROXY-PASS%%',
            'proxy_pass http://srvc_hosts');
          template = template.replace('%%UPSTREAM%%', output.join('\n'));
        } else {
          template = template.replace('%%UPSTREAM%%', '');
          template = template.replace('%%PROXY-PASS%%', 'return 503');
        }

        template = template.replace('%%NGINX-HOST%%', app.get('nginxHost'));
        template = template.replace('%%NGINX-PORT%%', app.get('nginxPort'));
        template = template.replace('%%NGINX-ROOT%%', app.get('nginxRoot'));

        fs.writeFile(path.join(nginxConfdir, 'nginx.conf'), template, next);
      });
    });
  });
}
module.exports = genNginxConf;
