"use strict";

importScripts("thirdparty/bluebird/js/browser/bluebird.js");
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


function compileSource(source, libSource) {
  return new Promise(function(resolve, reject) {
    var options = {
      target: ts.ScriptTarget.ES5
    };
    var host = createCompilerHost(source, libSource, options);
    var program = ts.createProgram([kLiveSourceFileName], options, host);
    var errors = program.getDiagnostics();

    if (errors.length) {
      return reject({
        type: "error",
        errors: errorText(errors)
      });
    }

    var checker = program.getTypeChecker(true);
    errors = checker.getDiagnostics();
    checker.emitFiles(program.getSourceFile(kLiveSourceFileName));

    return resolve({
      type: "compiled",
      source: host.getOutput(),
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
  });
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
      return compileSource(source, defaultLibSource);
    });
}


var kMessageProperties = {
  "Error": ["message", "stack"]
};


function copyMessageProperties(dest, object, keys) {
  for (var i = 0; i < keys.length; ++i) {
    var key = keys[i];
    if (key in dest) continue;
    dest[key] = object[key];
  }
}


function encodeMessageObject(object) {
  var o = object;
  var result = Array.isArray(object) ? [] : {};
  do {
    var C = o.constructor;
    if (C && C.name && kMessageProperties[C.name]) {
      copyMessageProperties(result, o, kMessageProperties[C.name]);
    }
  } while (object);
  return result;
}


function replaceMessageProperty(key, value) {
  if (typeof value === "object" && value) {
    value = encodeMessageObject(value);
  }
  return value;
}


function encodeMessage(msg) {
  var encoded = Array.isArray(msg) ? [] : {};
  Object.getOwnPropertyNames(msg).forEach(function(key) {
    encoded[key] = replaceMessageProperty(key, msg[key]);
  });

  return encoded;
}


function dispatchMessage(msg) {
  postMessage(encodeMessage(msg));
}


onmessage = function(e) {
  var msg = e.data;
  var source = msg.source;
  compileInternal(source).then(dispatchMessage, dispatchMessage);
}

