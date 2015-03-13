"use strict";

importScripts("thirdparty/bluebird/js/browser/bluebird.js");
importScripts("thirdparty/typescript/bin/typescriptServices.js");

var kLiveSourceFileName = "live.ts";
var kLiveCompiledFileNmae = "live.js";

var kBuiltinFunctionTypes = [
  "declare function print(a?, b?, c?, d?, e?, f?, g?, h?, i?, j?, k?, l?, m?, n?, o?, p?, q?, r?, s?, t?, u?, v?, w?, x?, y?, z?);",
  "declare function alert(a?, b?, c?, d?, e?, f?, g?, h?, i?, j?, k?, l?, m?, n?, o?, p?, q?, r?, s?, t?, u?, v?, w?, x?, y?, z?);"
].join("\n") + "\n\n";

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


function compileSource(source, libSource) {
  var options = {
    target: ts.ScriptTarget.ES5
  };
  var host = createCompilerHost(source, kBuiltinFunctionTypes + libSource, options);
  var program = ts.createProgram([kLiveSourceFileName], options, host);
  var errors = program.getDiagnostics();

  if (errors.length) {
    return {
      type: "error",
      errors: errorText(errors)
    };
  }

  var checker = program.getTypeChecker(true);
  errors = checker.getDiagnostics();
  checker.emitFiles(program.getSourceFile(kLiveSourceFileName));

  return {
    type: "compiled",
    source: host.getOutput(),
    errors: errorText(errors)
  };

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


function loadDefaultLibrary(defaultLib) {
  return new Promise(function(resolve, reject) {
    if (defaultLibSource !== void 0) return resolve();
    var xhr = new XMLHttpRequest();
    var url = "thirdparty/typescript/bin/lib.d.ts";
    xhr.open("get", url);
    xhr.onload = function loaded(e) {
      defaultLibSource = e.target.response;
      resolve();
    }
    xhr.onerror = function error(e) {
      reject({
        type: "error",
        errors: "Failed to load " + url + ": " + (e.statusText || "error.")
      })
    }
    xhr.send();
  });
}


var defaultLibSource = void 0;

function compileInternal(source) {
  return loadDefaultLibrary().
    then(function() {
      try {
        return compileSource(source, defaultLibSource);
      } catch (e) {
        var err = e.message;
        var stack = (e.stack || "").
          replace(new RegExp("^" + e.name + "(\r*\n*)*:?", ""), "").
          replace(err, "").
          replace(/^(\s|\r|\n)*/, "");
        e = err.replace(/^error:\s*/i, "") + "\n\n" + stack;
        return {
          type: "error",
          errors: "CompilerError:\n\n" + e
        };
      }
    });
}

onmessage = function(e) {
  var msg = e.data;
  var source = msg.source;
  compileInternal(source).then(postMessage, postMessage);
}
