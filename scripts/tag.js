/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const name = process.argv[2];
const newVersion = process.argv[3] || 'patch'
const folder = path.join(__dirname, '..', name);
const packageJsonPath = path.join(folder, 'package.json');

if (!fs.existsSync(folder) || !fs.existsSync(packageJsonPath)) {
	console.log(`INVALID extension name ${name} or no package.json-file`);
	process.exit(1);
}

if (!new Set(['major', 'minor', 'patch']).has(newVersion)) {
	console.log(`INVALID version ${newVersion}`);
	process.exit(1);
}

console.log(`TAGGING new version for ${name}`);
cp.execSync(`npm --no-git-tag-version version ${newVersion}`, { cwd: folder, stdio: 'inherit' })

const data = JSON.parse(fs.readFileSync(packageJsonPath).toString())
const { version } = data;

// const tagName = `${name}.v${version}`;
// cp.execSync(`git tag ${tagName}`, { cwd: folder, stdio: 'inherit' });
cp.execSync(`git commit -a -m "Update ${name} to ${version}"`, { cwd: folder, stdio: 'inherit' });


console.log(`DONE, version: ${version}`)
