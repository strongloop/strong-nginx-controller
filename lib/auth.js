var auth = require('http-auth');
var crypto = require('crypto');
var fmt = require('util').format;

module.exports = makeAuthMiddleware;

var authMethods = {
  basic: makeBasicAuth,
  digest: makeDigestAuth,
  none: makeNoAuth
};

function makeAuthMiddleware(authStr) {
  var parts = (/^(basic|digest):(.+):(.+)$/).exec(authStr);
  var scheme = parts ? parts[1] : 'none';
  var user = parts && parts[2];
  var pass = parts && parts[3];
  var realm = 'strong-pm';
  return authMethods[scheme](user, realm, pass);
}

function makeNoAuth() {
  return function noop(req, res, next) {
    next();
  };
}

function makeBasicAuth(user, realm, pass) {
  var authenticator = auth.basic(
    {
      realm: realm
    },
    validate
  );
  return auth.connect(authenticator);

  function validate(maybeUser, maybePassword, cb) {
    cb(maybeUser === user && maybePassword === pass);
  }
}

function makeDigestAuth(user, realm, pass) {
  var H1 = md5(fmt('%s:%s:%s', user, realm, pass));
  var authenticator = auth.digest(
    {
      realm: realm,
      contentType: 'application/json'
    },
    digest
  );
  return auth.connect(authenticator);

  function digest(maybeUser, cb) {
    cb(maybeUser === user ? H1 : null);
  }
}

function md5(input) {
  var hash = crypto.createHash('md5');
  hash.update(input);
  return hash.digest('hex');
}
