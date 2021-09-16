## Anycode 

A language extension that **inaccurately** implements the following features

* outline, quick-outline, and breadcrumbs
* workspace symbol search and go to definition
* document highlights for locals, arguments, and identifiers
* identifier based completions
* (experimental) syntax errors via the `anycode.diagnostics`-setting
* expand/shrink selection

This extension should be used when running in enviroments that don't allow for running actual language services. 

Currently, the following languages are supported:  `c`, `cpp`, `csharp`, `java`, `php`, `rust`, `go`, `python`


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
