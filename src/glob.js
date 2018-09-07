const fs = require('fs')
const path = require('path')

const glob = (root, ignoreGlobs) => {
  let list = []
  let skipped = []
  let globRegexes = (ignoreGlobs || []).map(toGlobRegex)

  let walkSync = dir => {
    let files = fs.readdirSync(dir)

    files.forEach(file => {
      let fullPath = path.join(dir, file)
      let globPath = path.resolve(fullPath).replace(path.resolve(root) + '/', '')

      if (file.startsWith('.') && !file.match(/^\.pgb/)) {
        skipped.push(`${fullPath} [HIDDEN]`)
        return
      }

      try {
        let stat = fs.statSync(fullPath)
        fs.closeSync(fs.openSync(fullPath, 'r'))

        let ignored = filter(globPath, stat.isDirectory(), globRegexes)

        if (stat.isDirectory()) {
          if (ignored) {
            skipped.push(`${fullPath}/ [IGNORED]`)
          } else {
            list.push({ path: fullPath, size: 0 })
            walkSync(fullPath)
          }
        } else {
          if (ignored) {
            skipped.push(`${fullPath} [IGNORED]`)
          } else {
            list.push({ path: fullPath, size: stat.size })
          }
          list.push()
        }
      } catch (e) {
        skipped.push(`${fullPath} [${e.code}]`)
      }
    })
  }

  walkSync(root)
  return { list, skipped }
}

const toGlobRegex = (glob) => {
  if (glob == null || glob[0] === '#' || glob.trim() === '') return null

  let negation = glob.indexOf('!') === 0
  let dir = false

  if (glob.endsWith('/')) {
    glob = glob.slice(0, -1)
    dir = true
  }

  if (negation || glob[0] === '/') {
    glob = glob.slice(1)
  }

  glob = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\?/g, '.')
    .replace(/\*\*\//g, '^e^')
    .replace(/\*\*/g, '^e^')
    .replace(/\*/g, `[^/]+`)
    .replace(/\^e\^/g, '.*')

  if (glob.indexOf('/') === -1) {
    glob = glob + '/?'
  }

  return { dir, negation, regex: new RegExp(`^${glob}$`) }
}

const filter = (filePath, isDir, globRegexes) => {
  let result = false

  for (let globRegex of globRegexes) {
    if (globRegex == null) continue

    if (globRegex.dir && !isDir) continue

    if (globRegex.regex.test(filePath)) {
      if (globRegex.dir && isDir) {
        return !globRegex.negation
      }
      result = !globRegex.negation
    }
  }
  return result
}

module.exports = { glob, toGlobRegex, filter }
