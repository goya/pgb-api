const express = require('express')
const multer = require('multer')
const upload = multer({ storage: multer.memoryStorage() })
const app = express()

// add request logger to all requests

app['requestLogger'] = function(req) { }
const logger = (req, res, next) => {
  app['requestLogger'](req)
  next()
}
app.all('*', logger)

// gets

app.get('/', function(req, res) {
  res.send('A page')
})

app.get('/json', function(req, res) {
  res.json({ key: 12 })
})

app.get('/page1', function(req, res) {
  res.send('A page')
})

app.get('/relative_redirect', function(req, res) {
  res.redirect('/page1')
})

app.get('/absolute_redirect', function(req, res) {
  res.redirect('http://localhost:3000/page1')
})

app.get('/google', function(req, res) {
  res.redirect('http://127.0.0.1:3000/json')
})

// error responses

app.all('/error/:error/:msg', function(req, res) {
  res.status(req.params.error).send(req.params.msg).end()
})

// posts and puts

app.post('/post', upload.fields([{ name: 'file2' }, { name: 'file1' }]), function(req, res) {
  res.send('A post request')
})

app.put('/put', upload.fields([{ name: 'file2' }, { name: 'file1' }]), function(req, res) {
  res.send('A put request')
})

// deletes

app.delete('/delete', function(req, res) {
  res.status(204).end()
})

// catch all

app.use(function(req, res, next) {
  res.status(404)
  res.send('404: File Not Found')
})

module.exports = app
