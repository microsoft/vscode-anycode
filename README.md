## Anycode 

A language extension that _inaccurately_ implements popular features like "Go to Definition", "Outline", or "Workspce Symbol Search". This extension should be used when running in enviroments that don't allow for running actual language services (like github.dev). 

The services provided by this extension are meant to be better than full text search but fall short when compared to real language services. The table below shows what features have been implemented for what language (various levels of completness apply), the following paragrath outlines how things are implemented.

|  | `c` | `cpp` | `csharp` | `java` | `php` | `rust` | `go` | `python` | `typescript` | _notes_
|---|---|---|---|---|---|---|---|---|---|---|
| [Outline](https://code.visualstudio.com/docs/editor/editingevolved#_go-to-symbol) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 
| [Workspace Symbol Search](https://code.visualstudio.com/docs/editor/editingevolved#_open-symbol-by-name) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Anything that would show in outline can be found via workspace symbol search|
| [Go to Definition](https://code.visualstudio.com/docs/editor/editingevolved#_go-to-definition) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Reference Search | ⭕️ | ⭕️ | ✅ | ✅ | ⭕️ | ✅ | ✅ | ⭕️ | ✅ |
| Document Highlights | ⭕️<sup>1</sup> | ⭕️<sup>1</sup> | ✅<sup>2</sup> | ✅<sup>2</sup> | ⭕️<sup>1</sup> | ✅<sup>2</sup> | ✅<sup>2</sup> | ⭕️<sup>1</sup> | ⭕️<sup>1</sup> |  <sup>1</sup> Identifiers with the same value are highlighted <sup>2</sup> Local variables and parameters are highlighted correctly else identifer-based highlights are used |
| [Completions](https://code.visualstudio.com/docs/editor/intellisense) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Expand/Shrink Selection | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| [Folding](https://code.visualstudio.com/docs/editor/codebasics#_folding) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |


For each file anycode creates a (Tree-sitter) syntax tree. All features are based on these syntax trees and there is no semantic information, e.g no guarantee for correctness. Syntax trees allow to identify declarations, e.g "these lines define a function named `foo`" and allow to identity usages, e.g "this is an invocation of function `bar`". In essence, anycode compares names of usages and declarations - go to definition will search for any declaration matching the word under the cursor, reference search finds all usages and declaration etc. The approach often yields surprisingly good results but can easily tricked be with repeated/shadowed names and declarations. Anycode is no replacement for a language service but better source code full text search.

There are two settings that define how anycode works: `anycode.language.features` controls what feature is avialable, either for all or specific languages and `anycode.symbolIndexSize` defines how many files should be eagerly fetched. This is important for cross file features like workspace symbol search or go to definition. The default is 100 and depending on your project higher values might be needed.

---

## Development

To **compile** tree-sitter languages you need docker or emscripten, follow these steps:

* have `emcc` on your path or `docker` running
* run `npm install`

There is a **watch** task to build TS, either `npm run watch` or "F1 > Run Task > npm: watch". The task will auto launch on next open if desired. 

Push a tag to **publish** a new version to the marketplace: 

* run `npm version path` and then
* run `git push && git push --tag`

## Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
