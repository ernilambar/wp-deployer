# wp-deployer

> Deploy WordPress plugin to the wordpress.org plugin directory.

## Install

```sh
npm install --save-dev wp-deployer
```

## Example

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

## Credits

* [grunt-wp-deploy](https://github.com/stephenharris/grunt-wp-deploy)
