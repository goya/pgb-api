const { merge, mkdirp, TextStream } = require('../src/misc')
jest.mock('jest-plugin-fs/mock')
const path = require('path')

const fs = require('fs')
const { Writable, Readable } = require('stream')

describe('merge', () => {
  test('is a function that returns an object', () => {
    expect(merge).toBeInstanceOf(Function)
    expect(merge()).toEqual({})
  })

  test('handles null values', () => {
    expect(merge(null)).toEqual({})
    expect(merge(null, null)).toEqual({})
    expect(merge(null, { a: true }, null)).toEqual({a: true})
  })

  test('returns a clone of all objects', () => {
    const obj = { a: true }
    expect(merge(obj) === obj).toBeFalsy()
  })

  test('last one wins', () => {
    expect(merge({a: 1}, {a: 2}, {a: 3})).toEqual({ a: 3 })
  })

  test('does nested merging', () => {
    expect(merge({a: { c: [], b: 1 }}, { a: { b: 2 } }, { a: { c: 3 } })).toEqual({ a: { b: 2, c: 3 } })
  })
})

describe('mkdirp', () => {
  test('is a function that returns an object', () => {
    expect(mkdirp).toBeInstanceOf(Function)
  })

  test('handles null (current dir)', () => {
    fs.existsSync.mockReturnValue(true)
    mkdirp(null)
    expect(fs.mkdirSync).not.toHaveBeenCalled()
    expect(fs.existsSync).toHaveBeenLastCalledWith(process.cwd() + path.sep)
  })

  test('handles blank (current dir)', () => {
    fs.existsSync.mockReturnValue(true)
    mkdirp('')
    expect(fs.mkdirSync).not.toHaveBeenCalled()
    expect(fs.existsSync).toHaveBeenLastCalledWith(process.cwd() + path.sep)
  })

  test('only creates dir if not already created', () => {
    fs.existsSync.mockReturnValueOnce(true).mockReturnValueOnce(false)
    mkdirp('/foo/bar')
    expect(fs.mkdirSync.mock.calls).toEqual([['/foo/bar/']])
    expect(fs.existsSync).toHaveBeenLastCalledWith('/foo/bar/')
  })
})

describe('TextStream', () => {
  test('inherits from Writable', () => {
    expect(TextStream.prototype instanceof Writable).toBeTruthy()
  })

  test('constructor returns an object with _write', () => {
    const textStream = new TextStream()
    expect(textStream).toBeInstanceOf(TextStream)
    expect(textStream).toHaveProperty('_write')
  })

  test('can be piped to', () => {
    const textStream = new TextStream()
    return new Promise((resolve, reject) => {
      var s = new Readable({
        read(size) {
          this.push('this is a string')
          this.push(null)
        }
      })

      s.pipe(textStream)
      s.once('end', () => resolve(textStream))
    }).then(() => expect(textStream.toString()).toBe('this is a string'))
  })
})
