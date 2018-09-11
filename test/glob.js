const glob = require('../src/glob')
const os = require('os')
const fs = require('fs')

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

describe('glob', () => {
  test('should return files', () => {
    let result = {
      list: [
        { 'path': '.pgb_dont_delete_me', 'size': 2 },
        { 'path': 'cordova.js', 'size': 4 },
        { 'path': 'index.html', 'size': 3 },
        { 'path': 'res', 'size': 0 }
      ],
      skipped: [ '.delete_me [HIDDEN]' ]
    }
    expect(glob.glob('/app_to_zip')).toEqual(result)
  })

  test('should skip if file cant be read', () => {
    let error = new Error('bad file')
    error.code = 'ENOENT'
    let oldOpenSync = fs.openSync
    fs.openSync = jest.fn().mockImplementation(() => { throw error })
    let result = {
      skipped: [
        '.delete_me [HIDDEN]',
        '.pgb_dont_delete_me [ENOENT]',
        'cordova.js [ENOENT]',
        'index.html [ENOENT]',
        'res [ENOENT]'
      ],
      list: [ ]
    }
    expect(glob.glob('/app_to_zip')).toEqual(result)
    fs.openSync = oldOpenSync
  })

  test('should skip ignored files', () => {
    let result = {
      list: [
        { 'path': '.pgb_dont_delete_me', 'size': 2 },
        { 'path': 'cordova.js', 'size': 4 }
      ],
      skipped: [ '.delete_me [HIDDEN]', 'index.html [IGNORED]', 'res/ [IGNORED]' ]
    }
    expect(glob.glob('/app_to_zip', [ '**/*.html', 'res/' ])).toEqual(result)
  })
})

describe('toGlobRegex', () => {
  test('should skip ignored files', () => {
    expect(glob.toGlobRegex('')).toEqual(null)
    expect(glob.toGlobRegex(null)).toEqual(null)
    expect(glob.toGlobRegex('# comment')).toEqual(null)
    expect(glob.toGlobRegex('shell')).toEqual({ 'dir': false, 'not': false, 'regex': /^shell\/?$/ })
    expect(glob.toGlobRegex('dir/')).toEqual({ 'dir': true, 'not': false, 'regex': /^dir\/?$/ })
    expect(glob.toGlobRegex('dir/**')).toEqual({ 'dir': false, 'not': false, 'regex': /^dir\/.*$/ })
    expect(glob.toGlobRegex('/dir')).toEqual({ 'dir': false, 'not': false, 'regex': /^dir\/?$/ })
    expect(glob.toGlobRegex('!not_me')).toEqual({ 'dir': false, 'not': true, 'regex': /^not_me\/?$/ })
    expect(glob.toGlobRegex('(.moot?[]+)')).toEqual({ 'dir': false, 'not': false, 'regex': /^\(\.moot.\[\]\+\)\/?$/ })
  })
})

describe('filter', () => {
  test('should skip ignored files', () => {
    expect(glob.filter('', true, [])).toEqual(false)
    expect(glob.filter('', true, [null])).toEqual(false)
    expect(glob.filter('rabbit', true, [{ dir: true, not: false, regex: /^rabbit\/?$/ }])).toEqual(true)
    expect(glob.filter('rabbit', true, [{ dir: false, not: false, regex: /^rabbit\/?$/ }])).toEqual(true)
    expect(glob.filter('rabbit', true, [{ dir: true, not: true, regex: /^rabbit$/ }])).toEqual(false)
    expect(glob.filter('rabbit', false, [{ dir: true, not: false, regex: /^rabbit\/?$/ }])).toEqual(false)
  })
})
