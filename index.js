var levelKey = require('level-key');

// This exported function must itself first be invoked in order to curry a new
// function (`throttle()`) that will actually perform the throttling.
module.exports = function(config) {

  // assert that configs have been provided
  if (!config) {
    throw new Error('level-throttle: must initialize with config.');
  }

  // assert that the required config values have been provided
  ['db', 'limit', 'namespace', 'ttl'].forEach(function(property) {

    if (typeof config[property] === 'undefined') {
      throw new Error(
        [
          'level-throttle: must be initialized with `',
          property,
          '` property.',
        ].join('')
      );
    }
  });

  // assert that `limit` and `ttl` are numbers
  ['limit', 'ttl'].forEach(function(property) {

    if (typeof config[property] !== 'number') {
      throw new Error('level-throttle: `' +  property + '` must be a number.');
    }

  });

  var db = config.db;

  // curry the function that performs the throttling
  var throttle = function(throttleKey, options, callback) {

    // make the options optional
    if (typeof options === 'function') {
      callback = options;
      options  = {};
    }

    // initialize vars. `options` overrides `config`
    var limit = (options.limit !== undefined) ? options.limit : config.limit ;
    var ttl   = (options.ttl   !== undefined) ? options.ttl   : config.ttl ;

    // assemble the leveldb key
    var key = levelKey(config.namespace, 'throttle', throttleKey);

    // check to see if the key has already been set
    db.get(key, function(err, bucket) {

      // fail on any errors other than "not found"
      if (err && !err.notFound ) { return callback(err); }

      // if the bucket was not found, create it, and fill it with the maximum
      // number of tokens
      if (!bucket) {
        return db.put(key, createBucket(), { ttl : ttl }, function(err) {
          callback(err, err || limit);
        });
      }

      // if the bucket was found, remove a token
      var data = createBucket(bucket.created, Math.max(bucket.tokens - 1, 0));

      // Re-calculate the TTL value based on how much time has passed since
      // the bucket was initially created.
      var newTTL = ttl - (Date.now() - bucket.created);

      // If the bucket's TTL has expired, create the bucket anew.
      if (newTTL <= 0) {
        newTTL = ttl;
        data   = createBucket();
      }

      // write the updated bucket to the database
      db.put(key, data, { ttl : newTTL }, function(err) {
        callback(err, err || data.tokens);
      });
    });

    function createBucket(created, tokens) {
      return {
        created : created !== undefined ? created : Date.now(),
        tokens  : tokens  !== undefined ? tokens  : limit,
      };
    }
  };

  // return the curried throttling function
  return throttle;
};
