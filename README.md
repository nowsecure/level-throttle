level-throttle
==============
`level-throttle` is a dead-simple [token-bucket][]-based throttling mechanism
built on `levelup`. It was initially designed to provide throttled access
control to API endpoints, but can in fact be used to regulate access to any
resource.

`level-throttle` works by simply counting the number of "tokens" remaining in
the "bucket" associated with an aribtrarily-specified "throttle key". Each time
a throttled resource is accessed, a token is removed from the associated
bucket. If the number of tokens in the bucket reaches zero, the consumer has
exhaused access to the throttled resource. The bucket is automatically refilled
when appropriate.

Usage
-----
### Initializing ###
`require` and invoke the module while specifying some configuration options:

```javascript

// boostrap level
var level = require('level');
var db    = level('./mydb', { valueEncoding : 'json' });

// initialize the `throttle` function
var throttle = require('level-throttle')({
  db        : db,
  namespace : 'the-app-name' ,
  limit     : 100,
  ttl       : 1000 * 60 * 60, // one hour
});
```

Whereby:

- `db` is any `levelup`-compliant handle.
- `namespace` is a namespace that should prefix all leveldb keys. This makes it
  possible to use this module to throttle multiple applications without the
  risk of interference among applications. It is probably sensible for
  `namespace` to be the name of the app itself.
- `limit` is the maximum number of throttled calls that may be made within
  `ttl`.
- `ttl` (time-to-live) is the interval after which the bucket should be
  re-stocked with tokens. Its value must be specified in milliseconds.

An `Error` will be thrown if any of the configs are invalid.

### Invoking ###
Next, simply invoke the initialized function:

```javascript
throttle('some-throttle-key', function(err, tokens) {
  // if `tokens` is `0`, respond with an HTTP `429`
});
```

The function does one thing: it reports the number of tokens remaining in the
bucket for the specified throttle key. If there are `0` tokens remaining, the
user has consumed all of his allocated throttle requests for the `ttl`.

#### Overriding Config ####
The `ttl` and `limit` values can optionally be overridden when the function is
invoked, thus making it possible to set different access controls per throttle
key. To do so, simply pass the function a map of override options thusly:

```javascript
throttle('different-throttle-key', { ttl : 60000, limit: 1337 }, function(err, tokens) {
  // this user will be allotted 1337 tokens per minute
});
```
#### Bucket TTLs ####
`ttl` values will be passed to the underlying `levelup` handle with which
`level-throttle` was initialized (`db`). This means that, if the handle makes
use of a module like [level-ttl][] to automatically purge expired buckets from
the database, that expiration mechanism will work as expected. The use of such
a module is not required, however.

[level-ttl]: https://www.npmjs.com/package/level-ttl
[token-bucket]: https://en.wikipedia.org/wiki/Token_bucket
