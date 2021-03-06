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

  function restParams(fn, start) {
    if (typeof start !== "number") start = fn.length - 1;
    start = Math.max((+start || 0), 0);
    return function() {
      var args = arguments;
      var i = -1;
      var length = Math.max(args.length - start, 0);
      var rest = new Array(length);
      while (++i < length) rest[i] = args[start + i];
      switch(start) {
        case 0: return fn.call(this, rest);
        case 1: return fn.call(this, args[0], rest);
        case 2: return fn.call(this, args[0], args[1], rest);
        default:
          var otherArgs = new Array(start);
          i = - 1;
          while (++i < start) otherArgs[i] = args[i];
          otherArgs[start] = rest;
          return fn.apply(this, otherArgs);
      }
    }
  }

  function compileAndEval(source) {
    return compile(source).
      then(function(msg) {
        msg.text = [];
        var oldPrint = global.print;
        var oldAlert = global.alert;
        var oldConsole = global.console;
        var oldConsoleLog = oldConsole && oldConsole.log;

        // It's a huge hack, but what else can we do :[
        global.print = restParams(function print(text) {
          text = text.join(" ");
          msg.text.push({ type: "print", text: text });
          oldConsoleLog && oldConsoleLog.call(oldConsole, "print: " + text);
        });
        global.alert = restParams(function alert(text) {
          text = text.join(" ");
          msg.text.push({ type: "alert", text: text });
          oldConsoleLog && oldConsoleLog.call(oldConsole, "alert: " + text);
        });
        var fakeConsoleLog = restParams(function fakeConsoleLog(text) {
          text = text.join(" ");
          msg.text.push({ type: "console.log", text: text });
          oldConsoleLog && oldConsoleLog.call(oldConsole, text);  
        });
        (oldConsole || (global.console = {})).log = fakeConsoleLog;
        try {
          (global, eval)(wrapSourceForEval(msg.source));
        } catch (e) {
          msg.text.push({ type: "error", text: "" + e });
        }
        global.print = oldPrint;
        global.alert = oldAlert;
        if (!oldConsole) delete global.console;
        else oldConsole.log = oldConsoleLog;
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
      lineWrapping: true,
      value: "",
      mode: "text/typescript"
    });

    var compiled = CodeMirror(containers[1], {
      lineNumbers: true,
      readOnly: true,
      lineWrapping: true,
      value: "",
      mode: "text/typescript"
    });

    var debouncedCompile = debounce(compileAndEvalInternal, 500, true);
    var $compiled = $(containers[1].querySelector(".CodeMirror"));
    var $log = $(document.querySelector(".eval-col"));

    function makeIconSpan(iconClass) {
      return ["<span class='glyphicon ", iconClass,
              "' aria-hidden='true'></span>"].join("");
    }
    function makeSROnly(text) {
      return ["<span class='sr-only'>", text, "</span>"].join("");
    }

    var kClassForMessageType = {
      "print": "alert alert-print",
      "console.log": "alert alert-print",
      "alert": "alert alert-info",
      "error": "alert alert-danger"
    };
    var kIconForMessageType = {
      "print": makeIconSpan("glyphicon-chevron-right"),
      "console.log": makeIconSpan("glyphicon-cheveron-right"),
      "alert": makeIconSpan("glyphicon-asterisk"),
      "error": makeIconSpan("glyphicon-exclamation-sign")
    };
    var kAccessibilityForMessageType = {
      "print": makeSROnly("print: "),
      "console.log": makeSROnly("console.log: "),
      "alert": makeSROnly(" alert: "),
      "error": makeSROnly("error: ")
    };

    function logMessages(messages) {
      $log.empty();
      if (!messages) return;
      messages.forEach(function(msg) {
        var className = kClassForMessageType[msg.type];
        var icon = kIconForMessageType[msg.type];
        var access = kAccessibilityForMessageType[msg.type];
        $log.append("<p class='" + className + "'>" +  icon + access + msg.text + "</p>");
      });
    }

    function updateLocation(contents) {
      if (history.replaceState) {
        history.replaceState(null, document.title,
                             "#" + encodeURIComponent(contents));
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
        source += [
          "/**",
          " * Errors:",
          " *",
          errors.split("\n").map(function(line) { return " * " + line; }).join("\n"),
          " */\n"
        ].join("\n");
      }
      compiled.setValue(source);
      $compiled.removeClass("error warning success");
      $compiled.addClass(errors ? "warning" : "success");
      logMessages(msg.text);
    }

    function compilerError(msg) {
      var errors = msg.errors || "";
      compiled.setValue(errors);
      $compiled.removeClass("warning success");
      $compiled.addClass("error");
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
