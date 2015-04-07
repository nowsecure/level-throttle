var async   = require('async');
var crypto  = require('crypto');
var levelup = require('levelup');
var lodash  = require('lodash');
var should  = require('should');
var db      = levelup('/does/not/matter', {
  db            : require('memdown'),
  valueEncoding : 'json',
});

var throttleConstructor = require('../index');

// constructor to build configs
var Config = function() {
  return {
    namespace : 'test-namespace' ,
    limit     : 3,
    ttl       : 50, // 50ms for the purposes of testing only
    db        : db,
  };
};

// returns a random throttle key
var throttleKey = function() {
  return crypto.randomBytes(12).toString('hex');
};

// assert that the module initializes properly
describe('initialization', function() {

  it ('should initialize successfully with proper configs', function() {
    var config = new Config();
    throttleConstructor.bind(null, config).should.not.throw();
  });

  it ('should throw if configs are not provided', function() {
    throttleConstructor.should.throw(/config/);
  });

  it ('should throw if `config.namespace` is unspecified', function() {
    var config = new Config();
    delete config.namespace;
    throttleConstructor.bind(null, config).should.throw(/namespace/);
  });

  it ('should throw if `config.limit` is unspecified', function() {
    var config = new Config();
    delete config.limit;
    throttleConstructor.bind(null, config).should.throw(/limit/);
  });

  it ('should throw if `config.ttl` is unspecified', function() {
    var config = new Config();
    delete config.ttl;
    throttleConstructor.bind(null, config).should.throw(/ttl/);
  });

  it ('should throw if `config.db` is unspecified', function() {
    var config = new Config();
    delete config.db;
    throttleConstructor.bind(null, config).should.throw(/db/);
  });

  it ('should throw if `config.limit` is not a number', function() {
    var config = new Config();
    config.limit = '10';
    throttleConstructor.bind(null, config).should.throw(/`limit` must be a number/);
  });

  it ('should throw if `config.ttl` is not a number', function() {
    var config = new Config();
    config.ttl = '6000';
    throttleConstructor.bind(null, config).should.throw(/`ttl` must be a number/);
  });

  it ('should not throw if `config.limit` equals 0', function() {
    var config   = new Config();
    config.limit = 0;
    throttleConstructor.bind(null, config).should.not.throw();
  });

  it ('should not throw if `config.ttl` equals 0', function() {
    var config = new Config();
    config.ttl = 0;
    throttleConstructor.bind(null, config).should.not.throw();
  });

});

// assert that optional overrides are respected
describe('overrides', function() {

  it ('`config.limit` should be overridable per throttle key', function(done) {
    var key      = throttleKey();
    var throttle = function(n, callback) {
      var t = throttleConstructor(new Config());
      return t(key, { limit : 2 }, callback);
    };

    async.timesSeries(5, throttle, function(err, tokens) {
      lodash.isEqual(tokens, [2, 1, 0, 0, 0]).should.be.true;
      done();
    });
  });

  it ('`config.ttl` should be overridable per throttle key', function(done) {
    var key      = throttleKey();
    var throttle = function(n, callback) {
      var t = throttleConstructor(new Config());
      return t(key, { ttl : 25 }, callback);
    };

    async.timesSeries(5, throttle, function(err, tokens) {
      lodash.isEqual(tokens, [3, 2, 1, 0, 0]).should.be.true;

      // delay for 30 ms, then fetch another token
      setTimeout(function() {
        throttle(key, function(err, tokens) {
          should(err).not.be.ok;
          tokens.should.equal(3);
          done();
        })
      }, 30);
    });

  });
});

// assert that the core throttling mechanism works
describe('throttling', function() {

  it ('should remove a token with each invokation', function(done) {
    var key      = throttleKey();
    var throttle = function(n, callback) {
      var t = throttleConstructor(new Config());
      return t(key, callback);
    };

    async.timesSeries(5, throttle, function(err, tokens) {
      lodash.isEqual(tokens, [3, 2, 1, 0, 0]).should.be.true;
      done();
    });
  });

  it ('should refill the bucket after the appropriate length of time', function(done) {
    var key      = throttleKey();
    var throttle = function(n, callback) {
      var t = throttleConstructor(new Config());
      return t(key, callback);
    };

    async.timesSeries(5, throttle, function(err, tokens) {
      lodash.isEqual(tokens, [3, 2, 1, 0, 0]).should.be.true;

      // delay for 60ms then fetch another token
      setTimeout(function() {
        throttle(key, function(err, tokens) {
          should(err).not.be.ok;
          tokens.should.equal(3);
          done();
        })
      }, 60);

    });
  });

});
