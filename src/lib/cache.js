const NodeCache = require( "node-cache" );
const nodeCache = new NodeCache();

exports.get = (key) => {
  return Promise.resolve(nodeCache.get(key) || null);
}

exports.set = (key, data) => {
  return Promise.resolve(nodeCache.set(key, data));
}

exports.ttl = (key, seconds) => {
  return Promise.resolve(nodeCache.ttl(key, seconds));
}
