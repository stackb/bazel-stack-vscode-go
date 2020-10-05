import { ProblemMatcherTest, ProblemMatcherTestRunner } from 'bazel-stack-vscode-api/out/test/problemMatcherTestRunner';
import * as path from 'path';
import * as vscode from 'vscode';
import { markers } from 'vscode-common';

suite('Problem Matchers', () => {
	let runner: ProblemMatcherTestRunner;

	setup(() => {
		runner = ProblemMatcherTestRunner.fromPackageJson(path.join(__dirname, '..', '..', '..', 'package.json'));
	});

	const cases: ProblemMatcherTest[] = [
		{
			name: 'GoCompilePkg',
			example: '/private/var/tmp/_bazel_user/5e59961380901f34e1b2c13f9ef86429/sandbox/darwin-sandbox/7/execroot/wsname/main.go:28:1: syntax error: non-declaration statement outside function body',
			uri: 'file:///%24%7BworkspaceRoot%7D/main.go',
			markers: [{
				message: 'syntax error: non-declaration statement outside function body',
				owner: 'GoCompilePkg',
				resource: vscode.Uri.file('main.go'),
				severity: markers.MarkerSeverity.Error,
				startLineNumber: 28,
				startColumn: 1,
				endLineNumber: 28,
				endColumn: 1,
			}],
		},
		{
			name: 'GoTestGenTest',
			example: `gentestmain: ParseFile("pkg/foo_test.go"): pkg/foo_test.go:21:6: expected ';', found ':='`,
			uri: 'file:///%24%7BworkspaceRoot%7D/pkg/foo_test.go',
			markers: [{
				message: `expected ';', found ':='`,
				owner: 'GoTestGenTest',
				resource: vscode.Uri.file('pkg/main.go'),
				severity: markers.MarkerSeverity.Error,
				startLineNumber: 21,
				startColumn: 6,
				endLineNumber: 21,
				endColumn: 6,
			}],
		},
		
	];

	cases.forEach((tc) => {
		test(tc.d || tc.name, async () => runner.test(tc));
	});
	
});
