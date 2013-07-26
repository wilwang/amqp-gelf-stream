amqp-gelf-stream
================

Creates a stream to work with bunyan to send log messages to an amqp server in gelf format.  This is derivative of [gelf-stream](https://github.com/mhart/gelf-stream) which provides a direct connection to a Graylog2 server.

Install
----------------
``` javascript
npm install amqp-gelf-stream
```

Example
----------------

``` javascript

var amqpStream = require('amqp-gelf-stream')
  , logger = require('bunyan');

var stream = amqpStream.create('myQueue', { host:'localhost', port:5672 });
var log = new logger({ 
  name: 'myLogger', 
  streams: [
    { 
      type: 'raw', 
      stream: stream, 
      level: 'info' 
    }
  ],
  serializers: {
    req: logger.stdSerializers.req,
    res: logger.stdSerializers.res
  }
});

log.info('hello world');

stream.end();

```
