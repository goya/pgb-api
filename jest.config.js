module.exports = {
  collectCoverage: true,
  verbose: false,
  collectCoverageFrom: [ 'src/*.js' ],
  testRegex: '/test/[^/]*.js$',
  coverageDirectory: 'tmp/coverage',
  setupFiles: [
    '<rootDir>/test/_helpers/globals.js',
    'jest-plugin-fs/setup'
  ],
  coverageThreshold: {
    global: {
      functions: 90
    }
  }
}
