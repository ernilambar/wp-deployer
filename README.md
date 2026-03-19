# wp-deployer

Deploy WordPress plugin and theme to the WordPress.org plugin and theme directories.

## Install

Requires **Node 22 or later**.

```sh
npm install --save-dev wp-deployer
```

## Usage

Run from your project root (the directory that contains `package.json` with your `wpDeployer` config):

```sh
npx wp-deployer
```

Or add a script to `package.json` and run it:

```sh
npm run wpdeploy
```

## Settings

* **slug** : Plugin or theme slug; Default: `name` value in `package.json`
* **username** : WordPress repository username; This is required.
* **repoType**: Repo type; `plugin` or `theme`; Default: `plugin`
* **buildDir**: The directory where your theme or plugin exists as you want it on the repo. Default: `dist`
* **deployTrunk**: Whether to deploy to trunk. This could be set to false to only commit the assets directory. Applies for `plugin` only; Default: `true`
* **deployTag**: Whether to create a tag for this version from trunk. Set to `false` to skip tagging. Applies for `plugin` only; Default: `true`
* **deployAssets**: Whether to deploy assets. Applies for `plugin` only; Default: `false`
* **assetsDir**: The directory where your plugins assets are kept; Default: `.wordpress-org`
* **earlierVersion**: Last released version. Applies for `theme` only; This is required if `repoType` is `theme`.

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

## Development

Contributors: use **Node 22 or later** (see `engines` in `package.json`). If you use [nvm](https://github.com/nvm-sh/nvm), run `nvm use` in the project root to pick the version from `.nvmrc`.

## Credits

* [grunt-wp-deploy](https://github.com/stephenharris/grunt-wp-deploy)
