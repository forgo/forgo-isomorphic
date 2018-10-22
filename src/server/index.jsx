import express from "express"
import cors from "cors"
import React from "react"
import { renderToString } from "react-dom/server"
import { StaticRouter, matchPath } from "react-router-dom"
import serialize from "serialize-javascript"
import App from '../shared/App'
import routes from '../shared/routes'

// TODO: pass keystore and credentials dynamically
import fs from "fs"
import https from "https"
const SSL_KEY = fs.readFileSync('.keystore/debug.key', 'utf8')
const SSL_CERT = fs.readFileSync('.keystore/debug.crt', 'utf8')
const SSL_PASSWORD = 'password'
const credentials = { key: SSL_KEY, cert: SSL_CERT, passphrase: SSL_PASSWORD }

const app = express()

app.use(cors())
// TODO: variable-ize this path depending on where server is run from?
app.use(express.static("build/client"))

app.get("*", (req, res, next) => {
  const activeRoute = routes.find((route) => matchPath(req.url, route)) || {}

  const promise = activeRoute.fetchInitialData
    ? activeRoute.fetchInitialData(req.path)
    : Promise.resolve()

  promise.then((data) => {
    const context = { data }

    const markup = renderToString(
      <StaticRouter location={req.url} context={context}>
        <App />
      </StaticRouter>
    )

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>SSR with RR</title>
          <script src="/client.js" defer></script>
          <script>window.__INITIAL_DATA__ = ${serialize(data)}</script>
        </head>

        <body>
          <div id="app">${markup}</div>
        </body>
      </html>
    `)
  }).catch(next)
})

const httpsServer = https.createServer(credentials, app)

httpsServer.listen(3030, () => {
  console.log(`Server is listening on port: 3030`)
})

/*
  1) Just get shared App rendering to string on server then taking over on client.
  2) Pass data to <App /> on server. Show diff. Add data to window then pick it up on the client too.
  3) Instead of static data move to dynamic data (github gists)
  4) add in routing.
*/
