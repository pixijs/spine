Sandbox
=======

Build `pixi-spine` for 3 targets:

* [vanillajs](../package.json#L35)
* [browserify](../package.json#L33)
* [webpack](webpack.config.js)

Run

```
yarn
yarn sandbox:all
yarn sandbox:www
open localhost:9995
```

Available commands
```
yarn sandbox:vanillajs - compile to vanillajs
yarn sandbox:webpack - compile to webpack
yarn sandbox:browserify - compile to browserify
yarn sandbox:www - run web server on 9995 port for build/ dir
```

The code example is available [here](src/app.ts).
