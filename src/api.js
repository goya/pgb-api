'use strict'

const merge = require('./misc').merge
const getPath = require('./misc').getPath
const mkdirp = require('./misc').mkdirp
const rest = require('./rest-client')
const zip = require('./zip')
const fs = require('fs')
const path = require('path')
const os = require('os')
const urlParse = require('url').parse
const baseUrl = 'https://build.phonegap.com/api/v1'

class PGBApi {
  constructor(defaults) {
    this.defaults = merge(defaults)
  }

  /**
   *  shortcuts for common methods
   */

  _get(path, opts) {
    return rest.get(baseUrl + path, merge(this.defaults, opts))
  }

  _post(path, opts) {
    return rest.post(baseUrl + path, merge(this.defaults, opts))
  }

  _put(path, opts) {
    return rest.put(baseUrl + path, merge(this.defaults, opts))
  }

  _del(path, opts) {
    return rest.del(baseUrl + path, merge(this.defaults, opts))
  }

  /**
  *  people
  */

  me() {
    return this._get('/me')
  }

  getToken() {
    return this._post('/token')
  }

  /**
  *  apps
  */

  getApps() {
    return this._get('/apps')
  }

  getStatus(id) {
    return this._get(`/apps/${id}/status`)
  }

  getApp(id) {
    return this._get(`/apps/${id}`)
  }

  getAppLog(id, platform) {
    return this._get(`/apps/${id}/logs/${platform}/build`)
  }

  _app(id, data) {
    return (id) ? this._put(`/apps/${id}`, { data }) : this._post('/apps', { data })
  }

  deleteApp(id) {
    return this._del(`/apps/${id}`)
  }

  downloadApp(id, platform, save) {
    return this._get(`/apps/${id}/${platform}`, { save })
  }

  buildApp(id) {
    let platforms = [].slice.call(arguments).slice(1)
    platforms = [].concat.apply([], platforms).join(',')
    return this._post(`/apps/${id}/build`, { data: { platforms } })
  }

  /**
   * collaborators
   */

  addCollaborator(id, email, role) {
    return this._post(`/apps/${id}/collaborators`, { data: { email, role } })
  }

  updateCollaborator(id, collaboratorId, role) {
    return this._put(`/apps/${id}/collaborators/${collaboratorId}`, { data: { role } })
  }

  deleteCollaborator(id, collaboratorId) {
    return this._del(`/apps/${id}/collaborators/${collaboratorId}`)
  }

  /**
  * keys
  */

  getKeys(platform) {
    return this._get(`/keys/${(platform || '')}/`)
  }

  getKey(platform, id) {
    return this._get(`/keys/${platform}/${id}`)
  }

  addKey(platform, data) {
    return this._post(`/keys/${platform}`, { data })
  }

  updateKey(platform, id, data) {
    return this._put(`/keys/${platform}/${id}`, { data })
  }

  deleteKey(platform, id) {
    return this._del(`/keys/${platform}/${id}`)
  }

  /**
  * misc
  */

  currentSupport() {
    return this._get('/current_support')
  }

