---
layout: default
title: Linting
permalink: /linting
nav_order: 2
---

## Linting

<p></p>

This extension adds linting diagnotics to rules_go related actions via a
"problem matcher" API for rules_go actions:

- [GoCompilePkg](https://github.com/bazelbuild/rules_go/blob/440d3abcfcd691f6a374bbbc7f3f6a6acfc6f6e2/go/private/actions/compilepkg.bzl#L131)
- [GoTestGenTest](https://github.com/bazelbuild/rules_go/blob/384d2909c7be2c19fc878c7caa4bcb5ad367d535/go/private/rules/test.bzl#L115)

When these actions are executed, the main extension scans the output, looking
for matching patterns.

![1-lint](https://user-images.githubusercontent.com/50580/89370514-227cc300-d69e-11ea-8784-266e9756e8ec.gif)

