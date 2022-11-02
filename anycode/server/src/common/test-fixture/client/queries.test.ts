/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { LanguageInfo } from '../../../../../shared/common/initOptions';
import Languages, { QueryType } from '../../languages';

export function init(info: LanguageInfo) {
	if (!info.queryInfo) {
		return;
	}

	suite(`Queries ${info.languageId}`, function () {
		const types: QueryType[] = ['comments', 'folding', 'identifiers', 'locals', 'outline', 'references'];
		for (let type of types) {
			test(type, async function () {

				if (!info.queryInfo![type]) {
					this.skip();
				}

				try {
					const language = await Languages.getLanguage(info.languageId);
					const q = Languages.getQuery(language, type, true);
					assert.ok(q);
				} catch (err) {
					assert.fail(`INVALID ${info.languageId} -> ${err}`);
				}
			});
		}
	});
}
