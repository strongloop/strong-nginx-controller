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
