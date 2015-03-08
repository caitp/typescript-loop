"use strict"; (function(global) {
  var TSL = global.TSL || (global.TSL = {});
  var document = window.document;

  if (!global.Worker) {
    // TODO(caitp): display message in DOM indicating that required technologies
    // are not available.
    return;
  }

  function noop() {}

  var tsc = new Worker("lib/typescript-worker.js");
  tsc.onmessage = noop;

  var ignoreIt = {
    then: noop
  };

  function compile(source) {
    if (tsc.onmessage !== noop) return ignoreIt;
    return new Promise(function(resolve, reject) {
      tsc.postMessage({
        type: "compile",
        source: source
      });
      tsc.onmessage = function(e) {
        var msg = e.data;
        tsc.onmessage = noop;
        if (msg.type === "error") {
          return reject(msg);
        } else {
          return resolve(msg);
        }
      }
    });
  }

  function wrapSourceForEval(source) {
    return [
      "(function() {",
      source,
      "})()"
    ].join("\n");
  }

  function compileAndEval(source) {
    return compile(source).
      then(function(msg) {
        msg.text = "";
        try {
          msg.text = (global, eval)(wrapSourceForEval(msg.source));
        } catch (e) {
          msg.text = "Error: " + e;
        }
        return msg;
      });
  }

  function debounce(fn, wait, immediate) {
    var timeout;
    return function() {
      var context = this;
      var args = [];
      for (var i = 0; i < arguments.length; ++i) {
        args.push(arguments[i]);
      }
      var callNow = immediate && timeout === void 0;

      clearTimeout(timeout);
      timeout = setTimeout(later, wait);

      if (callNow) {
        fn.apply(context, args);
        return;
      }

      function later() {
        timeout = void 0;
        fn.apply(context, args);
      }
    }
  }

  function setupDOM() {
    // Prepare code views:
    var containers = document.querySelectorAll(".editor-col");
    var source = CodeMirror(containers[0], {
      lineNumbers: true,
      value: "",
      mode: "text/typescript"
    });

    var compiled = CodeMirror(containers[1], {
      lineNumbers: true,
      readOnly: true,
      value: "",
      mode: "text/typescript"
    });

    var debouncedCompile = debounce(compileAndEvalInternal, 500, true);
    var $compiled = $(containers[1].querySelector('.CodeMirror'));
    var $log = $(document.querySelector(".eval-col"));

    function compileAndEvalInternal(source) {
      if (tsc.onmessage === noop) {
        compileAndEval(source).
          then(compilerOK, compilerError);
      }
    }

    function compilerOK(msg) {
      var source = msg.source || "";
      var errors = msg.errors;
      if (errors) {
        if (source) source += "\n\n";
        source += "// Errors:\n";
        source += errors.split("\n").map(function(line) {
          return "// " + line;
        }).join("\n");
      }
      compiled.setValue(source);
      $compiled.removeClass("error");
      $log.text(msg.text || "");
    }

    function compilerError(msg) {
      var errors = msg.errors || "";
      compiled.setValue(errors);
      $compiled.addClass('error');
      $log.text("");
    }

    // Listen for changing text
    source.on("change", function changedSource(cm) {
      debouncedCompile(cm.getValue());
    });
  }

  if (document.body) {
    setupDOM();
  } else {
    document.addEventListener("DOMContentLoaded", setupDOM);
  }
})(this);
