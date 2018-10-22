const { FuseBox, BabelPlugin, WebIndexPlugin, CSSPlugin, Sparky, QuantumPlugin } = require("fuse-box")
const { src, context, task } = require("fuse-box/sparky")
const fs = require('fs')

const SERVER_ENTRY = 'index.jsx'
const CLIENT_ENTRY = 'index.jsx'

const SERVER_DEV_PORT = 3030
const CLIENT_DEV_PORT = 3000

const SSL_KEY = fs.readFileSync('.keystore/debug.key', 'utf8')
const SSL_CERT = fs.readFileSync('.keystore/debug.crt', 'utf8')
const SSL_PASSWORD = 'password'

const SERVER_BUNDLE = 'server'
const CLIENT_BUNDLE = 'client'

const SRC_PATH = 'src/'
const BUILD_PATH = 'build/'
const SERVER_PATH = 'server/'
const CLIENT_PATH = 'client/'
const STATIC_PATH = 'static/'
const SHARED_PATH = 'shared/'

const SRC_PATH_SERVER = `${SRC_PATH}${SERVER_PATH}`
const SRC_PATH_CLIENT = `${SRC_PATH}${CLIENT_PATH}`
const SRC_PATH_SHARED = `${SRC_PATH}${SHARED_PATH}`
const SRC_PATH_STATIC = `${SRC_PATH}${STATIC_PATH}`

const BUILD_PATH_SERVER = `${BUILD_PATH}${SERVER_PATH}`
const BUILD_PATH_CLIENT = `${BUILD_PATH}${CLIENT_PATH}`
const BUILD_PATH_STATIC = `${BUILD_PATH}${STATIC_PATH}`
const BUILD_PATH_SHARED = `${BUILD_PATH}${SHARED_PATH}`

// context shared between tasks
context(
  class {
    getServerConfig() {
      return FuseBox.init({
        homeDir: SRC_PATH,
        output: `${BUILD_PATH_SERVER}/\$name.js`,
        sourceMaps: !this.isProduction,
        target: 'server@es5',
        allowSyntheticDefaultImports: true,
        plugins: [
          // CSSPlugin(),
          QuantumPlugin({
            treeshake: true,
            uglify: this.isProduction,
            definedExpressions: {
              "__isBrowser__": false,
            },
          }),
        ],
      })
    }
    getClientConfig() {
      return FuseBox.init({
        homeDir: SRC_PATH,
        output: `${BUILD_PATH_CLIENT}/\$name.js`,
        sourceMaps: !this.isProduction,
        target: 'browser@es5',
        allowSyntheticDefaultImports: true,
        plugins: [
          CSSPlugin(),
          // WebIndexPlugin({ template: `${SRC_PATH_CLIENT}index.html`} }),
          QuantumPlugin({
            treeshake: true,
            uglify: this.isProduction,
            definedExpressions: {
              "__isBrowser__": true,
            },
          }),
        ],
      })
    }
  }
)

// default task
const defaultTask = context => {
  console.log("default task")
  // const fuse = context.getServerConfig()
}

task("default", ['clean', 'copy', 'dev'], defaultTask)


// copy tasks
const copy = context => {
  console.log("copy")
}

const copyStatic  = async context => {
  console.log(`copying static files to '${BUILD_PATH_STATIC}'`)
  src(SRC_PATH_STATIC).dest(BUILD_PATH_STATIC)
}

task('copy', ['&copy:static'], copy)
task("copy:pdf", copyStatic)

// build tasks
const build = context => {
  context.isProduction = true
}

const buildServer = context => {
  context.isProduction = true
  const fuseServer = context.getServerConfig()
  fuseServer
    .bundle(SERVER_BUNDLE)
    .instructions(` > [${SERVER_PATH}${SERVER_ENTRY}]`)
  fuseServer.run()
}

const buildClient = context => {
  context.isProduction = true
  const fuseClient = context.getClientConfig()
  fuseClient
    .bundle(CLIENT_BUNDLE)
    .instructions(` > ${CLIENT_PATH}${CLIENT_ENTRY}`)
  fuseClient.run()
}

task('build', ['clean', 'build:server', 'build:client'], build)
task('build:server', ['clean:server'], buildServer)
task('build:client', ['clean:client'], buildClient)

// dev tasks
const dev = context => {
  context.isProduction = false
}

const devServer = context =>  {
  context.isProduction = false
  const fuseServer = context.getServerConfig()
  fuseServer.dev({
    port: SERVER_DEV_PORT,
    // httpServer: false,
    https: {
      key: SSL_KEY,
      cert: SSL_CERT,
      passphrase: SSL_PASSWORD
    },
  })
  fuseServer
    .bundle(SERVER_BUNDLE)
    .completed(proc => proc.start())
    .instructions(` > [${SERVER_PATH}${SERVER_ENTRY}]`)
    // only watch server code
    .watch([
      `${SRC_PATH_SERVER}**`,
      `${SRC_PATH_SHARED}**`,
      `${SRC_PATH_STATIC}**`
    ].join('|'))

  fuseServer.run()
}

const devClient = context =>  {
  context.isProduction = false
  const fuseClient = context.getClientConfig()
  fuseClient.dev({
    port: CLIENT_DEV_PORT,
    https: {
      key: SSL_KEY,
      cert: SSL_CERT,
      passphrase: SSL_PASSWORD
    },
  })
  fuseClient
    .bundle(CLIENT_BUNDLE)
    .instructions(` > ${CLIENT_PATH}${CLIENT_ENTRY}`)
    .hmr()
    .watch([
      `${SRC_PATH_CLIENT}**`,
      `${SRC_PATH_SHARED}**`,
      `${SRC_PATH_STATIC}**`
    ].join('|'))
  fuseClient.run()
}

task('dev', ['clean', 'dev:server', 'dev:client'], dev)
task('dev:server', ['clean:server'], devServer)
task('dev:client', ['clean:client'], devClient)

// clean tasks
const clean = context =>  {
  console.log("clean")
}

const cleanServer = context =>  {
  src(BUILD_PATH_SERVER).clean(BUILD_PATH_SERVER)
}

const cleanClient = context =>  {
  src(BUILD_PATH_CLIENT).clean(BUILD_PATH_CLIENT)
}

task('clean', ['clean:server', 'clean:client'], clean)
task('clean:server', cleanServer)
task('clean:client', cleanClient)
