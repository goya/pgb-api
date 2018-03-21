const zipper = require('../src/zipper')
const os = require('os')
const fs = require('fs')

describe('zipper', () => {
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

  describe('getFileList', () => {
    test('should return files', () => {
      let result = {
        list: [
          {'path': '/app_to_zip/.pgb_dont_delete_me', 'size': 2},
          {'path': '/app_to_zip/cordova.js', 'size': 4},
          {'path': '/app_to_zip/index.html', 'size': 3},
          {'path': '/app_to_zip/res', 'size': 0}
        ],
        skipped: [ '/app_to_zip/.delete_me [HIDDEN]' ]
      }
      expect(zipper.getFileList('/app_to_zip')).toEqual(result)
    })

    test('should skip if file cant be read', () => {
      let error = new Error('bad file')
      error.code = 'ENOENT'
      let oldOpenSync = fs.openSync
      fs.openSync = jest.fn().mockImplementation(() => { throw error })
      let result = {
        skipped: [
          '/app_to_zip/.delete_me [HIDDEN]',
          '/app_to_zip/.pgb_dont_delete_me [ENOENT]',
          '/app_to_zip/cordova.js [ENOENT]',
          '/app_to_zip/index.html [ENOENT]',
          '/app_to_zip/res [ENOENT]'
        ],
        list: [ ]
      }
      expect(zipper.getFileList('/app_to_zip')).toEqual(result)
      fs.openSync = oldOpenSync
    })
  })

  describe('zipDir', () => {
    test('should zip ', () => {
      return zipper.zipDir('/app_to_zip', '/app1.zip').then(() => {
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

        return zipper.zipDir('/app_to_zip', '/app2.zip', eventEmitter).then((val) => {
          expect(fs.existsSync('/app2.zip')).toBeTruthy()
          expect(lastProgress).toEqual({'delta': 109, 'file': 'index.html', 'pos': 236, 'size': 236})
        })
      })
    })
  })
})
