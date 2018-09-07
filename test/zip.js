const zip = require('../src/zip')
const os = require('os')
const fs = require('fs')

describe('zip', () => {
  beforeEach(() => {
    os.tmpdir = jest.fn().mockImplementation(() => '/tmp')
    fs.mkdirSync('/tmp')
    fs.mkdirSync('/app_to_zip')
    fs.writeFileSync('/app_to_zip/.delete_me', '1')
    fs.writeFileSync('/app_to_zip/.pgb_dont_delete_me', '22')
    fs.writeFileSync('/app_to_zip/index.html', '333')
    fs.writeFileSync('/app_to_zip/cordova.js', '4444')
    fs.mkdirSync('/app_to_zip/res')
  })

  afterEach(() => {
    fs.rmdirSync('/tmp')
    fs.unlinkSync('/app_to_zip/.delete_me')
    fs.unlinkSync('/app_to_zip/.pgb_dont_delete_me')
    fs.unlinkSync('/app_to_zip/index.html')
    fs.unlinkSync('/app_to_zip/cordova.js')
    fs.rmdirSync('/app_to_zip/res')
    fs.rmdirSync('/app_to_zip')
  })

  describe('zipDir', () => {
    test('should zip ', () => {
      return zip('/app_to_zip', '/app1.zip').then(() => {
        expect(fs.existsSync('/app1.zip')).toBeTruthy()
      })
    })

    describe('emit', () => {
      test('should emit events', () => {
        expect.assertions(5)
        let eventEmitter = new (require('events'))()
        let lastProgress = null

        eventEmitter.on('zip/write', (evt) => {
          lastProgress = evt
        })

        eventEmitter.on('zip/end', (evt) => {
          expect(evt).toBe(true)
        })

        eventEmitter.on('zip/files', (evt) => {
          expect(evt.skipped).toHaveLength(1)
          expect(evt.list).toHaveLength(4)
        })

        return zip('/app_to_zip', '/app2.zip', eventEmitter).then((val) => {
          expect(fs.existsSync('/app2.zip')).toBeTruthy()
          expect(lastProgress).toEqual({ 'delta': 109, 'file': 'index.html', 'pos': 236, 'size': 236 })
        })
      })
    })
  })
})
