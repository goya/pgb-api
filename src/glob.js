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
      let relPath = path.relative(root, fullPath)

      if (file.startsWith('.') && !file.match(/^\.pgb/)) {
        skipped.push(`${relPath} [HIDDEN]`)
        return
      }

      try {
        let stat = fs.statSync(fullPath)
        fs.closeSync(fs.openSync(fullPath, 'r'))

        let ignore = filter(relPath, stat.isDirectory(), globRegexes)

        if (stat.isDirectory()) {
          if (ignore) {
            skipped.push(`${relPath}${path.sep} [IGNORED]`)
          } else {
            list.push({ path: relPath, size: 0 })
            walkSync(fullPath)
          }
        } else {
          if (ignore) {
            skipped.push(`${relPath} [IGNORED]`)
          } else {
            list.push({ path: relPath, size: stat.size })
          }
          list.push()
        }
      } catch (e) {
        skipped.push(`${relPath} [${e.code}]`)
      }
    })
  }

  walkSync(root)
  return { list, skipped }
}

const toGlobRegex = (glob) => {
  if (glob == null || glob[0] === '#' || glob.trim() === '') return null

  let not = glob.indexOf('!') === 0
  let dir = false

  if (glob.endsWith('/')) {
    glob = glob.slice(0, -1)
    dir = true
  }

  if (not || glob[0] === '/') {
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

  return { dir, not, regex: new RegExp(`^${glob}$`) }
}

const filter = (filePath, isDir, globRegexes) => {
  let result = false

  filePath = filePath.split(path.sep).join('/')

  for (let globRegex of globRegexes) {
    if (globRegex == null) continue

    if (globRegex.dir && !isDir) continue

    if (globRegex.regex.test(filePath)) {
      if (globRegex.dir && isDir) {
        return !globRegex.not
      }
      result = !globRegex.not
    }
  }
  return result
}

module.exports = { glob, toGlobRegex, filter }
