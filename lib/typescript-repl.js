"use strict"; (function(window) {
  var document = window.document;

  if (!window.Worker) {
    // TODO(caitp): display message in DOM indicating that required technologies
    // are not available.
    return;
  }

  var tsc = new Worker("lib/typescript-worker.js");

  var compiling = false;
  function compile(value) {
    compiling = true;
    tsc.postMessage(value);
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

    var $compiled = $(containers[1].querySelector('.CodeMirror'));

    var waiting = void 0;
    var compileLater;

    // Listen for changing text
    var lastChange = Date.now();
    source.on("change", function changedSource(cm) {
      var thisChange = Date.now();
      var source = cm.getValue();

      // Debounce change handling to about half a second, just to make things
      // more complicated!
      if (thisChange - lastChange >= 500 && !compiling) {
        if (compileLater !== void 0) {
          clearTimeout(compileLater);
        }
        compile(source);
      } else if (compiling) {
        lastChange = thisChange;
        waiting = source;
      } else if (compileLater === void 0) {
        compileLater = setTimeout(function() {
          source.signal("change");
        }, 500);
      }
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

    function compileNext() {
      if (waiting !== void 0) {
        compile(waiting);
        waiting = void 0;
      }
    }

    function setCompilerError(errors) {
      if (typeof errors !== "string") errors = "";
      compiled.setValue(errors);
      $compiled.addClass('error');
    }

    tsc.onmessage = function(e) {
      compiling = false;
      var msg = e.data;
      switch (msg.type) {
        case "compiled":
          setCompiledText(msg.compiled, msg.errors);
          return compileNext();
        case "error":
          setCompilerError(msg.errors);
          return compileNext();
      }
    }
  }

  if (document.body) {
    setupDOM();
  } else {
    document.addEventListener("DOMContentLoaded", setupDOM);
  }
})(this);
