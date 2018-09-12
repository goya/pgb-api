// MIT licensed from  https://github.com/koichik/node-tunnel
// Copyright (c) 2012 Koichi Kobayashi

const tls = require('tls')
const http = require('http')
const https = require('https')
const events = require('events')
const util = require('util')
const urlParse = require('url')
const merge = require('./misc').merge

let debug = () => true

module.exports = (url, events) => {
  let raw = url
  url = urlParse.parse(url)
  let agent = new TunnelingAgent({ proxy: { host: url.hostname, port: url.port, auth: url.auth, raw } })
  agent.request = (url.protocol === 'https:') ? https.request : http.request
  agent.createSocket = createSecureSocket
  if (events) debug = (str) => events.emit('debug', `PROXY: ${str}`)
  return agent
}

function TunnelingAgent(options) {
  let self = this
  self.options = options
  self.proxyOptions = self.options.proxy
}

util.inherits(TunnelingAgent, events.EventEmitter)

TunnelingAgent.prototype.addRequest = function addRequest(req, options) {
  let self = this
  options = merge({ request: req }, self.options, options)

  self.createSocket(options, function(socket) {
    req.onSocket(socket)
  })
}

TunnelingAgent.prototype.createSocket = function createSocket(options, cb) {
  let self = this

  let connectOptions = merge({}, self.proxyOptions, {
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

  debug(`making CONNECT request ${self.proxyOptions.raw}`, connectOptions)
  let connectReq = self.request(connectOptions)
  connectReq.once('connect', onConnect)
  connectReq.once('error', onError)
  connectReq.end()

  function onConnect(res, socket, head) {
    connectReq.removeAllListeners()
    socket.removeAllListeners()
    if (res.statusCode === 200) {
      debug('connection has been established')
      cb(socket)
    } else {
      socket.destroy()
      let error = new Error(`socket could not be established: statusCode=${res.statusCode}`)
      error.code = 'ECONNRESET'
      options.request.emit('error', error)
    }
  }

  function onError(cause) {
    let error = new Error(`socket could not be established: ${cause.message}`)
    error.code = 'ECONNRESET'
    options.request.emit('error', error)
  }
}

function createSecureSocket(options, cb) {
  let self = this
  TunnelingAgent.prototype.createSocket.call(self, options, function(socket) {
    let hostHeader = options.request.getHeader('host')
    let tlsOptions = merge({}, self.options, {
      socket: socket,
      servername: hostHeader.replace(/:.*$/, '')
    })

    let secureSocket = tls.connect(0, tlsOptions)
    cb(secureSocket)
  })
}
