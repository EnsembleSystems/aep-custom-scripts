// Ensure compatibility with both JDK 7 and 8 JSR-223 Script Engines
try {
  load('nashorn:mozilla_compat.js');
} catch (e) {}

// Import the interface required by the Script snap.
importPackage(com.snaplogic.scripting.language);

// Import the serializable Java type we'll use for the output data.
importClass(java.util.LinkedHashMap);

/**
 * Create an object that implements the methods defined by the "ScriptHook"
 * interface.  We'll be passing this object to the constructor for the
 * ScriptHook interface.
 */
var impl = {
  /*
   * These variables (input, output, error, log) are defined by the
   * ExecuteScript snap when evaluating this script.
   */
  input: input,
  output: output,
  error: error,
  log: log,

  /**
   * The "execute()" method is called once when the pipeline is started
   * and allowed to process its inputs or just send data to its outputs.
   *
   * Exceptions are automatically caught and sent to the error view.
   */
  execute: function () {
    this.log.info('Executing Transform Script');
    while (this.input.hasNext()) {
      try {
        // Read the next input document, store it a new LinkedHashMap, and write this as an output document.
        // We must use a serializable Java type liked LinkedHashMap for each output instead of a native
        // JavaScript object so that downstream Snaps like Copy can process it correctly.
        var inDoc = this.input.next();
        var outDoc = new LinkedHashMap();
        outDoc.put('original', inDoc);
        this.output.write(inDoc, outDoc);
      } catch (err) {
        var errDoc = new LinkedHashMap();
        errDoc.put('error', err);
        this.log.error(err);
        this.error.write(errDoc);
      }
    }
    this.log.info('Script executed');
  },

  /**
   * The "cleanup()" method is called after the snap has exited the execute() method
   */
  cleanup: function () {
    this.log.info('Cleaning up');
  },
};

/**
 * The Script Snap will look for a ScriptHook object in the "hook"
 * variable.  The snap will then call the hook's "execute" method.
 */
var hook = new com.snaplogic.scripting.language.ScriptHook(impl);
