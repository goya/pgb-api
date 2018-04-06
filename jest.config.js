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
  timers: 'fake',
  coverageThreshold: {
    global: {
      lines: 100,
      branches: 100,
      statements: 100
    }
  }
}
