const tunnel = require('../src/tunnel')
const server = require('./_helpers/fake-server')
const app = server.listen(3000, '0.0.0.0')
const http = require('http')
const net = require('net')

let proxy = http.createServer()
let error = false

proxy.on('connect', function(req, socket, head) {
  var addr = req.url.split(':')
  var conn = net.connect(addr[1] || 443, addr[0], function() {
    if (error) {
      socket.write('HTTP/' + req.httpVersion + ' 400 OK\r\n\r\n', 'UTF-8', function() {
        conn.pipe(socket)
        socket.pipe(conn)
      })
    } else {
      socket.write('HTTP/' + req.httpVersion + ' 200 OK\r\n\r\n', 'UTF-8', function() {
        conn.pipe(socket)
        socket.pipe(conn)
      })
    }
  })

  conn.on('error', function(e) {
    console.log('Server connection error: ' + e)
    socket.end()
  })
})

proxy.listen('8888', '0.0.0.0')

afterAll(() => {
  return Promise.all([
    new Promise((resolve) => app.close(resolve)),
    new Promise((resolve) => { proxy.close(); resolve() })
  ]).catch(console.error)
})

let oldBufferFrom = Buffer.from

afterEach(() => {
  Buffer.from = oldBufferFrom
})

describe('glob', () => {
  test('should return tunnel with proper args', (done) => {
    let agent = tunnel('http://user:password@localhost:8888')
    expect(agent.constructor.name).toEqual('TunnelingAgent')
    expect(agent.options).toEqual({ 'proxy': { 'auth': 'user:password', 'host': 'localhost', 'port': '8888', raw: 'http://user:password@localhost:8888' } })

    agent = tunnel('http://localhost:8888')
    http.get({ host: 'localhost', port: 3000, agent }, resp => {
      agent.destroy()
      done()
    }, done.fail)
  })

  test('should fail', (done) => {
    let agent = tunnel('http://user:password@localhost:8888')
    expect(agent.constructor.name).toEqual('TunnelingAgent')
    expect(agent.options).toEqual({ 'proxy': { 'auth': 'user:password', 'host': 'localhost', 'port': '8888', raw: 'http://user:password@localhost:8888' } })
    error = true
    agent = tunnel('http://a:b@localhost:8888')
    try {
      http.get({ host: 'localhost', port: 3000, agent }, (response, error) => {
        console.log(response, error)
        response.on('error', console.log)
        done.fail()
      }, done
      )
    } catch (e) {
      console.log(111111)
    }
  })

  test('should fail 2', (done) => {
    let agent = tunnel('http://user:password@localhost:8888')
    expect(agent.constructor.name).toEqual('TunnelingAgent')
    expect(agent.options).toEqual({ 'proxy': { 'auth': 'user:password', 'host': 'localhost', 'port': '8888', raw: 'http://user:password@localhost:8888' } })
    error = true
    agent = tunnel('http://a:b@localhost:8881')
    http.get({
      host: 'localhost', port: 3000, agent
    }, function(response, error) {
      done.fail()
    }, done
    )
  })

  test('should fail 3', (done) => {
    Buffer.from = Uint8Array.from
    let agent = tunnel('http://user:password@localhost:8888')
    expect(agent.constructor.name).toEqual('TunnelingAgent')
    expect(agent.options).toEqual({ 'proxy': { 'auth': 'user:password', 'host': 'localhost', 'port': '8888', raw: 'http://user:password@localhost:8888' } })
    error = true
    agent = tunnel('http://a:b@0.0.0.0:8881')
    http.get({
      host: 'localhost', port: 3000, agent
    }, function(response, error) {
      done.fail()
    }, done
    )
  })
})
