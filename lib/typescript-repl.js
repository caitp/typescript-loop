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

      if (timeout) {
        clearTimeout(timeout);
      }

      if (callNow) {
        fn.apply(context, args);
        return;
      }

      timeout = setTimeout(later, wait);

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
    var $evalParent = $(document.querySelector(".eval-col"));
    var $eval = $("<pre class='eval'></pre>");
    $evalParent.append($eval);

    // Listen for changing text
    source.on("change", function changedSource(cm) {
      doCompile(cm.getValue());
    });

    function evaluate(text) {
      try {
        $eval.text(eval(text));
      } catch (e) {
        $eval.text(e);
      }
    }

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
      evaluate(text);
    }

    function setCompilerError(errors) {
      if (typeof errors !== "string") errors = "";
      compiled.setValue(errors);
      $compiled.addClass('error');
      $eval.text("");
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
