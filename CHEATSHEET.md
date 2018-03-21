# Usage

add it:

```
> yarn add pgb-api

or

> npm install --save pgb-api
```
use it:
```javascript
const pgb = require('pgb-api')()

/* AUTH */

pgb.addAuth('your-auth-token') // add auth token to client
pgb.hasAuth() // true or false depending whether an authentication token is present
pgb.clearAuth() // clear the authentication token

/*
 * The folowing methods all return promises.
 * Optional parameters are denoted by brackets [].
 */

/* MISC */

pgb.me() // get information about currently logged in user
pgb.currentSupport() // get list of supported phonegap versions

/* APPS */

/* 
*  An app can be added or updated by specifying 
*    1. a filePath to an already created archive
*    2. a filePath to a directory containing your app
*    3. a string repsenting the URL to the repository containing your app
*    4. and / or the appData structure below for metadata updates
*/

let appData = { /* all optional */
  zip: pathForSavedZipFile, /* save zip here instead of /tmp */
  private: true|false, 
  share: true|false,
  tag: 'master',
  debug: true|false, 
  hydrates: true|false,
  keys { 
    android: keyId,
    ios: keyId,
    windows: keyId,
    winphone: keyId
  }
}

pgb.addApp(fileRepoOrDir, [appData])
pgb.updateApp(id, [fileRepoOrDir], [appData])

pgb.getApps() // get all your apps
pgb.getApp(id) // get single app
pgb.getAppLog(id, platform) // get build log for a single platform
pgb.downloadApp(id, platform, [path]) // save app to optional path
pgb.pullApp(id) // pull new version from repo and trigger a build
pgb.buildApp(id, [platform]) // build app, optionally by single platform
pgb.deleteApp(id) // delete app

/* COLLABORATORS */

pgb.addCollaborator(id, email, 'tester'|'dev') // add collaborator to app with role
pgb.updateCollaborator(id, collaboratorId, 'tester'|'dev') // update collaborator role for app
pgb.deleteCollaborator(id, collaboratorId) // delete collaborator from app

/* KEYS */

pgb.getKeys(platform) // get keys for specified platform
pgb.getKey(platform, id) // get single key by platform and id
pgb.updateKey(platform, id, { title: '', default: true|false }) // update key
pgb.deleteKey(platform, id) // delete specified key 
pgb.lockKey(platform, id) // lock the specified key

/* Android Signing Keys */

pgb.addAndroidKey(title, alias, keystorePath, { keystore_pw: '', key_pw: '' })
pgb.unlockAndroidKey(id, keystore_pw, key_pw)

/* iOS Signing Keys */

pgb.addIOSKey(title, mobileProvisionPath, p12Path, { default: true|false, password: '' })
pgb.unlockIOSKey(id, password)

/* Windows Signing Keys */

pgb.addWindowsKey(title, keystorePath, { password: '' })
pgb.unlockWindowsKey(id, password)

/* Windows Phone Publisher Ids */

pgb.addWinphoneKey(title, publisher_id)

```
