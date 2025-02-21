# forget-me-knots

A simple task tracking application for sewing projects. 

## The requirements are simple:
* date, description, a bunch of checkboxes
* ability to flag things as done
* ability to delete things
* ability to create new rows
* have this run on the laptop, desktop, and phone.
* data persists


## Tech Stack:
* node@20
* npm
* sqlite3
* electron ```npm install electron --save-dev```
* better-sqlite3 ```npm install better-sqlite3```
* electron-builder ```npm install --save-dev electron-builder```
* jsdoc ```npm install --save-dev jsdoc```

## TroubleShooting

When you go to build, things will fail. Why? Because javascript. always because javascript.

Assuming this is due to an error similar to:
> Error: The module 'better_sqlite3.node' was compiled against a different Node.js version using NODE_MODULE_VERSION 115.
This version of Node.js requires NODE_MODULE_VERSION 132.

* Remove node modules dir and the package-lock.json
  * ```rm -rf node_modules package-lock.json```
* Reinstall everything....how fun
  * ```npm install```
* Since better-sqlite3 is a native module, it needs to be recompiled for the version of node used with electron:
  * ```npx electron-rebuild```
  * ```npm rebuild better-sqlite3 --runtime=electron --target=$(npx electron --version)```
* If for some reason it still refusees to play nice:
  * ```npm install better-sqlite3 --build-from-source```

If that fails, just use something else...seriously. the rest of the world should too...

* Finally, give it a start:
  * ```npm start```

