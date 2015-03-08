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
    return "(function() {\n" +
           source +
           "\n})();";
  }

  function compileAndEval(source) {
    return compile(source).
      then(function(msg) {
        msg.text = [];
        var oldPrint = global.print;
        var oldAlert = global.alert;
        // It's a huge hack, but what else can we do :[
        global.print = function print(text) {
          var text = Array.prototype.slice.call(arguments).join(" ");
          msg.text.push({ type: "print", text: text });
          console.log("print:" + text);
        }
        global.alert = function alert(text) {
          var text = Array.prototype.slice.call(arguments).join(" ");
          msg.text.push({ type: "alert", text: text });
          console.log("alert:" + text);
        }
        try {
          (global, eval)(wrapSourceForEval(msg.source));
        } catch (e) {
          msg.text.push({ type: "error", text: '' + e });
        }
        global.print = oldPrint;
        global.alert = oldAlert;
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

    var kClassForMessageType = {
      "print": "alert alert-print",
      "alert": "alert alert-info",
      "error": "alert alert-danger"
    };

    function logMessages(messages) {
      $log.empty();
      if (!messages) return;
      messages.forEach(function(msg) {
        var className = kClassForMessageType[msg.type];
        $log.append("<p class='" + className + "'>" + msg.text + "</p>");
      });
    }

    function updateLocation(contents) {
      if (history.replaceState) {
        history.replaceState(null, document.title,
                             '#' + encodeURIComponent(contents));
      }
    }

    function compileAndEvalInternal(source) {
      updateLocation(source);
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
      logMessages(msg.text);
    }

    function compilerError(msg) {
      var errors = msg.errors || "";
      compiled.setValue(errors);
      $compiled.addClass('error');
      logMessages();
    }

    // Listen for changing text
    source.on("change", function changedSource(cm) {
      debouncedCompile(cm.getValue());
    });

    if (location.hash) {
      source.setValue(decodeURIComponent(location.hash.slice(1)));
    }
  }

  if (document.body) {
    setupDOM();
  } else {
    document.addEventListener("DOMContentLoaded", setupDOM);
  }
})(this);
