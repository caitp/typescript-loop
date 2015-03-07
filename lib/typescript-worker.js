"use strict";

importScripts("thirdparty/typescript/bin/typescriptServices.js");

var kLiveSourceFileName = "live.ts";
var kLiveCompiledFileNmae = "live.js";

function createCompilerHost(source, libSource, options) {
  var output;
  var host = {
    getSourceFile: function(filename, languageVersion) {
      var source = this.__fileContents[filename];
      if (source) {
        return ts.createSourceFile(filename, source, options, "0");
      }
    },
    writeFile: function(name, text, writeByteOrderMark) {
      if (name === kLiveCompiledFileNmae) {
        output = text;
      }
    },
    getDefaultLibFilename: function() {
      return "lib.d.ts";
    },
    useCaseSensitiveFileNames: function() { return false; },
    getCanonicalFileName: function(filename) { return filename; },
    getCurrentDirectory: function() { return ""; },
    getNewLine: function() { return "\n"; },
    getOutput: function() { return output; },

    __options: options,
    __fileContents: {},
  };

  host.__fileContents[kLiveSourceFileName] = source;
  host.__fileContents["lib.d.ts"] = libSource;
  return host;
}

var libSource = void 0;

function compile(source) {
  var host = createCompilerHost(source, libSource, {});
  var program = ts.createProgram([kLiveSourceFileName], {}, host);
  var errors = program.getDiagnostics();

  if (errors.length) {
    postMessage({
      type: "error",
      errors: errorText(errors)
    });
    return;
  }

  var checker = program.getTypeChecker(true);
  errors = checker.getDiagnostics();
  checker.emitFiles(program.getSourceFile(kLiveSourceFileName));

  postMessage({
    type: "compiled",
    compiled: host.getOutput(),
    errors: errorText(errors)
  });

  function errorText(errors) {
    return errors.map(function(e) {
      if (e.file) {
        var start = e.file.getLineAndCharacterFromPosition(e.start);
        return start.line + ": " + e.messageText;
      }
      return "Error: " + e.messageText;
    }).join("\n");
  }
}

onmessage = function(e) {
  var source = e.data;
  if (!source.trim()) {
    postMessage({
      type: "compiled",
      compiled: "",
      errors: ""
    })
    return;
  }
  if (libSource === void 0) {
    var xhr = new XMLHttpRequest();
    xhr.open("get", "thirdparty/typescript/bin/lib.d.ts");
    xhr.onload = function(e) {
      libSource = e.target.response;
      compile(source);
    }
    xhr.onerror = function(err) {
      postMessage({
        type: "error",
        errors: ["" + err].join("\n")
      });
    }
    xhr.send();
  } else {
    compile(source);
  }
}
