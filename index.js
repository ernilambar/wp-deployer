#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';

import chalk from 'chalk';

const pkg = fs.readJsonSync( './package.json' );

console.log(`Deploying...`);
