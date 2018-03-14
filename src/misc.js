const fs = require('fs')
const path = require('path')
const Writable = require('stream').Writable

/**
 * deep merge a collection of objs returning a new object
 */
const merge = function() {
  const clone = (source, dest) => {
    for (let prop in source) {
      if (source[prop] && source[prop].constructor === Object) {
        dest[prop] = dest[prop] || {}
        dest[prop] = clone(source[prop], dest[prop])
      } else {
        dest[prop] = source[prop]
      }
    }
    return dest
  }

  return Array.from(arguments).reduce((result, obj) => clone(obj, result), {})
}

/**
 * synchronously make directory creating intermediate directories as required
 */
const mkdirp = function(dir) {
  dir = dir || ''
  let parts = path.resolve(dir).split(path.sep)
  for (let i = 1; i < parts.length; i++) {
    let segment = path.join(parts.slice(0, i + 1).join(path.sep) + path.sep)
    if (!fs.existsSync(segment)) fs.mkdirSync(segment)
  }
}

const getPath = (str) => {
  let filename, directory

  if (str.endsWith(path.sep) || (fs.existsSync(str) && fs.statSync(str).isDirectory())) {
    directory = str
  } else {
    directory = path.dirname(str)
    filename = path.basename(str)
  }

  return { filename, directory }
}

/**
 * a writable stream interface for a string
 */
class TextStream extends Writable {
  constructor() {
    super()
    this._chunks = []
  }

  _write(chunk, enc, next) {
    this._chunks.push(chunk)
    next()
  }

  toString() {
    return this._chunks.join('')
  }
}

module.exports = { merge, mkdirp, TextStream, getPath }
