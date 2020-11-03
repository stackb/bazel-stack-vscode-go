---
layout: default
title: Delve
parent: Debugging
permalink: /debugging/delve
nav_order: 4
---

# Debugging bazel/golang binaries from the command line

<p></p>

_A mini-tutorial_.

<p></p>

Debugging golang binaries using the delve command-line interface is a useful
skill and surprisingly enjoyable interface.  In this page we'll go over the
basics of `dlv exec`.

## Installing Delve

Refer to the [official
instructions](https://github.com/go-delve/delve/tree/master/Documentation/installation)
to install.  Options include:

- `go get github.com/go-delve/delve/cmd/dlv`
- `> Go: Install/Update tools` (contributed by the vscode-go extension)

## Building Binaries

To debug your binaries, build the `go_binary` or `go_test` targets with
debugging symbols.  Setting the `dbg` [compilation
mode](https://github.com/bazelbuild/rules_go/blob/22401d892a4dac2c5c089ea2a5cd9fca5276415e/go/private/mode.bzl)
affects the generated file path and (not surprisingly) the file size:

```bash
$ bazel build  @bazel_gazelle//label:go_default_test
Target @bazel_gazelle//label:go_default_test up-to-date:
  bazel-bin/external/bazel_gazelle/label/darwin_amd64_stripped/go_default_test
$ du -sh bazel-bin/external/bazel_gazelle/label/darwin_amd64_stripped/go_default_test
3.0M	bazel-bin/external/bazel_gazelle/label/darwin_amd64_stripped/go_default_test
```

```bash
$ bazel build -c dbg @bazel_gazelle//label:go_default_test
Target @bazel_gazelle//label:go_default_test up-to-date:
  bazel-bin/external/bazel_gazelle/label/darwin_amd64_debug/go_default_test
$ du -sh bazel-bin/external/bazel_gazelle/label/darwin_amd64_debug/go_default_test
3.9M	bazel-bin/external/bazel_gazelle/label/darwin_amd64_debug/go_default_test
```

> (here we're arbitrarily choosing a test target in the `@bazel_gazelle`
workspace)

## Executing Delve

Not that we have a suitable binary, we can use the `dlv exec` subcommand to
start a delve repl that runs the golang binary in debug mode:

```bash
$ dlv exec --api-version=2 bazel-bin/external/bazel_gazelle/label/darwin_amd64_debug/go_default_test
Type 'help' for list of commands.
(dlv)
```

The `dlv` process is now waiting for additional commands.  A handy way to get
oriented is to set a breakpoint at the `main` function in the `main` package.

```go
(dlv) b main.main
Breakpoint 1 set at 0x114854b for main.main() bazel-out/darwin-dbg/bin/external/bazel_gazelle/label/darwin_amd64_debug/go_default_test%/testmain.go:59
```

Ok, now let's continue (`c`) to that point:

```go
(dlv) c
> main.main() bazel-out/darwin-dbg/bin/external/bazel_gazelle/label/darwin_amd64_debug/go_default_test%/testmain.go:59 (hits goroutine(1):1 total:1) (PC: 0x114854b)
    54:			}
    55:		}
    56:		return tests
    57:	}
    58:
=>  59:	func main() {
    60:		if shouldWrap() {
    61:			err := wrap("github.com/bazelbuild/bazel-gazelle/label")
    62:			if xerr, ok := err.(*exec.ExitError); ok {
    63:				os.Exit(xerr.ExitCode())
    64:			} else if err != nil {
```

Awesome!  We are now debugging and get a contextual source window into our
current breakpoint location.  We can step over the next few lines with the
`next` command (`n`):

```go
(dlv) n
> main.main() bazel-out/darwin-dbg/bin/external/bazel_gazelle/label/darwin_amd64_debug/go_default_test%/testmain.go:76 (PC: 0x11486a2)
    71:
    72:		// Check if we're being run by Bazel and change directories if so.
    73:		// TEST_SRCDIR and TEST_WORKSPACE are set by the Bazel test runner, so that makes a decent proxy.
    74:		testSrcdir := os.Getenv("TEST_SRCDIR")
    75:		testWorkspace := os.Getenv("TEST_WORKSPACE")
=>  76:		if testSrcdir != "" && testWorkspace != "" {
    77:			abs := filepath.Join(testSrcdir, testWorkspace, "external/bazel_gazelle/label")
    78:			err := os.Chdir(abs)
    79:			// Ignore the Chdir err when on Windows, since it might have have runfiles symlinks.
    80:			// https://github.com/bazelbuild/rules_go/pull/1721#issuecomment-422145904
    81:			if err != nil && runtime.GOOS != "windows" {
```

We can inspect local variables:

```go
(dlv) locals
testSrcdir = ""
testWorkspace = ""
```

Let's check what functions are defined (`funcs`) that include `Test` and set a breakpoint
at one of the test entrypoints:

```go
(dlv) funcs Test
github.com/bazelbuild/bazel-gazelle/label.TestImportPathToBazelRepoName
github.com/bazelbuild/bazel-gazelle/label.TestLabelString
github.com/bazelbuild/bazel-gazelle/label.TestParse
testing.listTests
testing.newTestContext
testing.runTests
testing.runTests.func1
testing.runTests.func1.1
testing/internal/testdeps.(*TestDeps).ImportPath
...
```

```go
(dlv) b github.com/bazelbuild/bazel-gazelle/label.TestLabelString
Breakpoint 2 set at 0x111b82b for github.com/bazelbuild/bazel-gazelle/label.TestLabelString() external/bazel_gazelle/label/label_test.go:23
```

```go
(dlv) c
```

At this point, delve fails to print source code as it cannot find the source
file (which exists in an external workspace).  Here's a hack to support that:  

```bash
ln -s $(bazel info output_base)/external external
```

We can also use the edit command to open in the editor to see where we are:

```go
(dlv) ed
```

Let's relist the source code:

```
(dlv) l
> github.com/bazelbuild/bazel-gazelle/label.Label.String() external/bazel_gazelle/label/label.go:127 (PC: 0x111ac8b)
   122:			Name:     name,
   123:			Relative: relative,
   124:		}, nil
   125:	}
   126:
=> 127:	func (l Label) String() string {
   128:		if l.Relative {
   129:			return fmt.Sprintf(":%s", l.Name)
   130:		}
   131:
   132:		var repo string
```

OK, that looks better.

At this point, we can set a breakpoint at line `48` in the current file,
continue to it, and print the value of the `spec` variable:

```go
(dlv) b 48
(dlv) c
(dlv) p spec
(dlv) p spec
struct { github.com/bazelbuild/bazel-gazelle/label.l github.com/bazelbuild/bazel-gazelle/label.Label; github.com/bazelbuild/bazel-gazelle/label.want string } {
	l: github.com/bazelbuild/bazel-gazelle/label.Label {Repo: "", Pkg: "", Name: "foo", Relative: false},
	want: "//:foo",}
```

Let's step into the function:

```
(dlv) s
> github.com/bazelbuild/bazel-gazelle/label.Label.String() external/bazel_gazelle/label/label.go:127 (PC: 0x111ac8b)
   122:			Name:     name,
   123:			Relative: relative,
   124:		}, nil
   125:	}
   126:
=> 127:	func (l Label) String() string {
   128:		if l.Relative {
   129:			return fmt.Sprintf(":%s", l.Name)
   130:		}
   131:
   132:		var repo string
```

OK, you get the idea.... this is just the tip of the iceberg here.  Use the help
menu to get a better sense of the possibilities.

Happy `$@#!&!` debugging!

## Editor Support

The dlv edit command (`ed`) uses the `DELVE_EDITOR` or `EDITOR` environment
variables to open an editor at the specified position.  Delve edit uses a format
[compatible with
vim](https://github.com/go-delve/delve/blob/37d1e0100a7b19aa47870196ed1fc0766ffa4eb6/pkg/terminal/command.go#L1545).
Here's a bash script `delve-edit-vscode` you can use as a shim:

```bash
#!/bin/bash
set -euo pipefail

# convert args from vim-style '+22 /path/to/file' to vscode-style
# '/path/to/file:22'
line="$1"
file="$2"

if [[ $file == external/* ]]; then
    file="$(bazel info output_base)/${file}"
fi

code --goto "${file}:${line:1}"
```

```bash
chmod +x ~/bin/delve-edit-vscode
export DELVE_EDITOR=~/bin/delve-edit-vscode
```


## See Also

- <https://github.com/bazelbuild/rules_go/issues/993>
- <https://www.jamessturtevant.com/posts/Using-the-Go-Delve-Debugger-from-the-command-line/>
- <https://github.com/bazelbuild/rules_go/issues/1844/>
- <https://github.com/microsoft/vscode-go/issues/2807>

