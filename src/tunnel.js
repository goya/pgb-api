// MIT licensed from  https://github.com/koichik/node-tunnel
// Copyright (c) 2012 Koichi Kobayashi

const tls = require('tls')
const http = require('http')
const https = require('https')
const events = require('events')
const util = require('util')
const urlParse = require('url')
const assert = require('assert')
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

let debug = () => true

module.exports = (url, events) => {
  url = urlParse.parse(url)
  var agent = new TunnelingAgent({ proxy: { host: url.hostname, port: url.port, auth: url.auth } })
  agent.request = (url.protocol === 'https:') ? https.request : http.request
  agent.createSocket = createSecureSocket
  if (events) debug = (str) => events.emit('debug', `PROXY: ${str}`)
  return agent
}

function TunnelingAgent(options) {
  var self = this
  self.options = options || {}
  self.proxyOptions = self.options.proxy || {}
  self.maxSockets = self.options.maxSockets || http.Agent.defaultMaxSockets
  self.requests = []
  self.sockets = []

  self.on('free', function onFree(socket, options) {
    for (var i = 0, len = self.requests.length; i < len; ++i) {
      var pending = self.requests[i]
      if (pending.host === options.host && pending.port === options.port) {
        self.requests.splice(i, 1)
        pending.request.onSocket(socket)
        return
      }
    }
    socket.destroy()
    self.removeSocket(socket)
  })
}
util.inherits(TunnelingAgent, events.EventEmitter)

TunnelingAgent.prototype.addRequest = function addRequest(req, options) {
  var self = this
  options = mergeOptions({request: req}, self.options, options)

  if (self.sockets.length >= this.maxSockets) {
    self.requests.push(options)
    return
  }

  self.createSocket(options, function(socket) {
    socket.on('free', onFree)
    socket.on('close', onCloseOrRemove)
    socket.on('agentRemove', onCloseOrRemove)
    req.onSocket(socket)

    function onFree() {
      self.emit('free', socket, options)
    }

    function onCloseOrRemove() {
      self.removeSocket(socket)
      socket.removeListener('free', onFree)
      socket.removeListener('close', onCloseOrRemove)
      socket.removeListener('agentRemove', onCloseOrRemove)
    }
  })
}

TunnelingAgent.prototype.createSocket = function createSocket(options, cb) {
  var self = this
  var placeholder = {}
  self.sockets.push(placeholder)

  var connectOptions = mergeOptions({}, self.proxyOptions, {
    method: 'CONNECT',
    path: options.host + ':' + options.port,
    agent: false
  })

  if (connectOptions.auth) {
    connectOptions.headers = connectOptions.headers || {}
    let enc = connectOptions.auth
    if (Buffer.from !== Uint8Array.from) {
      enc = Buffer.from(enc)
    } else {
      enc = new Buffer(enc) // eslint-disable-line node/no-deprecated-api
    }
    connectOptions.headers['Proxy-Authorization'] = `Basic ${enc.toString('base64')}`
  }

  debug('making CONNECT request')
  var connectReq = self.request(connectOptions)
  connectReq.once('connect', onConnect)
  connectReq.once('error', onError)
  connectReq.end()

  function onConnect(res, socket, head) {
    connectReq.removeAllListeners()
    socket.removeAllListeners()
    if (res.statusCode === 200) {
      assert.equal(head.length, 0)
      debug('connection has been established')
      self.sockets[self.sockets.indexOf(placeholder)] = socket
      cb(socket)
    } else {
      socket.destroy()
      var error = new Error(`socket could not be established: statusCode=${res.statusCode}`)
      error.code = 'ECONNRESET'
      options.request.emit('error', error)
      self.removeSocket(placeholder)
    }
  }

  function onError(cause) {
    connectReq.removeAllListeners()

    var error = new Error(`socket could not be established: ${cause.message}`)
    error.code = 'ECONNRESET'
    options.request.emit('error', error)
    self.removeSocket(placeholder)
  }
}

TunnelingAgent.prototype.removeSocket = function removeSocket(socket) {
  var pos = this.sockets.indexOf(socket)
  if (pos === -1) {
    return
  }
  this.sockets.splice(pos, 1)

  var pending = this.requests.shift()
  if (pending) {
    this.createSocket(pending, function(socket) {
      pending.request.onSocket(socket)
    })
  }
}

function createSecureSocket(options, cb) {
  var self = this
  TunnelingAgent.prototype.createSocket.call(self, options, function(socket) {
    var hostHeader = options.request.getHeader('host')
    var tlsOptions = mergeOptions({}, self.options, {
      socket: socket,
      servername: hostHeader ? hostHeader.replace(/:.*$/, '') : options.host
    })

    var secureSocket = tls.connect(0, tlsOptions)
    self.sockets[self.sockets.indexOf(socket)] = secureSocket
    cb(secureSocket)
  })
}

function mergeOptions(target) {
  for (var i = 1, len = arguments.length; i < len; ++i) {
    var overrides = arguments[i]
    if (typeof overrides === 'object') {
      var keys = Object.keys(overrides)
      for (var j = 0, keyLen = keys.length; j < keyLen; ++j) {
        var k = keys[j]
        if (overrides[k] !== undefined) {
          target[k] = overrides[k]
        }
      }
    }
  }
  return target
}
