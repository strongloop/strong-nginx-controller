var uuid = require('uuid');

module.exports = function(Endpoint) {
  function defaultId() {
    return uuid.v4();
  }
  Endpoint.definition.properties.id.default = defaultId;
};
