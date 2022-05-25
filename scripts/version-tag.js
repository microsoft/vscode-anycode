/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// CREATES A GIT TAG FROM THE CURRENT VERSION FOR A GIVEN FOLDER. THIS SHOULD ON 'MAIN'

const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const name = process.argv[2];
const folder = path.join(__dirname, '..', name);
const packageJsonPath = path.join(folder, 'package.json');

const data = JSON.parse(fs.readFileSync(packageJsonPath).toString())
const { version } = data;

const tagName = `${name}.v${version}`;
cp.execSync(`git tag ${tagName}`, { cwd: folder, stdio: 'inherit' });

console.log(`DONE, tagName: ${tagName}`)
