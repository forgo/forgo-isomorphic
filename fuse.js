const { FuseBox, BabelPlugin, WebIndexPlugin, CSSPlugin, Sparky, QuantumPlugin } = require("fuse-box")
const { src, context, task } = require("fuse-box/sparky")
const fs = require('fs')

const SERVER_ENTRY = 'server.jsx'
const CLIENT_ENTRY = 'client.jsx'

const DEV_PORT = 3333

const SSL_KEY = fs.readFileSync('.keystore/debug.key', 'utf8')
const SSL_CERT = fs.readFileSync('.keystore/debug.crt', 'utf8')
const SSL_PASSWORD = 'password'

const SERVER_BUNDLE = 'server'
const CLIENT_BUNDLE = 'client'

const SRC_PATH = 'src/'

// instructions are relative to homeDir = SRC_PATH
const BUILD_PATH = 'build/'
const SERVER_PATH = 'server/'
const CLIENT_PATH = 'client/'

// relative to fuse.js for `watch`/hot-reloading
const SRC_PATH_SERVER = `${SRC_PATH}${SERVER_PATH}`
const SRC_PATH_CLIENT = `${SRC_PATH}${CLIENT_PATH}`

let fuse

// context shared between tasks
context(
  class {
    getOptions() {
      return {
        homeDir: SRC_PATH,
        output: `${BUILD_PATH}\$name.js`,
        hash: this.isProduction,
        sourceMaps: !this.isProduction,
        allowSyntheticDefaultImports: true,
      }
    }
    getServerOptions() {
      return {
        target: 'server@es5',
        definedExpressions: {
          "__isBrowser__": false,
        },
        plugins: [
          // QuantumPlugin({
          //   treeshake: true,
          //   uglify: this.isProduction,
          //   definedExpressions: {
          //     "__isBrowser__": false,
          //   },
          // }),
        ],
      }
    }
    getClientOptions() {
      return {
        target: 'browser@es5',
        definedExpressions: {
          "__isBrowser__": true,
        },
        plugins: [
          WebIndexPlugin({
            title: "Wat?",
            template: `${SRC_PATH_CLIENT}index.html`
          }),
          CSSPlugin(),
          // QuantumPlugin({
          //   treeshake: true,
          //   uglify: this.isProduction,
          //   definedExpressions: {
          //     "__isBrowser__": true,
          //   },
          // }),
        ],
      }
    }
  }
)

// clean task
task('clean', context =>  {
  return src(BUILD_PATH).clean(BUILD_PATH).exec()
})

// config task
const config = (isProduction) => {
  return context => {
    context.isProduction = isProduction
    fuse = FuseBox.init(context.getOptions())
    if(!isProduction) {
      fuse.dev({
        port: DEV_PORT,
        https: {
          key: SSL_KEY,
          cert: SSL_CERT,
          passphrase: SSL_PASSWORD
        },
      })
    }
  }
}
// set isProduction on context if non-dev build
task('dev:config', config(false))
task('build:config', config(true))

// server task
task('server', context =>  {
  fuse.opts = {
    ...context.getOptions(),
    ...context.getServerOptions()
  }

  const server = fuse.bundle(SERVER_BUNDLE)

  if(!context.isProduction) {
    server
      .completed(proc => {
        proc.require({
          // To enable debugging (using VS Code)
          close: ({ FuseBox }) => FuseBox.import(FuseBox.mainFile).shutdown()
        })
      })
      .watch([
        `${SRC_PATH_SERVER}**`,
      ].join('|'))
  }
  server.instructions(` > [${SERVER_PATH}${SERVER_ENTRY}]`)
  return server
})

// client task
task('client', context =>  {
  fuse.opts = {
    ...context.getOptions(),
    ...context.getClientOptions()
  }

  const client = fuse.bundle(CLIENT_BUNDLE)

  if(!context.isProduction) {
    client
      .watch([
        `${SRC_PATH_CLIENT}**`,
      ].join('|'))
      .hmr()
  }
  client.instructions(` > ${CLIENT_PATH}${CLIENT_ENTRY}`)
  return client
})

const run = context => {
  return fuse.run()
}

task('dev', ['clean', 'dev:config', 'server', 'client'], run)
task('build', ['clean', 'build:config', 'server', 'client'], run)
