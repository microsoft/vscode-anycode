/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { QueryModule } from '..';
import cOutline from '../c/outline.scm';
import outline from './outline.scm';
import comments from './comments.scm';
import identifiers from './identifiers.scm';

export const mod: QueryModule = {
	outline: `${cOutline}\n${outline}`,
	comments,
	identifiers
};

export default mod;
