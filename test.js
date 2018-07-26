const pgb = require('./src/api')({events: process})

process.on('debug', console.log)

pgb.addAuth('eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhdXRoIiwiaXNzIjoicGdiIiwianRpIjoiM2YzYmVmNWUtNDY5MC00Y2ZhLTk4YTEtYWQ1YzUzODcwZDA1In0.am_eKQdh7T1KmRZoaXOkGDWoQMju1z4VHEtcVXqGuaY')
pgb.downloadApp(660, 'ios', '.')
  .then(console.log)
  .catch(console.error)
