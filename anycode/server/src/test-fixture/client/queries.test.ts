/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { LanguageInfo } from '../../common';
import Languages, { QueryType } from '../../languages';

export function init(info: LanguageInfo) {
	if (!info.queries) {
		return;
	}

	suite(`Queries ${info.languageId}`, function () {
		const types: QueryType[] = ['comments', 'folding', 'identifiers', 'locals', 'outline', 'references'];
		for (let type of types) {
			test(type, function () {

				if (!info.queries![type]) {
					this.skip();
				}

				try {
					const q = Languages.getQuery(info.languageId, type, true);
					assert.ok(q);
				} catch (err) {
					assert.fail(`INVALID ${info.languageId} -> ${err}`);
				}
			});
		}
	});
}
