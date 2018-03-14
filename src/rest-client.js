const merge = require('./misc').merge
const mkdirp = require('./misc').mkdirp
const TextStream = require('./misc').TextStream
const getPath = require('./misc').getPath
const urlParse = require('url')
const fs = require('fs')
const path = require('path')
const Stream = require('stream').Stream
const version = require('../package.json').version

const defaultOpts = {
  headers: {
    'user_agent': `pgb-api/${version} (${process.platform}) node/${process.version}`
  }
}

/**
 * parse the response into a hash / string for the caller
 */
const parseBody = (ctx) => {
  let body, json

  if (ctx.output instanceof TextStream) {
    body = ctx.output.toString()
    try {
      json = JSON.parse(body)
    } catch (e) { /* might not be json */ }
  }

  return ctx.path || json || body
}

/**
 * emit an event if an emitEmitter is present
 */
const emit = (ctx, event, payload) => {
  if (ctx.opts.events && ctx.opts.events.emit) {
    ctx.opts.events.emit(event, payload)
  }
}

/**
 * do the request
 */
const request = (url, opts) => {
  opts = opts || {}

  return new Promise((resolve, reject) => {
    let pos = 0
    let ctx = {}

    // combine options into a single options object
    let parsedUrl = urlParse.parse(url)
    ctx.opts = merge(defaultOpts, parsedUrl, opts)

    // add ctx.opts.data to the request object
    addRequestPayload(ctx)

    // grab proper transport
    const transport = (ctx.opts.protocol === 'https:') ? require('https') : require('http')

    // emit headers event
    emit(ctx, 'api/headers', ctx.opts.headers)
    emit(ctx, 'debug', `${ctx.opts.method || 'GET'} ${url}`)

    // do the request
    ctx.req = transport.request(ctx.opts, (response) => {
      ctx.response = response
      let size = Number.parseInt(response['headers']['content-length']) || null
      let status = Math.trunc(response.statusCode / 100)

      // handle redirection requests
      if (status === 3 && 'location' in response.headers) {
        let location = urlParse.parse(response.headers['location'])

        if (opts.headers && ctx.opts.hostname !== location.hostname) {
          delete opts.headers.Authorization
        }

        location = urlParse.resolve(url, location.href)
        emit(ctx, 'debug', `${ctx.req.method} ${url} -> ${response.statusCode} ${location}`)
        return resolve(request(location, opts))
      }

      // if saveTo is being used:
      //    if it's a stream pipe response directly to it
      //    - or create a write stream to the saveTo directory
      //       with optional saveAs filename
      if (ctx.opts.saveTo && status === 2) {
        if (ctx.opts.saveTo instanceof require('stream').Writable) {
          ctx.output = ctx.opts.saveTo
        } else {
          let save = getPath(ctx.opts.saveTo)
          save.filename = decodeURI(save.filename || path.basename(ctx.opts.pathname) || 'app.download')
          ctx.output = path.join(save.directory, save.filename)

          try {
            mkdirp(save.directory)
            fs.closeSync(fs.openSync(ctx.output, 'w'))
            ctx.path = path.resolve(ctx.output)
          } catch (e) {
            return reject(e)
          }

          emit(ctx, 'debug', `saving to ${ctx.path}`)
          ctx.output = fs.createWriteStream(ctx.output)
        }
      }

      // emit connect event
      emit(ctx, 'api/connect', {
        statusCode: response.statusCode,
        size,
        headers: response.headers,
        path: ctx.path,
        url,
        method: ctx.req.method
      })
      emit(ctx, 'debug', `${ctx.req.method} ${url} -> ${response.statusCode}`)

      ctx.output = ctx.output || new TextStream()
      ctx.output.once('error', reject)

      // pipe response to ctx.output stream
      response.pipe(ctx.output)

      // emit read event for response progress
      response.on('data', (chunk) => {
        pos += chunk.length
        emit(ctx, 'api/read', { size, pos, delta: chunk.length })
      })

      // on end of response:
      //  1. parse response
      //  2. emit end event with response hash
      //  3. depending on status resolve / reject promise
      response.once('end', () => {
        let parsed = parseBody(ctx)
        if (status === 2) {
          resolve(parsed)
        } else {
          let error = new Error(parsed.error || parsed)
          error.statusCode = response.statusCode
          reject(error)
        }
      })
    })

    // on request error reject the promise
    ctx.req.once('error', reject)

    // write the request payload and end the request
    writeRequest(ctx)
  })
}

/**
 * build the form data for the request
 */
const addRequestPayload = (ctx) => {
  ctx._payload = []
  ctx._contentLength = 0

  if (ctx.opts.data == null) return

  const boundary = `----pgbapi`

  for (let name in ctx.opts.data) {
    let value = ctx.opts.data[name]

    ctx._payload.push(`--${boundary}\r\n`)

    if (value instanceof Stream) {
      let fileName = path.basename(value.path)
      ctx._payload.push(`Content-Disposition: form-data; name="${name}"; filename="${fileName.replace('"', '\\"')}"\r\n`)
      ctx._payload.push('Content-Type: application/octet-stream\r\n\r\n')
      ctx._payload.push(value)
      ctx._payload.push('\r\n')
    } else {
      ctx._payload.push(`Content-Disposition: form-data; name="${name}";\r\n\r\n`)
      if (value && value.constructor.name === 'Object') {
        value = JSON.stringify(value)
      }
      ctx._payload.push(`${value}\r\n`)
    }
  }

  ctx._payload.push(`--${boundary}--\r\n`)

  for (let item of ctx._payload) {
    ctx._contentLength += item.length || fs.statSync(item.path).size
  }

  ctx.opts.headers['Content-Length'] = ctx._contentLength
  ctx.opts.headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`
}

/**
 * write form data to request then end the request
 */
const writeRequest = (ctx) => {
  if (ctx._payload.length === 0) return ctx.req.end()

  let pos = 0
  const write = (item, next) => {
    if (item instanceof Stream) {
      item.on('data', (chunk) => {
        pos += chunk.length
        emit(ctx, 'api/write', { size: ctx._contentLength, pos, delta: chunk.length })
      })
      item.once('end', next)
      item.pipe(ctx.req, { end: false })
    } else {
      pos += item.length
      ctx.req.write(item)
      emit(ctx, 'api/write', { size: ctx._contentLength, pos, delta: item.length })
      next()
    }
  }

  let payload = ctx._payload.slice(0)
  let writePayload = () => {
    write(payload.shift(), () => (payload.length === 0) ? ctx.req.end() : writePayload())
  }

  writePayload()
}

/**
 * shortcuts for supported methods
 */
const del = (url, options) => request(url, merge(options, { method: 'DELETE' }))
const put = (url, options) => request(url, merge(options, { method: 'PUT' }))
const post = (url, options) => request(url, merge(options, { method: 'POST' }))

module.exports = { post, put, del, get: request }
