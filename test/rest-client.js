const restClient = require('../src/rest-client')
const fs = require('fs')
const server = require('./_helpers/fake-server')
const app = server.listen(3000, '0.0.0.0')
const reqs = jest.spyOn(server, 'requestLogger')
const lastReq = () => reqs.mock.calls[reqs.mock.calls.length - 1][0]

jest.mock('https', () => {
  return require('http')
})

afterEach(() => {
  jest.clearAllMocks()
})

afterAll(() => {
  return new Promise((resolve, reject) => app.close(resolve))
})

describe('rest-client', () => {
  test('exports these 4 functions', () => {
    expect(restClient).toHaveProperty('del')
    expect(restClient).toHaveProperty('get')
    expect(restClient).toHaveProperty('put')
    expect(restClient).toHaveProperty('post')
  })
})

describe('#get', () => {
  test('use http for http url and https for https url', () => {
    let spy1 = jest.spyOn(require('http'), 'request')
    let spy2 = jest.spyOn(require('https'), 'request')

    return restClient.get('http://localhost:3000/page1')
      .then((response) => expect(response).toBe('A page'))
      .then(() => expect(spy1).toBeCalled())
      .then(() => restClient.get('https://localhost:3000/page1'))
      .then((response) => expect(response).toBe('A page'))
      .catch(() => { /* it will fail the get */ })
      .then(() => expect(spy2).toBeCalled())
  })

  test('should get simple html', () =>
    restClient.get('http://localhost:3000/page1')
      .then((response) => expect(response).toBe('A page'))
  )

  test('should follow absolute redirect', () =>
    restClient.get('http://localhost:3000/absolute_redirect')
      .then((response) => expect(response).toBe('A page'))
  )

  test('should follow relative redirect', () =>
    restClient.get('http://localhost:3000/relative_redirect')
      .then((response) => expect(response).toBe('A page'))
  )

  test('should clear authorization headers on redirect', () =>
    restClient.get('http://localhost:3000/google', { headers: { Authorization: 'abcdef' } })
      .then((response) => {
        expect(reqs.mock.calls[0][0].headers.authorization).toBe('abcdef')
        expect(lastReq().headers.authorization).toBeUndefined()
      })
  )

  test('should handle json', () =>
    restClient.get('http://localhost:3000/json')
      .then((response) => expect(response).toEqual({key: 12}))
  )

  test('should handle 404', (done) =>
    restClient.get('http://localhost:3000/404')
      .then(() => done.fail('didnt throw 404'))
      .catch((err) => {
        expect(err).toEqual(new Error('404: File Not Found'))
        expect(err.statusCode).toEqual(404)
      })
      .then(done)
  )

  describe('files', () => {
    test('should redirect output to pipe if present in save', () =>
      restClient.get('http://localhost:3000/page1', { save: fs.createWriteStream('/downloaded_file.zip') })
        .then(() =>
          expect(fs.existsSync('/downloaded_file.zip')).toBeTruthy()
        )
    )

    test('should save response to file if string specified in save', () =>
      restClient.get('http://localhost:3000', { save: '/' })
        .then(() =>
          expect(fs.existsSync('/app.download')).toBeTruthy()
        )
    )

    test('should save response with custom filename', () =>
      restClient.get('http://localhost:3000/page1', { save: '/custom_filename' })
        .then(() =>
          expect(fs.existsSync('/custom_filename')).toBeTruthy()
        )
    )

    test('should save to dir if dir exists', () => {
      fs.mkdirSync('/foo')
      return restClient.get('http://localhost:3000/page1', { save: '/foo' })
        .then(() =>
          expect(fs.existsSync('/foo/page1')).toBeTruthy()
        )
    })

    test('should reject with error if bad dir', (done) => {
      fs.openSync = jest.fn(() => { throw new Error('bad file') })
      return restClient.get('http://localhost:3000/page1', { save: '/a/b/c' })
        .then(() => done.fail('save was successful'))
        .catch((e) => {
          expect(e.toString()).toMatch('bad file')
          done()
        })
    })
  })
})

describe('#delete', () => {
  test('should send a valid delete call', () =>
    restClient.del('http://localhost:3000/delete')
  )
})

describe('#post', () => {
  test('should send a valid post call', () => {
    fs.writeFileSync('/app.zip', 'the file contents')
    return restClient.post('http://localhost:3000/post', {
      data: { field1: 1, field2: { a: 2 }, file1: fs.createReadStream('/app.zip') }
    }).then((response) => expect(response).toBe('A post request')).then(() => {
      expect(lastReq().body).toEqual({ field1: '1', field2: '{"a":2}' })
      let file = lastReq().files.file1[0]
      expect(file.size).toBe(17)
      expect(file.mimetype).toBe('application/octet-stream')
      expect(file.originalname).toBe('app.zip')
    }).catch((e) => expect(e).toBe({}))
  })

  test('should reject post on bad file', (done) => {
    let stream = fs.createReadStream('/doesnt_exist.zip')
    stream.on('error', (error) => { }) // eslint-disable-line handle-callback-err
    return restClient.post('http://localhost:3000/posty', {
      data: { file1: stream }
    })
      .then(() => done.fail('post succeeded'))
      .catch((e) => {
        expect(e.toString()).toBe('Error: ENOENT: no such file or directory, stat \'/doesnt_exist.zip\'')
        done()
      })
  })
})

describe('#put', () => {
  test('should send a valid put call', () => {
    fs.writeFileSync('/app.zip', 'the file contents')
    return restClient.put('http://localhost:3000/put', {
      data: { field1: 1, field2: { a: 12 }, file1: fs.createReadStream('/app.zip') }
    })
      .then((response) => expect(response).toBe('A put request')).then(() => {
        expect(lastReq().body).toEqual({ field1: '1', field2: '{"a":12}' })
        let file = lastReq().files.file1[0]
        expect(file.size).toBe(17)
        expect(file.mimetype).toBe('application/octet-stream')
        expect(file.originalname).toBe('app.zip')
      })
  })
})

describe('emit', () => {
  test('should emit events', (done) => {
    expect.assertions(5)
    let eventEmitter = new (require('events'))()
    let total = 0
    let size = 0
    let pos = 0

    eventEmitter.on('api/connect', (evt) => {
      expect(evt).toMatchObject({
        headers: { 'x-powered-by': 'Express' }, method: 'POST', size: 14, statusCode: 200, url: 'http://localhost:3000/post'
      })
    })

    eventEmitter.on('api/read', (evt) => {
      expect(evt).toEqual({ delta: 14, pos: 14, size: 14 })
    })

    eventEmitter.on('api/write', (evt) => {
      size = evt.size
      total += evt.delta
      pos = evt.pos
    })

    fs.writeFileSync('/app.zip', 'the file contents')
    return restClient.post('http://localhost:3000/post', {
      events: eventEmitter, data: { file1: fs.createReadStream('/app.zip') }
    }).then(() => {
      expect(total).toBe(157)
      expect(size).toBe(157)
      expect(pos).toBe(157)
      done()
    })
  })
})