  /**
   * convenience methods
   */
  isRepo(str) {
    try {
      return str.toString().match(/^[a-z0-9_-][a-z0-9_.-]*\/[a-z0-9_.-]+(#[a-z0-9_.-]*)?$/i) || urlParse(str).hostname
    } catch (e) {
      return false
    }
  }

  addApp(fileOrRepo, data) {
    return this.updateApp(null, fileOrRepo, data)
  }

  updateApp(id, fileOrRepo, data) {
    if (!data && typeof fileOrRepo !== 'string') {
      data = fileOrRepo
      fileOrRepo = null
    }

    let exists = fs.existsSync(fileOrRepo)

    if (!fileOrRepo) {
      return this._app(id, data)
    } else if (exists && fs.statSync(fileOrRepo).isDirectory()) {
      return this.addAppFromDir(id, fileOrRepo, data)
    } else if (this.isRepo(fileOrRepo)) {
      return this.addAppfromRepo(id, fileOrRepo, data)
    } else {
      return this.addAppFromFile(id, fileOrRepo, data)
    }
  }

  addAppFromDir(id, dir, data) {
    return new Promise((resolve, reject) => {
      let cleanup = false

      let filePath = data.zip
      delete data.zip

      let ignore = data.ignore || []
      delete data.ignore

      if (!filePath) {
        filePath = path.join(os.tmpdir(), 'pgb-' + Math.random().toString(32).slice(2) + '.zip')
        cleanup = true
      }

      let save = getPath(filePath)
      save.filename = save.filename || 'app.zip'
      mkdirp(save.directory)
      filePath = path.join(save.directory, save.filename)

      const emit = (evt, data) => {
        if (this.defaults.events && this.defaults.events.emit) {
          this.defaults.events.emit(evt, data)
        }
      }

      const deleteZip = () => {
        if (!cleanup) return
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath)
          emit('debug', `archive deleted ${filePath}`)
        }
      }

      emit('debug', `archiving ${dir} to ${filePath}`)
      zip(dir, filePath, this.defaults.events, ignore)
        .then(() => this.addAppFromFile(id, filePath, data))
        .then((app) => {
          deleteZip()
          resolve(app)
        })
        .catch((e) => {
          deleteZip()
          reject(e)
        })
    })
  }

  addAppfromRepo(id, repo, data) {
    return this._app(id, merge(data, { repo }))
  }

  addAppFromFile(id, filePath, data) {
    return new Promise((resolve, reject) => {
      let file = fs.createReadStream(filePath)
      file.once('error', reject)
      this._app(id, merge(data, { file })).then(resolve, reject)
    })
  }

  pullApp(id, data) {
    return this._app(id, merge(data, { pull: true }))
  }

  lockKey(platform, id) {
    return this.updateKey(platform, id, { lock: true })
  }

  addIOSKey(title, mobileProvisionPath, p12KeyPath, data) {
    return new Promise((resolve, reject) => {
      let profile = fs.createReadStream(mobileProvisionPath)
      profile.once('error', reject)

      let cert = fs.createReadStream(p12KeyPath)
      cert.once('error', reject)

      return this.addKey('ios', merge({ title, profile, cert }, data)).then(resolve, reject)
    })
  }

  addWindowsKey(title, keystorePath, data) {
    return new Promise((resolve, reject) => {
      let keystore = fs.createReadStream(keystorePath)
      keystore.once('error', reject)

      return this.addKey('windows', merge({ title, keystore }, data)).then(resolve, reject)
    })
  }

  addAndroidKey(title, alias, keystorePath, data) {
    return new Promise((resolve, reject) => {
      let keystore = fs.createReadStream(keystorePath)
      keystore.once('error', reject)

      return this.addKey('android', merge({ title, keystore, alias }, data)).then(resolve, reject)
    })
  }

  addWinphoneKey(title, publisher_id, data) {
    return this.addKey('winphone', merge({ title, publisher_id }, data))
  }

  unlockIOSKey(id, password) {
    return this.updateKey('ios', id, { password })
  }

  unlockAndroidKey(id, keystore_pw, key_pw) {
    return this.updateKey('android', id, { keystore_pw, key_pw })
  }

  unlockWindowsKey(id, password) {
    return this.updateKey('windows', id, { password })
  }

  /**
  *  authentication
  */

  hasAuth() {
    return !!(this.defaults.headers && this.defaults.headers.Authorization)
  }

  clearAuth() {
    if (this.hasAuth()) {
      delete this.defaults.headers.Authorization
    }
  }

  addAuth(usernameOrToken, password) {
    this.defaults.headers = this.defaults.headers || {}
    if (usernameOrToken && password) {
      let enc = `${usernameOrToken}:${password}`
      if (Buffer.from !== Uint8Array.from) {
        enc = Buffer.from(enc)
      } else {
        enc = new Buffer(enc) // eslint-disable-line node/no-deprecated-api
      }
      this.defaults.headers.Authorization = `Basic ${enc.toString('base64')}`
    } else if (usernameOrToken) {
      this.defaults.headers.Authorization = `token ${usernameOrToken}`
    }
    return this
  }
}

module.exports = (opts) => new PGBApi(opts)
