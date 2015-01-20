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

  Config.setEndpoints = function(endpoints, next) {
    var Endpoint = Config.app.models.Endpoint;
    Endpoint.deleteAll(function(err) {
      if (err) return next(err);
      Endpoint.create(endpoints, function(err) {
        if (err) return next(err);
        Endpoint.app._reloadNginx(next);
      });
    });
  };

  Config.remoteMethod(
    'setEndpoints',
    {
      accepts: {arg: 'endpoints', type: ['Endpoint']},
      returns: {arg: 'message', type: 'string'}
    }
  );
};
