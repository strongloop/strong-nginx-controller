// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: strong-nginx-controller
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

'use strict';

var async = require('async');
var debug = require('debug')('strong-nginx-controller:model:config');

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

  // Legacy REST endpoint, used by Arc
  Config.remoteMethod(
    'setEndpoints',
    {
      accepts: {arg: 'endpoints', type: ['Endpoint']},
      returns: {arg: 'message', type: 'string'}
    }
  );

  function setEndpoints(endpoints, callback) {
    var Endpoint = Config.app.models.Endpoint;

    // Cleanup all models before creating new endpoints
    Config.clean(null, function(err) {
      if (err) return callback(err);
      async.eachSeries(
        endpoints,
        Endpoint.createEndpoint.bind(Endpoint),
        function(err) {
          if (err) return callback(err);
          Endpoint.app.reload(callback);
        }
      );
    });
  }
  Config.setEndpoints = setEndpoints;

  function clean(serviceId, callback) {
    debug('Cleaning endpoints for service: ', serviceId ? serviceId : 'all');
    var Endpoint = Config.app.models.Endpoint;
    var Service = Config.app.models.Service;

    var filter = {};
    if (serviceId) filter = {id: serviceId};

    // Cleanup all models before creating new endpoints
    Service.destroyAll(filter, function(err) {
      if (err) return callback(err);

      filter = {};
      if (serviceId) filter = {serviceId: serviceId};
      Endpoint.destroyAll(filter, callback);
    });
  }
  Config.clean = clean;
};
