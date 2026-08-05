# wp-deployer

Deploy WordPress plugin and theme to the WordPress.org plugin and theme directories.

## Install

Requires **Node 22 or later**.

```sh
npm install --save-dev wp-deployer
```

## Usage

Run from your project root (the directory that contains your config — see [Config file](#config-file)):

```sh
npx wp-deployer
```

CLI sub-commands:

```sh
npx wp-deployer --help
npx wp-deployer --version
npx wp-deployer --assets
npx wp-deployer --dry-run
npx wp-deployer --config path/to/config.json
```

Use `--assets` when you only want to push the assets directory (e.g. screenshots, banner) to WordPress.org and skip trunk and tag deployment.

Use `--dry-run` to run checkout, clear/copy, and local `svn add` / `svn delete` preparation only. No `svn commit` or remote tag copy runs, so nothing is pushed—useful to inspect the working copy before a real deploy.

Or add a script to `package.json` and run it:

```sh
npm run wpdeploy
```

## Config file

Add **`wp-deployer.json`** in your project root.

```json
{
  "username": "yourusername",
  "buildDir": "dist"
}
```

Settings can also come from:

* **`wpDeployer`** key in `package.json` — supported for convenience, but `wp-deployer.json` is preferred.
* **`--config <path>`** — an explicit path to a config file, same shape.

`package.json#wpDeployer` and `wp-deployer.json` are **mutually exclusive**. If both exist, wp-deployer exits with an error rather than guessing which one to use — remove one. `--config` bypasses both and is used as-is.

## SVN authentication

wp-deployer is intended for **deploying from your own computer** to WordPress.org SVN. It does **not** store or read an SVN password.

* **`username`** in `wpDeployer` is passed to `svn` as `--username` only.
* **Passwords** are handled entirely by your **Subversion client** (prompt in the terminal and/or the **OS keychain** / SVN credential cache, depending on your setup).
* The first time you deploy (or after credentials expire), SVN may **ask for your password**. Later runs often **do not prompt**, because SVN reuses **cached** credentials—that is normal and secure on a personal machine.
* Follow [WordPress.org’s current documentation](https://developer.wordpress.org/plugins/wordpress-org/how-to-use-subversion/) for account access.

On a **shared** computer, review SVN’s credential storage and clear saved auth when you are done if needed.

## Settings

* **slug** : Plugin or theme slug; Default: `name` value in `package.json`
* **username** : WordPress repository username; This is required.
* **repoType**: Repo type; `plugin` or `theme`; Default: `plugin`.
* **buildDir**: The directory where your theme or plugin exists as you want it on the repo. Default: `dist`
* **deployTrunk**: Whether to deploy to trunk. This could be set to false to only commit the assets directory. Applies for `plugin` only; Default: `true`
* **deployTag**: Whether to create a tag for this version from trunk after a trunk deploy. Set to `false` to skip tagging. If `true`, `deployTrunk` must also be `true` (tag-only deploys are not supported). Applies for `plugin` only; Default: `true`
* **deployAssets**: Whether to deploy assets. Applies for `plugin` only; Default: `false`
* **assetsDir**: The directory where your plugins assets are kept; Default: `.wordpress-org`
* **tmpDir**: Parent directory for the SVN working copy (`slug` is appended). Default: system temp directory from `os.tmpdir()` (not hard-coded `/tmp`).
* **earlierVersion**: Last released version. Applies for `theme` only; This is required if `repoType` is `theme`.

## Example

### Deploy plugin

In `wp-deployer.json`:

```json
{
  "username": "yourusername",
  "buildDir": "dist"
}
```

In `package.json`:

```json
"scripts": {
  ...
  "wpdeploy": "wp-deployer"
}
```

### Deploy theme

In `wp-deployer.json`:

```json
{
  "repoType": "theme",
  "earlierVersion": "1.0.2",
  "username": "yourusername",
  "buildDir": "dist"
}
```

In `package.json`:

```json
"scripts": {
  ...
  "wpdeploy": "wp-deployer"
}
```

## License

[MIT](https://opensource.org/licenses/MIT)
