
/*
 * Module dependencies
 */

var request = require('superagent');
var endpoints = require('./endpoints.json');

/*
 * Exports the constructor
 */

module.exports = function(api_key, base_url) {
  if(api_key) return new MovieDB(api_key, base_url);
  else throw new Error('Bad api key');
};

/*
 * Constructor
 */

function MovieDB(api_key, base_url) {
  this.api_key = api_key;
  if(base_url) endpoints.base_url = base_url;
  return this;
}

/*
 * API auth
 */

MovieDB.prototype.requestToken = function(fn){
  var self = this;

  request
  .get(endpoints.base_url  + endpoints.authentication.requestToken)
  .query({'api_key': self.api_key})
  .set('Accept', 'application/json')
  .end(function(res){
    if(!res.ok) return fn(res.error);
    self.token = res.body;
    fn();
  }).on('error', function(error){
    fn(error);
  });

  return this;
};

/*
 * Generate API methods
 */

Object.keys(endpoints.methods).forEach(function(method){
  var met = endpoints.methods[method];
  Object.keys(met).forEach(function(m){
    MovieDB.prototype[method + m] = function(params, fn){
      var self = this;

      if("function" == typeof params) {
        fn = params;
        params = {};
      }

      if(!this.token || Date.now() > +new Date(this.token.expires_at)) {
        this.requestToken(function(err){
          if(err) return fn(err);
          execMethod.call(self, met[m].method, params, met[m].resource, fn);
        });    
      } else {
        execMethod.call(this, met[m].method, params, met[m].resource, fn);
      } 

      return this;
    };
  });
});

var execMethod = function(type, params, endpoint, fn){
  params = params || {};
  endpoint = endpoint.replace(':id', params.id).replace(':season_number', params.season_number).replace(':episode_number', params.episode_number);
  type = type.toUpperCase();
  
  var req = request(type, endpoints.base_url + endpoint)
            .query({api_key : this.api_key})
            .set('Accept', 'application/json');

  if(type === 'GET')
    req.query(params);
  else
    req.send(params);

  req.end(function(res){
    if(res.ok) fn(null, res.body);
    else fn(res.error, null);
  });

  req.on('error', fn);
};
