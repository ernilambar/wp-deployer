#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import merge from 'just-merge';
import { exec } from 'child_process';

import { waterfall } from 'async';

const pkg = fs.readJsonSync( './package.json' );

const wpDeployer = async () => {
	console.log( `Processing...` );

  const clearTrunk = (settings) => {
    return function(settings, callback) {
      console.log( `Clearing trunk.` );

      // console.log( 'rm -fr '+settings.svnPath+"/trunk/*" );

      exec( 'rm -fr '+settings.svnPath+"/trunk/*", function(){
        callback( null, settings );
      });
    }
  }

  const checkoutDir = ( dir, settings ) => {
    return function(settings, callback){
      console.log('Checking out ' + settings.url + dir + '/...');

      const checkoutUrl = `${ settings.url }${dir}/`;
      const targetPath = `${settings.svnPath}/${dir}`;

      // console.log('checkoutUrl', checkoutUrl);

      // console.log('command:', `svn co ${ checkoutUrl } ${ targetPath }` );

      exec(`svn co ${ checkoutUrl } ${ targetPath }`, function( error, stdout, stderr ) {
        if (error !== null) {
          console.error( 'Checkout of "' + settings.url + dir + '/" unsuccessful: ' + error);
        } else {
          console.log(`Check out complete.`);
        }
        callback( null, settings );
      });
    }
  }

	const defaults = {
		url: `https://svn.riouxsvn.com/${ pkg.name }/`,
    slug: `${ pkg.name }`,
		mainFile: `${ pkg.name }.php`,
		username: '',
		buildDir: 'dist',
		assetsDir: '.wordpress-org',
    tmpDir: '/tmp/',
	};

	let settings = merge( defaults, pkg.hasOwnProperty( 'wpDeployer' ) ? pkg.wpDeployer : {} );

  settings = merge( settings, {
    "svnPath": settings.tmpDir.replace(/\/$|$/, '/') + settings.slug
  });

  settings.buildDir = settings.buildDir.replace(/\/$|$/, '/');

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
    clearTrunk(settings ),
    checkoutDir( 'trunk', settings ),
  ];

  waterfall( steps, function (err, result){
    console.log( chalk.green( `Deployed successfully.` ) );
  });
};

wpDeployer();
