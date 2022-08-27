#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import merge from 'just-merge';
import { exec } from 'child_process';

import { waterfall } from 'async';

const pkg = fs.readJsonSync( './package.json' );

const awk = process.platform === 'win32' ? 'gawk' : 'awk';
const noRunIfEmpty = process.platform !== 'darwin' ? '--no-run-if-empty ' : '';

const wpDeployer = async () => {
	console.log( `Processing...` );

	const clearTrunk = ( settings ) => {
		return function( settings, callback ) {
			console.log( `Clearing trunk.` );

			exec( `rm -fr ${ settings.svnPath }/trunk/*`, function( error, stdout, stderr ) {
				callback( null, settings );
			} );
		};
	};

	const checkoutDir = ( dir, settings ) => {
		return function( settings, callback ) {
			console.log( 'Checking out ' + settings.url + dir + '/...' );

			const checkoutUrl = `${ settings.url }${ dir }/`;
			const targetPath = `${ settings.svnPath }/${ dir }`;

			exec( `svn co ${ checkoutUrl } ${ targetPath }`, function( error, stdout, stderr ) {
				if ( error !== null ) {
					console.error( 'Checkout of "' + settings.url + dir + '/" unsuccessful: ' + error );
				} else {
					console.log( `Check out complete.` );
				}
				callback( null, settings );
			} );
		};
	};

	const copyDirectory = ( srcDir, destDir, callback ) => {
		if ( srcDir.substr( -1 ) !== '/' ) {
			srcDir = srcDir + '/';
		}

		fs.copySync( srcDir, destDir );
		callback();
	};

	const copyBuild = ( settings ) => {
		return function( settings, callback ) {
			console.log( `Copying build directory: ${ settings.buildDir } to ${ settings.svnPath }/trunk/` );

			copyDirectory( settings.buildDir, settings.svnPath + '/trunk/', function( ) {
				callback( null, settings );
			} );
		};
	};

	const addFiles = ( settings, callback ) => {
		return function( settings, callback ) {
			let cmd = 'svn resolve --accept working -R . && svn status |' + awk + " '/^[?]/{print $2}' | xargs " + noRunIfEmpty + 'svn add;';
			cmd += 'svn status | ' + awk + " '/^[!]/{print $2}' | xargs " + noRunIfEmpty + 'svn delete;';

			exec( cmd, { cwd: settings.svnPath + '/trunk' }, function( error, stdout, stderr ) {
				callback( null, settings );
			} );
		};
	};

	const commitToTrunk = ( settings, callback ) => {
		return function( settings, callback ) {
			const trunkCommitMsg = 'Committing ' + settings.newVersion + ' to trunk';

			const cmd = 'svn commit --force-interactive --username="' + settings.username + '" -m "' + trunkCommitMsg + '"';

			exec( cmd, { cwd: settings.svnPath + '/trunk' }, function( error, stdout, stderr ) {
				if ( error !== null ) {
					console.error( chalk.red( 'Failed to commit to trunk: ' + error ) );
				}
				callback( null, settings );
			} );
		};
	};

	const commitTag = ( settings, callback ) => {
		return function( settings, callback ) {
			const tagCommitMsg = 'Tagging ' + settings.newVersion;

			console.log( tagCommitMsg + '\n' );

			const cmd = 'svn copy ' + settings.url + 'trunk/ ' + settings.url + 'tags/' + settings.newVersion + '/ ' + ' ' + ' --username="' + settings.username + '" -m "' + tagCommitMsg + '"';
			exec( cmd, { cwd: settings.svnpath }, function( error, stdout, stderr ) {
				if ( error !== null ) {
					console.error( 'Failed to commit tag: ' + error );
				}
				callback( null, settings );
			} );
		};
	};

	const defaults = {
		url: `https://svn.riouxsvn.com/${ pkg.name }/`,
		slug: `${ pkg.name }`,
		mainFile: `${ pkg.name }.php`,
		username: '',
		buildDir: 'dist',
		assetsDir: '.wordpress-org',
		tmpDir: '/tmp/',
		newVersion: pkg.version,
	};

	let settings = merge( defaults, pkg.hasOwnProperty( 'wpDeployer' ) ? pkg.wpDeployer : {} );

	settings = merge( settings, {
		svnPath: settings.tmpDir.replace( /\/$|$/, '/' ) + settings.slug,
	} );

	settings.buildDir = settings.buildDir.replace( /\/$|$/, '/' );

	// console.log('Settings:', settings);

	if ( ! settings.username ) {
		console.error( chalk.red( 'Username is required.' ) );
		process.exit();
	}

	// const password = ( await inquirer.prompt( [
	// 	{
	// 		type: 'password',
	// 		name: 'password',
	// 		default: 'password',
	// 		message: 'Enter password:',
	// 	},
	// ] ) ).password;

	// console.log( 'password:', password );

	// if ( ! password ) {
	// 	console.error( chalk.red( 'Password is required.' ) );
	// 	process.exit();
	// }

	const steps = [
		function( callback ) {
			callback( null, settings );
		},
		checkoutDir( 'trunk', settings ),
		clearTrunk( settings ),
		copyBuild( settings ),
		addFiles( settings ),
		commitToTrunk( settings ),
		commitTag( settings ),
	];

	waterfall( steps, function( err, result ) {
		console.log( chalk.green( 'Deployed successfully.' ) );
	} );
};

wpDeployer();
