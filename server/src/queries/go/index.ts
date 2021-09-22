/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { QueryModule } from '../../languages';
import outline from './outline.scm';
import locals from './locals.scm';
import comments from './comments.scm';
import identifiers from './identifiers.scm';
import folding from './folding.scm';
import references from './references.scm';

export const mod: QueryModule = {
	outline,
	comments,
	locals,
	folding,
	identifiers,
	references
};

export default mod;
