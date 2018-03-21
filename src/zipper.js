const fs = require('fs')
const yazl = require('yazl')
const path = require('path')

const getFileList = (dir) => {
  let list = []
  let skipped = []

  let walkSync = dir => {
    let files = fs.readdirSync(dir)

    files.forEach(file => {
      let fullPath = path.join(dir, file)
      if (file.startsWith('.') && !file.match(/^\.pgb/)) {
        skipped.push(`${fullPath} [HIDDEN]`)
        return
      }

      try {
        let stat = fs.statSync(fullPath)
        fs.closeSync(fs.openSync(fullPath, 'r'))

        if (stat.isDirectory()) {
          list.push({ path: fullPath, size: 0 })
          walkSync(fullPath)
        } else {
          list.push({ path: fullPath, size: stat.size })
        }
      } catch (e) {
        skipped.push(`${fullPath} [${e.code}]`)
      }
    })
  }

  walkSync(dir)
  return { list, skipped }
}

const zipDir = (dir, dest, eventEmitter) => {
  return new Promise((resolve, reject) => {
    let fileList = getFileList(dir)
    let stream = fs.createWriteStream(dest)
    let zip = new yazl.ZipFile()
    let file = ''
    let fileIdx = 0
    let cumulativeSize = [0]
    let size = 0
    let lastTotal = 0

    const emit = (evt, data) => {
      if (eventEmitter) eventEmitter.emit(evt, data)
    }

    emit('zip/files', fileList)

    for (let f of fileList.list) {
      let pathInArchive = path.relative(dir, f.path)
      if (fs.statSync(f.path).isDirectory()) {
        zip.addEmptyDirectory(pathInArchive)
        size += 46 + pathInArchive.length + 1
      } else {
        zip.addFile(f.path, pathInArchive)
        size += 46 + pathInArchive.length
      }
      cumulativeSize.push(size += f.size)
    }

    stream.on('error', reject)
    zip.outputStream.on('error', reject)
    zip.outputStream.pipe(stream).once('close', () => {
      emit('zip/write', {
        size,
        file,
        pos: size,
        delta: cumulativeSize[cumulativeSize.length - 1] - lastTotal
      })
      emit('zip/end', true)
      resolve()
    })

    zip.outputStream.on('data', (data) => {
      for (let i = fileIdx; i < zip.entries.length; i++) {
        let thisEntry = zip.entries[i]

        if (thisEntry.state === 2) {
          file = thisEntry.utf8FileName.toString()
          fileIdx = i
          break
        }
      }

      emit('zip/write', {
        size,
        file,
        pos: cumulativeSize[fileIdx],
        delta: cumulativeSize[fileIdx] - lastTotal
      })
      lastTotal = cumulativeSize[fileIdx]
    })

    zip.end()
  })
}

module.exports = { getFileList, zipDir }
