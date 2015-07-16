'use strict';

var async = require('async');

module.exports = function(Config) {
  Config.disableRemoteMethod('find', true);
  Config.disableRemoteMethod('exists', true);
  Config.disableRemoteMethod('findById', true);
  Config.disableRemoteMethod('count', true);
  Config.disableRemoteMethod('findOne', true);
  Config.disableRemoteMethod('create', true);
  Config.disableRemoteMethod('upsert', true);
  Config.disableRemoteMethod('updateAttributes');
  Config.disableRemoteMethod('deleteById', true);
  Config.disableRemoteMethod('updateAll', true);

  function setEndpoints(endpoints, callback) {
    var Endpoint = Config.app.models.Endpoint;
    var Service = Config.app.models.Service;

    // Cleanup all models before creating new endpoints
    Service.destroyAll(function(err) {
      if (err) return callback(err);
      Endpoint.destroyAll(function(err) {
        if (err) return callback(err);
        async.eachSeries(
          endpoints,
          Endpoint.createEndpoint.bind(Endpoint),
          function(err) {
            if (err) return callback(err);
            Endpoint.app._reloadNginx(callback);
          }
        );
      });
    });
  }
  Config.setEndpoints = setEndpoints;

  Config.remoteMethod(
    'setEndpoints',
    {
      accepts: {arg: 'endpoints', type: ['Endpoint']},
      returns: {arg: 'message', type: 'string'}
    }
  );
};
