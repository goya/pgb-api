const restClient = require('../src/rest-client')
const zipper = require('../src/zip')
jest.mock('../src/rest-client')
jest.mock('../src/zip')
const apiClient = require('../src/api')
const fs = require('fs')
const os = require('os')
const merge = require('../src/misc').merge
let api = apiClient()

const ret = { foo: 'bar' }
restClient.get.mockResolvedValue(ret)
restClient.del.mockResolvedValue(ret)
restClient.post.mockResolvedValue(ret)
restClient.put.mockResolvedValue(ret)
const data = { hydrates: true }

afterEach(() => jest.clearAllMocks())

describe('api', () => {
  describe('misc', () => {
    test('me', () =>
      api.me().then((val) => {
        expect(restClient.get).lastCalledWith('https://build.phonegap.com/api/v1/me', {})
        expect(val).toEqual(ret)
      })
    )

    test('getToken', () =>
      api.getToken().then((val) => {
        expect(restClient.post).lastCalledWith('https://build.phonegap.com/api/v1/token', {})
        expect(val).toEqual(ret)
      })
    )

    test('currentSupport', () =>
      api.currentSupport().then((val) => {
        expect(restClient.get).lastCalledWith('https://build.phonegap.com/api/v1/current_support', {})
        expect(val).toEqual(ret)
      })
    )
  })

  describe('apps', () => {
    test('getApps', () =>
      api.getApps().then((val) => {
        expect(restClient.get).lastCalledWith('https://build.phonegap.com/api/v1/apps', {})
        expect(val).toEqual(ret)
      })
    )

    test('getStatus', () =>
      api.getStatus(12).then((val) => {
        expect(restClient.get).lastCalledWith('https://build.phonegap.com/api/v1/apps/12/status', {})
        expect(val).toEqual(ret)
      })
    )

    test('getApp', () =>
      api.getApp(12).then((val) => {
        expect(restClient.get).lastCalledWith('https://build.phonegap.com/api/v1/apps/12', {})
        expect(val).toEqual(ret)
      })
    )

    test('getAppLog', () =>
      api.getAppLog(12, 'ios').then((val) => {
        expect(restClient.get).lastCalledWith('https://build.phonegap.com/api/v1/apps/12/logs/ios/build', { })
        expect(val).toEqual(ret)
      })
    )

    test('addApp', () =>
      api.addApp(data).then((val) => {
        expect(restClient.post).lastCalledWith('https://build.phonegap.com/api/v1/apps', { data })
        expect(val).toEqual(ret)
      })
    )

    test('updateApp', () =>
      api.updateApp(12, data).then((val) => {
        expect(restClient.put).lastCalledWith('https://build.phonegap.com/api/v1/apps/12', { data })
        expect(val).toEqual(ret)
      })
    )

    test('updateApp with null fileOrRepo', () =>
      api.updateApp(12, null, data).then((val) => {
        expect(restClient.put).lastCalledWith('https://build.phonegap.com/api/v1/apps/12', { data })
        expect(val).toEqual(ret)
      })
    )

    test('deleteApp', () =>
      api.deleteApp(12).then((val) => {
        expect(restClient.del).lastCalledWith('https://build.phonegap.com/api/v1/apps/12', { })
        expect(val).toEqual(ret)
      })
    )

    test('downloadApp with location', () =>
      api.downloadApp(12, 'ios', '/foo/bar').then((val) => {
        expect(restClient.get).lastCalledWith('https://build.phonegap.com/api/v1/apps/12/ios',
          { save: '/foo/bar' })
        expect(val).toEqual(ret)
      })
    )

    test('downloadApp without location', () =>
      api.downloadApp(12, 'ios').then((val) => {
        expect(restClient.get).lastCalledWith('https://build.phonegap.com/api/v1/apps/12/ios',
          { save: undefined })
        expect(val).toEqual(ret)
      })
    )

    test('buildApp with single platform', () =>
      api.buildApp(12, 'ios').then((val) => {
        expect(restClient.post).lastCalledWith('https://build.phonegap.com/api/v1/apps/12/build', { 'data': { 'platforms': 'ios' } })
        expect(val).toEqual(ret)
      })
    )

    test('buildApp with single platform array', () =>
      api.buildApp(12, ['ios']).then((val) => {
        expect(restClient.post).lastCalledWith('https://build.phonegap.com/api/v1/apps/12/build', { 'data': { 'platforms': 'ios' } })
        expect(val).toEqual(ret)
      })
    )

    test('buildApp with platform array', () =>
      api.buildApp(12, ['ios', 'windows']).then((val) => {
        expect(restClient.post).lastCalledWith('https://build.phonegap.com/api/v1/apps/12/build', { 'data': { 'platforms': 'ios,windows' } })
        expect(val).toEqual(ret)
      })
    )

    test('buildApp with platform array string', () =>
      api.buildApp(12, 'ios,windows').then((val) => {
        expect(restClient.post).lastCalledWith('https://build.phonegap.com/api/v1/apps/12/build', { 'data': { 'platforms': 'ios,windows' } })
        expect(val).toEqual(ret)
      })
    )

    test('buildApp with platform as separate arguments', () =>
      api.buildApp(12, 'ios', 'windows').then((val) => {
        expect(restClient.post).lastCalledWith('https://build.phonegap.com/api/v1/apps/12/build', { 'data': { 'platforms': 'ios,windows' } })
        expect(val).toEqual(ret)
      })
    )

    test('buildApp without platform', () =>
      api.buildApp(12).then((val) => {
        expect(restClient.post).lastCalledWith('https://build.phonegap.com/api/v1/apps/12/build', { 'data': { 'platforms': '' } })
        expect(val).toEqual(ret)
      })
    )
  })

  describe('collaborators', () => {
    test('addCollaborator', () =>
      api.addCollaborator(12, 'foo@bar.com', 'owner').then((val) => {
        expect(restClient.post).lastCalledWith('https://build.phonegap.com/api/v1/apps/12/collaborators',
          { 'data': { 'email': 'foo@bar.com', 'role': 'owner' } })
        expect(val).toEqual(ret)
      })
    )

    test('updateCollaborator', () =>
      api.updateCollaborator(12, 24, 'tester').then((val) => {
        expect(restClient.put).lastCalledWith('https://build.phonegap.com/api/v1/apps/12/collaborators/24',
          { 'data': { 'role': 'tester' } })
        expect(val).toEqual(ret)
      })
    )

    test('deleteCollaborator', () =>
      api.deleteCollaborator(12, 24).then((val) => {
        expect(restClient.del).lastCalledWith('https://build.phonegap.com/api/v1/apps/12/collaborators/24', { })
        expect(val).toEqual(ret)
      })
    )
  })

  describe('keys', () => {
    test('getKeys with platform', () =>
      api.getKeys('ios').then((val) => {
        expect(restClient.get).lastCalledWith('https://build.phonegap.com/api/v1/keys/ios/', {})
        expect(val).toEqual(ret)
      })
    )

    test('getKeys without platform', () =>
      api.getKeys().then((val) => {
        expect(restClient.get).lastCalledWith('https://build.phonegap.com/api/v1/keys//', {})
        expect(val).toEqual(ret)
      })
    )

    test('getKey', () =>
      api.getKey('ios', 12).then((val) => {
        expect(restClient.get).lastCalledWith('https://build.phonegap.com/api/v1/keys/ios/12', {})
        expect(val).toEqual(ret)
      })
    )

    test('addKey', () =>
      api.addKey('ios', data).then((val) => {
        expect(restClient.post).lastCalledWith('https://build.phonegap.com/api/v1/keys/ios', { data })
        expect(val).toEqual(ret)
      })
    )

    test('updateKey', () =>
      api.updateKey('ios', 12, data).then((val) => {
        expect(restClient.put).lastCalledWith('https://build.phonegap.com/api/v1/keys/ios/12', { data })
        expect(val).toEqual(ret)
      })
    )

    test('deleteKey', () =>
      api.deleteKey('ios', 12).then((val) => {
        expect(restClient.del).lastCalledWith('https://build.phonegap.com/api/v1/keys/ios/12', { })
        expect(val).toEqual(ret)
      })
    )
  })

  describe('helpers', () => {
    test('addAppFromFile', () => {
      fs.writeFileSync('/app.zip')

      return api.addApp('/app.zip', data).then((val) => {
        let result = restClient.post.mock.calls[0]
        expect(result[0]).toBe('https://build.phonegap.com/api/v1/apps')
        expect(result[1]).toMatchObject({ data: { hydrates: true, file: { path: '/app.zip' } } })
        expect(val).toEqual(ret)
      })
    })

    test('addAppFromRepo', () => {
      let payload = merge(data)
      payload.repo = 'foo/bar'
      return api.addApp('foo/bar', data).then((val) => {
        expect(restClient.post).lastCalledWith('https://build.phonegap.com/api/v1/apps', { data: payload })
        expect(val).toEqual(ret)
      })
    })

    test('addAppFromRepo should fall back to file if parseUrl fails', () => {
      return api.addApp('http://%5:glams@google.com/foo/bar', data).then((val) => {
        let result = restClient.post.mock.calls[0]
        expect(result[0]).toBe('https://build.phonegap.com/api/v1/apps')
        expect(result[1]).toMatchObject({ data: { hydrates: true, file: { path: 'http://%5:glams@google.com/foo/bar' } } })
        expect(val).toEqual(ret)
      })
    })

    describe('app from dir', () => {
      beforeEach(() => {
        os.tmpdir = jest.fn().mockImplementation(() => '/tmp')
        fs.mkdirSync('/tmp')
        fs.mkdirSync('/app_to_zip')
        zipper.mockImplementation((src, dest) => {
          fs.writeFileSync(dest)
          return Promise.resolve()
        })
      })

      afterEach(() => {
        fs.rmdirSync('/app_to_zip')
        fs.rmdirSync('/tmp')
      })

      test('zip dir and add app', () => {
        return api.addApp('/app_to_zip', data).then((val) => {
          let result = restClient.post.mock.calls[0]
          expect(result[0]).toBe('https://build.phonegap.com/api/v1/apps')
          expect(result[1]).toMatchObject({ data })
          expect(result[1].data.file.path).toMatch(/^\/tmp\/pgb-.*\.zip$/)
          expect(val).toEqual(ret)
        })
      })

      test('zip dir and add app with zip location', () => {
        return api.addApp('/app_to_zip', { zip: '/zip.zip', hydrates: true }).then((val) => {
          let result = restClient.post.mock.calls[0]
          expect(result[0]).toBe('https://build.phonegap.com/api/v1/apps')
          expect(result[1]).toMatchObject({ data })
          expect(result[1].data.file.path).toMatch(/^\/zip.zip$/)
          expect(val).toEqual(ret)
        })
      })

      test('zip dir and add app with zip directory', () => {
        return api.addApp('/app_to_zip', { zip: '/', hydrates: true }).then((val) => {
          let result = restClient.post.mock.calls[0]
          expect(result[0]).toBe('https://build.phonegap.com/api/v1/apps')
          expect(result[1]).toMatchObject({ data })
          expect(result[1].data.file.path).toMatch(/^\/app.zip$/)
          expect(val).toEqual(ret)
        })
      })

      describe('emit', () => {
        test('should emit events', () => {
          expect.assertions(6)
          let eventEmitter = new (require('events'))()
          let api = apiClient({ events: eventEmitter })
          let debug = []

          eventEmitter.on('debug', (evt) => {
            debug.push(evt)
          })

          return api.addApp('/app_to_zip', { hydrates: true }).then((val) => {
            let result = restClient.post.mock.calls[0]
            expect(result[0]).toBe('https://build.phonegap.com/api/v1/apps')
            expect(result[1]).toMatchObject({ data })
            expect(val).toEqual(ret)
            expect(result[1].data.file.path).toMatch(/^\/tmp\/pgb-.*\.zip$/)
            expect(debug[0]).toMatch(/archiving \/app_to_zip to \/tmp\/pgb-.*.zip/)
            expect(debug[1]).toMatch(/archive deleted \/tmp\/pgb-.*.zip/)
          })
        })
      })

      test('zip dir and add app with bad files', (done) => {
        zipper.mockImplementation((src, dest) => Promise.reject(new Error('zip failed')))

        return api.addApp('/app_to_zip', { hydrates: true }).catch((val) => {
          expect(val).toEqual(new Error('zip failed'))
          done()
        })
      })
    })

    test('updateAppFromFile', () => {
      fs.writeFileSync('/app.zip')
      return api.updateApp(12, '/app.zip', data).then((val) => {
        let result = restClient.put.mock.calls[0]
        expect(result[0]).toBe('https://build.phonegap.com/api/v1/apps/12')
        expect(result[1]).toMatchObject({ data: { hydrates: true, file: { path: '/app.zip' } } })
        expect(val).toEqual(ret)
      })
    })

    test('pullApp', () =>
      api.pullApp(12).then((val) => {
        expect(restClient.put).lastCalledWith('https://build.phonegap.com/api/v1/apps/12', { data: { pull: true } })
        expect(val).toEqual(ret)
      })
    )

    test('lockKey', () =>
      api.lockKey('ios', 12).then((val) => {
        expect(restClient.put).lastCalledWith('https://build.phonegap.com/api/v1/keys/ios/12', { data: { lock: true } })
        expect(val).toEqual(ret)
      })
    )

    test('addIOSKey', () => {
      fs.writeFileSync('/cert.pfx')
      fs.writeFileSync('/dev.mobileprovision')
      return api.addIOSKey('a title', '/dev.mobileprovision', '/cert.pfx', { password: 'abc' }).then((val) => {
        let result = restClient.post.mock.calls[0]
        expect(result[0]).toBe('https://build.phonegap.com/api/v1/keys/ios')
        expect(result[1]).toMatchObject(
          { data: { cert: { path: '/cert.pfx' }, profile: { path: '/dev.mobileprovision' }, password: 'abc' } }
        )
        expect(val).toEqual(ret)
      })
    })

    test('addWindowsKey', () => {
      fs.writeFileSync('/cert.keystore')
      return api.addWindowsKey('a title', '/cert.keystore', { password: 'abc' }).then((val) => {
        let result = restClient.post.mock.calls[0]
        expect(result[0]).toBe('https://build.phonegap.com/api/v1/keys/windows')
        expect(result[1]).toMatchObject({ data: { keystore: { path: '/cert.keystore' }, password: 'abc' } })
        expect(val).toEqual(ret)
      })
    })

    test('addAndroidKey', () => {
      fs.writeFileSync('/cert.keystore')

      return api.addAndroidKey('a title', 'an alias', '/cert.keystore', { keystore_pw: 'abc', key_pw: 'xyz' }).then((val) => {
        let result = restClient.post.mock.calls[0]
        expect(result[0]).toBe('https://build.phonegap.com/api/v1/keys/android')
        expect(result[1]).toMatchObject({ data: { keystore: { path: '/cert.keystore' }, keystore_pw: 'abc', key_pw: 'xyz', alias: 'an alias' } })
        expect(val).toEqual(ret)
      })
    })

    test('addWinphoneKey', () =>
      api.addWinphoneKey('the title', 'pub id').then((val) => {
        expect(restClient.post).lastCalledWith('https://build.phonegap.com/api/v1/keys/winphone',
          { data: { publisher_id: 'pub id', title: 'the title' } })
        expect(val).toEqual(ret)
      })
    )

    test('unlockIOSKey', () =>
      api.unlockIOSKey(12, 'abcde').then((val) => {
        expect(restClient.put).lastCalledWith('https://build.phonegap.com/api/v1/keys/ios/12',
          { data: { password: 'abcde' } })
        expect(val).toEqual(ret)
      })
    )

    test('unlockAndroidKey', () =>
      api.unlockAndroidKey(12, 'abcde', 'vwxyz').then((val) => {
        expect(restClient.put).lastCalledWith('https://build.phonegap.com/api/v1/keys/android/12',
          { data: { key_pw: 'vwxyz', keystore_pw: 'abcde' } })
        expect(val).toEqual(ret)
      })
    )

    test('unlockWindowsKey', () =>
      api.unlockWindowsKey(12, 'abcde').then((val) => {
        expect(restClient.put).lastCalledWith('https://build.phonegap.com/api/v1/keys/windows/12',
          { data: { password: 'abcde' } })
        expect(val).toEqual(ret)
      })
    )
  })

  describe('auth', () => {
    let oldBufferFrom = Buffer.from

    beforeEach(() => {
      api.defaults = { }
    })

    afterEach(() => {
      api.defaults = { }
      Buffer.from = oldBufferFrom
    })

    test('hasAuth', () => {
      expect(api.hasAuth()).toBeFalsy()
      api.defaults.headers = { Authorization: 'tokenOrBasicAuth' }
      expect(api.hasAuth()).toBeTruthy()
    })

    test('clearAuth with no headers', () => {
      expect(api.clearAuth()).toBeFalsy()
    })

    test('clearAuth with existing headers', () => {
      api.defaults.headers = { Authorization: 'tokenOrBasicAuth', foo: 'bar' }
      expect(api.hasAuth()).toBeTruthy()
      api.clearAuth()
      expect(api.hasAuth()).toBeFalsy()
      expect(api.defaults.headers).toEqual({ foo: 'bar' })
    })

    test('addAuth basic auth >= 5', () => {
      expect(api.hasAuth()).toBeFalsy()
      api.addAuth('foo', 'bar')
      expect(api.hasAuth()).toBeTruthy()
      expect(api.defaults.headers.Authorization).toBe('Basic Zm9vOmJhcg==')
    })

    test('addAuth basic auth < 5', () => {
      expect(api.hasAuth()).toBeFalsy()
      Buffer.from = Uint8Array.from
      api.addAuth('foo', 'bar')
      expect(api.hasAuth()).toBeTruthy()
      expect(api.defaults.headers.Authorization).toBe('Basic AAAAAAAAAA==')
    })

    test('addAuth token', () => {
      expect(api.hasAuth()).toBeFalsy()
      api.addAuth('abc')
      expect(api.defaults.headers.Authorization).toBe('token abc')
    })

    test('addAuth nothing', () => {
      expect(api.hasAuth()).toBeFalsy()
      api.addAuth()
      expect(api.defaults.headers).toEqual({})
    })
  })
})
