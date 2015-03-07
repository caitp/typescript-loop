#!/usr/bin/env node
var Promise = require("bluebird");
var fs = Promise.promisifyAll(require("fs"));
var rimraf = Promise.promisify(require("rimraf"));
var mkdirp = Promise.promisify(require("mkdirp"));
var path = require("path");

// Be sure to run this whenever site dependencies are updated. It may be
// needed to add additional paths to copy.
//
// TODO(caitp): should use glob instead of exact filenames maybe

var kPackages = [
  {
    package: "codemirror",
    files: ["lib/codemirror.css", "lib/codemirror.js", "LICENSE"],
  },
  {
    package: "typescript",
    files: ["bin/typescriptServices.js", "LICENSE.txt"],
  }
];

var kThirdPartyPath = path.resolve(__dirname, "lib", "thirdparty");
var kNodeModulesPath = path.resolve(__dirname, "node_modules");

// Step 1. prepare `thirdparty` directory
function prepareThirdPartyDirectory() {
  return rimraf(kThirdPartyPath).then(mkdirp(kThirdPartyPath));
}

// Step 2. copy each package into third party directory
function copyPackage(p) {
  var moduleDir = path.resolve(kThirdPartyPath, p.package);
  var nodeModuleDir = path.resolve(kNodeModulesPath, p.package);
  return mkdirp(path.resolve(kThirdPartyPath, p.package)).
    then(copyInPackageFiles);

  function copyInPackageFiles() {
    var files = (Array.isArray(p.files) && p.files || []).map(function(file) {
      var nodeFile = path.resolve(nodeModuleDir, file);
      var thirdPartyFile = path.resolve(moduleDir, path.basename(file));
      var dirname = path.dirname(nodeFile);
      function readFile() {
        return fs.readFileAsync(nodeFile);
      }
      return mkdirp(dirname).
        then(readFile, readFile).
        then(function(data) {
          return fs.writeFileAsync(thirdPartyFile, data);
        });
    });
    return Promise.all(files);
  }
}

function copyPackages() {
  return Promise.all(kPackages.map(function(p) {
    return copyPackage(p).then(function() {
      console.log('  - bundled `' + p.package + '`');
    });
  }));
}

// Step 3a. log a happy success =)
function logSuccess() {
  console.log("Finished bundling, all good");
}

// Step 3b. log a sad failure =(
function logFailure(e) {
  console.log("Error: " + e);
}

// Do the actual work!
prepareThirdPartyDirectory().
  then(copyPackages).
  then(logSuccess, logFailure);
