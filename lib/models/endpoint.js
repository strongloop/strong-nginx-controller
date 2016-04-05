// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: strong-nginx-controller
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

'use strict';

module.exports = function(Endpoint) {
  function createEndpoint(endpointData, callback) {
    var Service = Endpoint.app.models.Service;

    // legacy api calls may not provide serviceId
    endpointData.serviceId = endpointData.serviceId || 1;

    Service.findById(endpointData.serviceId, function(err, service) {
      if (err) return callback(err);
      if (service) return createEndpointInstance(null, service);
      Service.create(
        {id: endpointData.serviceId},
        createEndpointInstance
      );

      function createEndpointInstance(err, service) {
        if (err) return callback(err);
        service.endpoints.create(
          {host: endpointData.host, port: endpointData.port},
          callback
        );
      }
    });
  }
  Endpoint.createEndpoint = createEndpoint;
};
