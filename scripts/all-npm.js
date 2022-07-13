/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const newArgv = process.argv.slice(2).join(' ')

function runNpm(folder) {
	console.log(`RUNNING \`npm ${newArgv}\` for ${folder}`)
	cp.execSync(`npm ${newArgv}`, { cwd: folder, stdio: 'inherit' })
}

const root = path.join(__dirname, '../');

runNpm(path.join(root, 'anycode'))
runNpm(path.join(root, 'anycode/client'))
runNpm(path.join(root, 'anycode/server'))

for (let name of fs.readdirSync(root)) {
	if (name.startsWith('anycode-')) {
		runNpm(path.join(root, name))
	}
}
