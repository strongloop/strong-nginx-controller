#!/usr/bin/env node
/* eslint no-process-exit:0 */

require('../lib/install')(process.argv, function(err) {
  process.exit( err ? 1 : 0 );
});
