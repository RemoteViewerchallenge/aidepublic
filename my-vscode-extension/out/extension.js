"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
function activate(context) {
    console.log('Congratulations, your extension "my-vscode-extension" is now active!');
    let disposable = vscode.commands.registerCommand('my-vscode-extension.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from My VSCode Extension!');
    });
    context.subscriptions.push(disposable);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map