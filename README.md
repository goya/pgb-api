# pgb-api  <a href=https://www.npmjs.com/package/pgb-api><img alt=npm src=https://badge.fury.io/js/pgb-api.svg></a>
This is a nodejs module to access the public REST api of [PhoneGap Build](https://build.phonegap.com).

The module can be added to your project with:

```javascript
> yarn add pgb-api

or

> npm install pgb-api --save
```

Here is a snippet to print out your apps to the console:

```javascript
const pgb = require('pgb-api')()

pgb.addAuth('your-api-token')
pgb.getApps()
  .then(console.log)
  .catch(console.error)

```

A cheatsheet is [here](CHEATSHEET.md).

If you find a bug or have a feature request tell me about it [here](https://github.com/phonegap-build/pgb-api/issues).

Follow me on twitter **@brettrudd**
