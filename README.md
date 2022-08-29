# wp-deployer

> Deploy WordPress plugin and theme to the wordpress.org plugin directory.

## Install

```sh
npm install --save-dev wp-deployer
```

## Example

### Deploy plugin

In `package.json`:

```json
...
"wpDeployer": {
  "username": "yourusername",
  "buildDir": "dist"
},
...
"scripts": {
  ...
  "wpdeploy": "wp-deployer"
}
```

### Deploy theme

In `package.json`:

```json
...
"wpDeployer": {
  "repoType": "theme", // This is required
  "earlierVersion": "1.0.2", // Required; Keep last released version
  "username": "yourusername",
  "buildDir": "dist"
},
...
"scripts": {
  ...
  "wpdeploy": "wp-deployer"
}
```

## Credits

* [grunt-wp-deploy](https://github.com/stephenharris/grunt-wp-deploy)
