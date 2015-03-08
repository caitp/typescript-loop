"use strict"; (function(window) {
  var document = window.document;

  if (!window.Worker) {
    // TODO(caitp): display message in DOM indicating that required technologies
    // are not available.
    return;
  }

  var tsc = new Worker("lib/typescript-worker.js");

  function compile(value) {
    tsc.postMessage(value);
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

    var doCompile = debounce(compile, 300, true);
    var $compiled = $(containers[1].querySelector('.CodeMirror'));

    // Listen for changing text
    source.on("change", function changedSource(cm) {
      doCompile(cm.getValue());
    });

    function setCompiledText(text, errors) {
      if (typeof text !== "string") text = "";
      if (errors) {
        if (text) text += "\n\n";
        text += "// Errors:\n";
        text += errors.split("\n").map(function(line) {
          return "// " + line;
        }).join("\n");
      }
      compiled.setValue(text);
      $compiled.removeClass('error');
    }

    function setCompilerError(errors) {
      if (typeof errors !== "string") errors = "";
      compiled.setValue(errors);
      $compiled.addClass('error');
    }

    tsc.onmessage = function(e) {
      var msg = e.data;
      switch (msg.type) {
        case "compiled":
          setCompiledText(msg.compiled, msg.errors);
          break;
        case "error":
          setCompilerError(msg.errors);
          break;
      }
    }
  }

  if (document.body) {
    setupDOM();
  } else {
    document.addEventListener("DOMContentLoaded", setupDOM);
  }
})(this);
