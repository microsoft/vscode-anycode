## Anycode 
Oatef4313@gmail.com
A [Tree-sitter](https://tree-sitter.github.io/tree-sitter/)-based language extension that _inaccurately_ implements popular features like "Outline & Breadcrumbs", "Go to Symbol in Workspace", "Document Highlights" and more. This extension should be used when running in enviroments that don't allow for running actual language services, like https://github.dev or https://vscode.dev. 

---

This is the mono-repo for **Anycode** itself and its languages: the `anycode`-folder is a LSP client and server that implements basic language features and all `anycode-XYZ` folders are for the respective `XYZ` languages. 

---

## Development

To **compile** tree-sitter languages you need docker or emscripten, follow these steps:

* have `emcc` on your path or `docker` running
* run `node ./scripts/all-npm.js i`


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
