var Stream = require('stream').Stream;
var amqp = require('amqp');

exports.create = function (publishToQueue, connOptions, implOptions) {
  var connection = amqp.createConnection(connOptions, implOptions);
  var connectionReady = false;
  
  connection.on('ready', function() {
    connectionReady = true;
  });

  var stream = new Stream();  

  stream.writeable = true;
  stream.write = function(log) {
    if (connectionReady) {
      connection.publish(publishToQueue, bunyanToGelf(log));
    }
  }
  stream.end = function(log) {
    if (arguments.length) stream.write(log);
    stream.writable = false
    connection.end();
  }

  return stream;
}


/*********************************************************
 Courtesy of https://github.com/mhart/gelf-stream
*********************************************************/
function mapGelfLevel(bunyanLevel) {
  switch (bunyanLevel) {
    case 10 /*bunyan.TRACE*/: return 7 /*gelf.DEBUG*/
    case 20 /*bunyan.DEBUG*/: return 7 /*gelf.DEBUG*/
    case 30 /*bunyan.INFO*/:  return 6 /*gelf.INFO*/
    case 40 /*bunyan.WARN*/:  return 4 /*gelf.WARN*/
    case 50 /*bunyan.ERROR*/: return 3 /*gelf.ERROR*/
    case 60 /*bunyan.FATAL*/: return 0 /*gelf.EMERGENCY*/
    default:                  return 4 /*gelf.WARN*/
  }
}

function flatten(obj, into, prefix, sep) {
  if (into == null) into = {}
  if (prefix == null) prefix = ''
  if (sep == null) sep = '.'
  var key, prop
  for (key in obj) {
    if (!obj.hasOwnProperty(key)) continue
    prop = obj[key]
    if (typeof prop === 'object' && !(prop instanceof Date) && !(prop instanceof RegExp))
      flatten(prop, into, prefix + key + sep, sep)
    else
      into[prefix + key] = prop
  }
  return into
}

function bunyanToGelf(log) {
  var errFile, key
    , ignoreFields = ['hostname', 'time', 'msg', 'name', 'level', 'v']
    , flattenedLog = flatten(log)
    , gelfMsg = {
        version:       "1.0",
        host:          log.hostname,
        timestamp:     +new Date(log.time) / 1000,
        short_message: log.msg,
        facility:      log.name,
        level:         mapGelfLevel(log.level),
        full_message:  JSON.stringify(log, null, 2)
      }

  if (log.err && log.err.stack &&
      (errFile = log.err.stack.match(/\n\s+at .+ \(([^:]+)\:([0-9]+)/)) != null) {
    if (errFile[1]) gelfMsg.file = errFile[1]
    if (errFile[2]) gelfMsg.line = errFile[2]
  }

  for (key in flattenedLog) {
    if (ignoreFields.indexOf(key) < 0 && gelfMsg[key] == null)
      gelfMsg[key] = flattenedLog[key]
  }

  return gelfMsg
}