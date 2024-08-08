// deno-fmt-ignore-file
// deno-lint-ignore-file

// Copyright Joyent and Node contributors. All rights reserved. MIT license.
// Taken from Node 18.12.1
// This file is automatically generated by `tests/node_compat/runner/setup.ts`. Do not modify this file manually.

'use strict';
// Regression test for https://github.com/nodejs/node/issues/10806

require('../common');
const assert = require('assert');
const vm = require('vm');
const ctx = vm.createContext({ open() { } });
const window = vm.runInContext('this', ctx);
const other = 123;

assert.notStrictEqual(window.open, other);
window.open = other;
assert.strictEqual(window.open, other);
window.open = other;
assert.strictEqual(window.open, other);
