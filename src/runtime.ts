///<reference path='lib/util.ts' />

"use static"

/* 
 * These functions are called so often that they exist outside of the quby.runtime
 * namespace so they can be as cheap as possible.
 */

/*
 * This is called when a method is not found.
 */
function noSuchMethodError(self:any, callName:string) : void {
    var args:any[] = Array.prototype.slice.call( arguments, 2 );
    var block = args.pop();
    
    quby.runtime.methodMissingError( self, callName, args, block );
};

/**
 * This is the yield function. If a block is given then it is called using the
 * arguments given. If a negative object is given instead (such as false,
 * undefined or null) then a 'missingBlockError' will be thrown.
 * 
 * The intention is that inlined JavaScript can just pass their blocks along
 * to this function, and it'll call it the same as it would in normal
 * translated Quby code.
 * 
 * Any arguments for the block can be passed in after the first parameter.
 * 
 * @param block The block function to call with this function.
 * @return The result from calling the given block.
 */
function quby_callBlock( block: { ( ...args: any[] ): any; }, args:any[]) : any {
    if (!block) {
        quby.runtime.missingBlockError();
    } else {
        if (args.length < block.length) {
            quby.runtime.notEnoughBlockParametersError(block.length, args.length, 'block');
        }

        return block.apply( null, args );
    }
}

/**
 * Checks if the block given is a block (a function),
 * and that it has at _most_ the number of args given.
 * 
 * If either of these conditions fail then an error is thrown.
 * Otherwise nothing happens.
 */
function quby_ensureBlock(block: { ( ...args: any[] ): any; }, numArgs:number) {
    if ( ! (block instanceof Function) ) {
        quby.runtime.missingBlockError();
    } else if ( numArgs < block.length ) {
        quby.runtime.notEnoughBlockParametersError(block.length, numArgs, 'block');
    }
}

/**
 * Checks if the value given exists, and if it does then it is returned.
 * If it doesn't then an exception is thrown. This is primarily for use with globals.
 * 
 * The given name is for debugging, the name of the variable to show in the error if it doesn't exist.
 * 
 * @param global The global variable to check for existance.
 * @param name The name of the global variable given, for debugging purposes.
 * @return The global given.
 */
function quby_checkGlobal(global:any, name:string) {
    if (global === undefined) {
        quby.runtime.runtimeError("Global variable accessed before being assigned to: '" + name + "'.");
    } else {
        return global;
    }
}

/**
 * Checks if the field given exists. It exists if it is not undefined. The field should be a name of
 * a field to access and the name is the fields name when shown in a thrown error.
 * 
 * An error will be thrown if a field of the given field name (the field parameter)
 * does not exist within the object given.
 * 
 * If the field does exist then it's value is returned.
 * 
 * @param fieldVal The value of the field to check if it exists or not.
 * @param obj The object you are retrieving the field from.
 * @param name The name to show in an error for the name of the field (if an error is thrown).
 * @return The value stored under the field named in the object given.
 */
function quby_getField(fieldVal:any, obj:any, name:string) {
    if (fieldVal === undefined) {
        quby.runtime.fieldNotFoundError(obj, name);
    }

    return fieldVal;
}

/**
 * Sets a value to an array given using the given key and value.
 * If the array given is not a QubyArray then an exception is thrown.
 * If the collection given has a 'set' method, then it is considered
 * to be a collection.
 * 
 * This is the standard function used by compiled Quby code for
 * setting values to an collection.
 * 
 * @param collection An collection to test for being a collection.
 * @param key The key for where to store the value given.
 * @param value The value to store under the given key.
 * @return The result of setting the value.
 */
function quby_setCollection( collection: { set: ( key:any, value:any ) => any; }, key:any, value:any ) {
    if ( collection === null ) {
        quby.runtime.runtimeError( "Collection is null when setting a value" );
    } else if ( collection.set ) {
        return collection.set(key, value);
    } else {
        quby.runtime.runtimeError(
                "Trying to set value on a non-collection, it's actually a: " + quby.runtime.identifyObject(collection)
        );
    }
}

/**
 * Gets a value from the given collection using the key given.
 * If the collection given has a 'get' method, then it is considered
 * to be a collection.
 * 
 * This is the standard function used in compiled Quby code for
 * accessing an array.
 * 
 * @param collection An collection to test for being a collection.
 * @param key The key for the element to fetch.
 * @return The value stored under the given key in the given collection.
 */
function quby_getCollection( collection: { get: ( key:any ) => any; }, key:any ) {
    if ( collection === null ) {
        quby.runtime.runtimeError( "Collection is null when getting a value" );
    } else if ( collection.get ) {
        return collection.get( key );
    } else {
        quby.runtime.runtimeError(
                "Trying to get a value from a non-collection, it's actually a: " + quby.runtime.identifyObject(collection)
        );
    }
}

/**
* Runtime
* 
* Functions and objects which may be used at runtime (i.e.
* inside inlined JavaScript) are defined here. This includes
* functions for uniquely formatting variables and functions.
* 
* All compiled Quby code should run perfectly with only this
* class. Everything outside of this class is not needed for
* compiled code to be run.
*/
/*
* Note there are constants defined at the end of this file,
* this is due to limitations in using JSON objects for
* namespaces.
*/
module quby.runtime {
    export var FUNCTION_DEFAULT_TABLE_NAME = '_q_no_funs',
        
        FUNCTION_TABLE_NAME = '_q_funs',

        // needs to be kept lower case for comparisons
        SUPER_KEYWORD = "super",

        // standard exception names
        EXCEPTION_NAME_RUNTIME = "Runtime Error",

        // These are for translating from one class name to another.
        // This is so externally it can have one name but internally it has another.
        TRANSLATE_CLASSES: { [key: string]: string; } = {
                'array'  : 'QubyArray' ,
                'hash'   : 'QubyHash'  ,
                'object' : 'QubyObject'
        },
        
        // the name for block variables
        BLOCK_VARIABLE = '_q_block',

        TEMP_VARIABLE = '_t',
        
        // Prefix names appended to variables/functions/classes/etc to avoid name clahes.
        // Avoids clashes with each other, and with in-built JavaScript stuff.
        VARIABLE_PREFIX = '_var_'   ,
        FIELD_PREFIX    = '_field_' ,
        GLOBAL_PREFIX   = '_global_',
        FUNCTION_PREFIX = '_fun_'   ,
        CLASS_PREFIX    = '_class_' ,
        NEW_PREFIX      = '_new_'   ,
        SYMBOL_PREFIX   = '_sym_'   ,
        
        // Name of the root class that all classes extend.
        ROOT_CLASS_NAME = 'object',
        ROOT_CLASS_CALL_NAME:string = null, // see 'initialize'
        
        FIELD_NAME_SEPERATOR = '@';
        
    /**
     * Translates the public class name, to it's internal one.
     * 
     * For example it translates 'Array' into 'QubyArray',
     * and 'Object' to 'QubyObject'.
     * 
     * If a mapping is not found, then the given name is returned.
     * 
     * @param name The name to translate.
     * @return The same given name if no translation was found, otherwise the internal Quby name for the class used.
     */
    export function translateClassName(name:string) : string {
        var newName = TRANSLATE_CLASSES[name.toLowerCase()];

        if (newName) {
            return newName;
        } else {
            return name;
        }
    }
        
    /**
     * Similar to translateClassName, but works in the opposite direction.
     * It goes from internal name, to external display name.
     * 
     * @param name The class name to reverse lookup.
     */
    export function untranslateClassName(name:string) : string {
        var searchName = name.toLowerCase();
            
        // Look to see if it's got a reverse translate name
        // Like QubyArray should just be Array
        for (var klass in TRANSLATE_CLASSES) {
            var klassName = TRANSLATE_CLASSES[klass];
                
            if ( searchName.toLowerCase() == klassName.toLowerCase() ) {
                return util.str.capitalize( klass );
            }
        }
            
        // no reverse-lookup found : (
        return name;
    }

    /**
     * These are the core JavaScript prototypes that can be extended.
     *
     * If a JavaScript prototype is not mentioned here (like Image) then
     * Quby will make a new class instead of using it.
     *
     * If it is mentioned here then Quby will add to that classes Prototype.
     * (note that Object/QubyObject isn't here because it's not prototype extended).
     */
    export var CORE_CLASSES = [
            'Number',
            'Boolean',
            'Function',
            'String',
            'Array',
            'Hash'
    ]

    export function isCoreClass(name:string) : boolean {
        var coreClasses = quby.runtime.CORE_CLASSES;

        for (var i = 0; i < coreClasses.length; i++) {
            if (name == coreClasses[i].toLowerCase()) {
                return true;
            }
        }

        return false;
    }

    // 'this varaible' is a special variable for holding references to yourself.
    // This is so two functions can both refer to the same object.
    export var THIS_VARIABLE = "_this";

    export function getThisVariable(isInExtension) {
        if (isInExtension) {
            return 'this';
        } else {
            return quby.runtime.THIS_VARIABLE;
        }
    }

    /* ### RUNTIME ### */

    var onError: { ( err: Error ): void; } = null;

    var logCallback: { ( ...args: any[] ): void; } = null;

    /**
     * Sets the callback function for logging information from Quby.
     * 
     * Passing in 'null' or 'false' sets this to nothing.
     * Otherwise this must be given a function object;
     * any other value will raise an error.
     * 
     * The function is passed all of the values sent to log, unaltered.
     * Bear in mind that log can be given any number of arguments (including 0).
     * 
     * Note that passing in undefined is also treated as an error.
     * We are presuming you meant to pass something in,
     * but got it wrong somehow.
     * 
     * @param callback A function to callback when 'quby.runtime.log' is called.
     */
    export function setLog( callback: { ( ...args: any[] ): void; } ) {
        if ( callback === undefined ) {
            quby.runtime.error( "Undefined given as function callback" );
        } else if ( ! callback ) {
            logCallback = null;
        } else if ( typeof(callback) != 'function' ) {
            quby.runtime.error( "Callback set for logging is not function, null or false." );
        }
    }

    /**
     * For handling logging calls from Quby.
     * 
     * If a function has been set using setLog,
     * then all arguments given to this are passed on to that function.
     * 
     * Otherwise this will try to manually give the output,
     * attempting each of the below in order:
     *  = FireBug/Chrome console.log
     *  = Outputting to the FireFox error console
     *  = display using an alert message
     */
    export function log() {
        // custom
        if ( logCallback !== null ) {
            logCallback.apply( null, arguments );
        } else {
            var strOut = Array.prototype.join.call( arguments, ',' );

            // FireBug & Chrome
            if ( window.console && window.console.log ) {
                window.console.log( strOut );
            } else {
                var sent = false;

                // Mozilla error console fallback
                try {
                    window['Components']['classes'][ "@mozilla.org/consoleservice;1" ].
                            getService( window['Components']['interfaces']['nsIConsoleService'] ).
                            logStringMessage( strOut );
                        
                    sent = true;
                } catch ( ex ) {} // do nothing
                    
                // generic default
                if ( ! sent ) {
                    alert( strOut );
                }
            }
        }
    }

    /** 
     * Runs the code given in the browser, within the current document. If an
     * onError function is provided then this will be called if an error occurres.
     * The error object will be passed into the onError function given.
     * 
     * If one is not provided then the error will not be caught and nothing will
     * happen.
     * 
     * @param code The JavaScript code to run.
     * @param onError the function to be called if an error occurres.
     */
    export function runCode( code: string, onErr: { ( Error ): void; } ) : void {
        if (onErr) {
            if (typeof (onErr) != 'function') {
                quby.runtime.error("onError", "onError must be a function.");
            }

            onError = onErr;
            code = 'try { ' + code + ' } catch ( err ) { quby.runtime.handleError(err); }';
        } else {
            onError = null;
        }

        ( new Function( code ) ).call( null );
    }

    /**
     * If there is an onError error handler then the error is passed to this.
     * If there isn't then it is thrown upwards.
     * 
     * The onError must return true to stop the error from being thrown up!
     */
    export function handleError( err: Error ): void;
    export function handleError(err:any) : void {
        if ( ! err.isQuby ) {
            err.quby_message = unformatString( err.message );
        } else {
            err.quby_message = err.message ;
        }

        if (onError != null) {
            if (!onError(err)) {
                throw err;
            }
        } else {
            throw err;
        }
    }

    /**
     * Given a Quby object, this will try to find it's display name.
     * This will first check if it has a prefix, and if so remove this
     * and generate a prettier version of the name.
     * 
     * Otherwise it can also perform lookups to check if it's a core class,
     * such as a Number or Array. This includes reverse lookups for internal
     * structures such as the QubyArray (so just Array is displayed instead).
     * 
     * @param obj The object to identify.
     * @return A display name for the type of the object given.
     */
    export function identifyObject(obj:any) : string {
        if (obj === null) {
            return "null";
        } else {
            var strConstructor = obj.constructor.toString();
            var funcNameRegex = /function ([a-zA-Z0-9_]{1,})\(/;
            var results = funcNameRegex.exec( strConstructor );
                
            if ( results && results.length > 1 ) {
                var name = results[1];
                    
                // if it's a Quby object, get it's name
                if ( name.indexOf(quby.runtime.CLASS_PREFIX) === 0 ) {
                    name = name.substring(quby.runtime.CLASS_PREFIX.length);
                } else {
                    name = quby.runtime.untranslateClassName( name );
                }
                
                name = util.str.capitalize( name );
                    
                return name;
            } else {
                return "<unknown object>";
            }
        }
    }

    /**
     * Checks if the given object is one of the Quby inbuilt collections (such as QubyArray and QubyHash), and if not then an exception is thrown.
     * 
     * @param collection An collection to test for being a collection.
     * @return The collection given.
     */
    export function checkArray(collection, op:string) {
        if (collection instanceof QubyArray || collection instanceof QubyHash) {
            return collection;
        } else {
            this.runtimeError("Trying to " + op + " value on Array or Hash, but it's actually a " + quby.runtime.identifyObject(collection));
        }
    }

    /**
     * Creates a new Error object with the given name and message.
     * It is then thrown straight away. This method will not
     * return (since an exception is thrown within it).
     * 
     * @param name The name for the Error object to throw.
     * @param msg The message contained within the Error object thrown.
     * @return This should never return.
     */
    export function error(name:string, msg?:string) {
        var errObj:any = new Error(msg);
        
        errObj.isQuby = true;
        errObj.name = name;
            
        throw errObj;
    }

    /**
     * Throws a standard Quby runtime error from within this function.
     * This method will not return as it will thrown an exception.
     * 
     * @param msg The message contained within the error thrown.
     * @return This should never return.
     */
    export function runtimeError(msg:string) {
        quby.runtime.error(quby.runtime.EXCEPTION_NAME_RUNTIME, msg);
    }

    /**
     * Throws the standard eror for when a stated field is not found.
     * 
     * @param name The name of the field that was not found.
     */
    export function fieldNotFoundError(obj:any, name:string) {
        var msg;
        var thisClass = quby.runtime.identifyObject( obj );

        if ( name.indexOf('@') > -1 ) {
            var parts = name.split( '@' );
            var field = parts[0];
            var fieldClass = parts[1];

            if ( fieldClass.toLowerCase() !== thisClass.toLowerCase() ) {
                msg =
                        "Field '" + field +
                        "' from class '" + fieldClass +
                        "' is illegally accessed from sub or super class '" + thisClass +
                        "'.";
            } else {
                msg =
                        "Field '" + field +
                        "' is being accessed before being assigned to in class '" + thisClass +
                        "'.";
            }
        } else {
            msg =
                    "Field '" + name +
                    "' is being accessed before being assigned to in class '" + thisClass +
                    "'.";
        }

        quby.runtime.runtimeError( msg );
    }

    /**
     * Throws an error designed specifically for when a block is expected,
     * but was not present. It is defined here so that it can be called
     * manually by users from within their inlined JavaScript code.
     * 
     * This method will not return since it throws an exception.
     * 
     * @return This should never return.
     */
    export function missingBlockError() {
        this.runtimeError("Yield with no block present");
    }

    export function lookupMethodName(callName:string) {
        var methodName = window[quby.runtime.FUNCTION_TABLE_NAME][callName];

        // should never happen, but just in case...
        if ( methodName === undefined ) {
            methodName = callName;
        }

        return methodName;
    }

    /**
     * Throws an error stating that there are not enough parameters for yielding
     * to something. The something is stated by the 'type' parameter (i.e. "block",
     * "function" or "method"). It is stated by the user.
     * 
     * The 'expected' and 'got' refer to the number of parameters the type expects
     * and actually got when it was called.
     * 
     * @param expected The number of parameters expected by the caller.
     * @param got The number of parameters actually received when the call was attempted.
     * @param type A name for whatever was being called.
     */
    export function notEnoughBlockParametersError(expected:number, got:number, type:string) : void {
        quby.runtime.runtimeError("Not enough parameters given for a " + type + ", was given: " + got + " but expected: " + expected);
    }

    export function methodMissingError( obj:any, callName: string, args: any[], block?: { ( ...args: any[] ): any; } ) {
        var methodName = quby.runtime.lookupMethodName(callName);

        // check for methods with same name, but different parameters
        var callNameAlt = callName.replace(/_[0-9]+$/, "");

        for (var key in obj) {
            var keyCallName = key.toString();
            var mName = keyCallName.replace(/_[0-9]+$/, "");

            if (callNameAlt === mName) {
                // take into account the noMethodStubs when searching for alternatives
                // (skip the noMethod's)
                var funs = window[quby.runtime.FUNCTION_DEFAULT_TABLE_NAME];
                if ( !funs || (callName !== keyCallName && funs[keyCallName] !== obj[keyCallName]) ) {
                    quby.runtime.runtimeError("Method: '" + methodName + "' called with incorrect number of arguments (" + args.length + ") on object of type '" + quby.runtime.identifyObject(obj) + "'");
                }
            }
        }

        quby.runtime.runtimeError("Unknown method '" + methodName + "' called with " + args.length + " arguments on object of type '" + quby.runtime.identifyObject(obj) + "'");
    }

    /**
     * This is a callback called when an unknown method is called at runtime.
     * 
     * @param methodName The name of hte method being called.
     * @param args The arguments for the method being called.
     */
    export function onMethodMissingfunction(methodName:string, args:any[]) : void {
        quby.runtime.methodMissingError(this, methodName, args);
    }

    /**
     * This attempts to decode the given string,
     * removing all of the special quby formatting names from it.
     * 
     * It searches through it for items that match internal Quby names,
     * and removes them.
     * 
     * Note that it cannot guarantee to do this correctly.
     * 
     * For example variables start with '_var_',
     * but it's entirely possible that the string passed holds
     * text that starts with '_var_', but is unrelated.
     * 
     * So this is for display purposes only!
     * 
     * @public
     * @param str The string to remove formatting from.
     * @return The string with all internal formatting removed.
     */
    function unformatString( str:string ) : string {
        str = str.replace(/\b[a-zA-Z0-9_]+\b/g, function(match:string) : string {
            // Functions
            // turn function from: '_fun_foo_1' => 'foo'
            if ( match.indexOf(quby.runtime.FUNCTION_PREFIX) === 0 ) {
                match = match.substring( quby.runtime.FUNCTION_PREFIX.length );
                return match.replace( /_[0-9]+$/, '' );
            // Fields
            // there are two 'field prefixes' in a field
            } else if ( (match.indexOf(quby.runtime.FIELD_PREFIX) === 0) && match.indexOf(quby.runtime.FIELD_PREFIX, 1) > -1 ) {
                var secondFieldPrefixI = match.indexOf(quby.runtime.FIELD_PREFIX, 1);
                var classBit = match.substring( 0, secondFieldPrefixI+quby.runtime.FIELD_PREFIX.length ),
                    fieldBit = match.substring( secondFieldPrefixI + quby.runtime.FIELD_PREFIX.length );

                // get out the class name
                // remove the outer 'field_prefix' wrappings, at start and end
                var wrappingFieldPrefixes = new RegExp( '(^' + quby.runtime.FIELD_PREFIX + quby.runtime.CLASS_PREFIX + ')|(' + quby.runtime.FIELD_PREFIX + '$)', 'g' );
                classBit = classBit.replace( wrappingFieldPrefixes, '' );
                classBit = util.str.capitalize( classBit );

                return classBit + '@' + fieldBit;
            // Classes & Constructors
            // must be _after_ fields
            } else if ( match.indexOf(quby.runtime.CLASS_PREFIX) === 0 ) {
                match = match.replace( new RegExp('^' + quby.runtime.CLASS_PREFIX), '' );

                // Constructor
                if ( match.indexOf(quby.runtime.NEW_PREFIX) > -1 ) {
                    var regExp = new RegExp( quby.runtime.NEW_PREFIX + '[0-9]+$' );
                    match = match.replace( regExp, '' );
                }

                return quby.runtime.untranslateClassName( match );
            // Globals
            // re-add the $, to make it look like a global again!
            } else if ( match.indexOf(quby.runtime.GLOBAL_PREFIX) === 0 ) {
                return '$' + match.substring(quby.runtime.GLOBAL_PREFIX.length);
            // Symbols
            // same as globals, but using ':' instead of '$'
            } else if ( match.indexOf(quby.runtime.SYMBOL_PREFIX) === 0 ) {
                return ':' + match.substring(quby.runtime.SYMBOL_PREFIX.length);
            // Variables
            // generic matches, variables like '_var_bar'
            } else if ( match.indexOf(quby.runtime.VARIABLE_PREFIX) === 0 ) {
                return match.substring(quby.runtime.VARIABLE_PREFIX.length);
            // just return it, but untranslate incase it's a 'QubyArray',
            // 'QubyObject', or similar internal class name
            } else {
                return quby.runtime.untranslateClassName( match );
            }
        });

        /**
         * Warning! It is presumed that prefixPattern _ends_ with an opening bracket.
         *  i.e. quby_setCollection(
         *       quby_getCollection(
         * 
         * @param {string} The string to search through for arrays
         * @param {string} The prefix pattern for the start of the array translation.
         * @param {function({string}, {array<string>}, {string})} A function to put it all together.
         */
        var qubyArrTranslation = function( str:string, prefixPattern:string, onFind: (pre: string, parts: string[], post:string) => string ) {
            /**
             * Searches for the closing bracket in the given string.
             * It presumes the bracket is already open, when it starts to search.
             * 
             * It does bracket counting inside, to prevent it getting confused.
             * It presumes the string is correctly-formed, but returns null if something goes wrong.
             */
            var getClosingBracketIndex = function(str:string, startI:number) : number {
                var openBrackets = 1;

                for ( var j = startI; j < str.length; j++ ) {
                    var c = str.charAt(j);

                    if ( c === '(' ) {
                        openBrackets++;
                    } else if ( c === ')' ) {
                        openBrackets--;

                        // we've found the closing bracket, so quit!
                        if ( openBrackets === 0 ) {
                            return j;
                        }
                    }
                }

                return null;
            };

            /**
             * Splits by the ',' character.
             * 
             * This differs from '.split(',')' because this ignores commas that might appear
             * inside of parameters, through using bracket counting.
             * 
             * So if a parameter contains a function call, then it's parameter commas are ignored.
             * 
             * The found items are returned in an array.
             */
            var splitByRootCommas = function(str:string) : string[] {
                var found:string[] = [],
                    startI = 0;

                var openBrackets = 0;
                for ( var i = 0; i < str.length; i++ ) {
                    var c = str.charAt(i);

                    if ( c === ',' && openBrackets === 0 ) {
                        found.push( str.substring(startI, i) );
                        // +1 to skip this comma
                        startI = i+1;
                    } else if ( c === '(' ) {
                        openBrackets++;
                    } else if ( c === ')' ) {
                        openBrackets--;
                    }
                }

                // add everything left, after the last comma
                found.push( str.substring(startI) );

                return found;
            };

            // Search through and try to do array translation as much, or often, as possible.
            var i = -1;
            while ( (i = str.indexOf(prefixPattern)) > -1 ) {
                var openingI = i + prefixPattern.length;
                var closingI = getClosingBracketIndex( str, openingI );

                // something's gone wrong, just quit!
                if ( closingI === null ) {
                    break;
                }

                var pre = str.substring( 0, i ),
                    mid = str.substring( openingI, closingI ),
                    // +1 to skip the closing bracket of the 'quby_getCollection'
                    post = str.substring( closingI+1 );

                var parts = splitByRootCommas( mid );

                str = onFind( pre, parts, post );
            }

            return str;
        };

        // Translating: quby_getCollection( arr, i ) => arr[i]
        str = qubyArrTranslation( str, 'quby_getCollection(', function(pre:string, parts:string[], post:string) {
            return pre + parts[0] + '[' + parts[1] + ']' + post;
        } );

        // Translating: quby_setCollection( arr, i, val ) => arr[i] = val
        str = qubyArrTranslation( str, 'quby_setCollection(', function(pre:string, parts:string[], post:string) {
            return pre + parts[0] + '[' + parts[1] + '] = ' + parts[2] + post ;
        } );
  
        // This is to remove the 'null' blocks, passed into every function/constructor/method
        // need to remove the 'a( null )' first, and then 'a( i, j, k, null )' in a second sweep.
        str = str.replace( /\( *null *\)/g, '()' );
        str = str.replace( /, *null *\)/g, ')' );
 
        return str;
    }

    /**
     * Helper functions to be called from within inlined JavaScript and the parser
     * for getting access to stuff inside the scriptin language.
     * 
     * Variables should be accessed in the format: '_var_<name>' where <name> is the
     * name of the variable. All names are in lowercase.
     * 
     * For example: _var_foo, _var_bar, _var_foo_bar
     */
    export function formatVar(strVar:string) : string {
        return quby.runtime.VARIABLE_PREFIX + strVar.toLowerCase();
    }

    /**
     * @param strVar The variable name to format into the internal global callname.
     * @return The callname to use for the given variable in the outputted javascript.
     */
    export function formatGlobal(strVar:string) : string {
        return quby.runtime.GLOBAL_PREFIX + strVar.replace(/\$/g, '').toLowerCase();
    }

    /**
     * @param strClass The class name to format into the internal class callname.
     * @return The callname to use for the given class in the outputted javascript.
     */
    export function formatClass(strClass:string) : string {
        strClass = strClass.toLowerCase();
        var newName = quby.runtime.TRANSLATE_CLASSES[strClass];

        if (newName) {
            return newName;
        } else {
            return quby.runtime.CLASS_PREFIX + strClass;
        }
    }

    /**
     * @param strClass The class name for the field to format.
     * @param strVar The name of the field that is being formatted.
     * @return The callname to use for the given field.
     */
    export function formatField(strClass:string, strVar:string) : string {
        return quby.runtime.FIELD_PREFIX + quby.runtime.formatClass(strClass) + quby.runtime.FIELD_PREFIX + strVar.toLowerCase();
    }

    /**
     * A function for correctly formatting function names.
     * 
     * All function names are in lowercase. The correct format for a function name is:
     * '_fun_<name>_<numParameters>' where <name> is the name of the function and
     * <numParameters> is the number of parameters the function has.
     * 
     * For example: _fun_for_1, _fun_print_1, _fun_hasblock_0
     */
    export function formatFun(strFun:string, numParameters:number) : string {
        return quby.runtime.FUNCTION_PREFIX + strFun.toLowerCase() + '_' + numParameters;
    }

    /**
     * Formats a constructor name using the class name given and the stated
     * number of parameters. The class name should be the proper (pretty) class
     * name, not a formatted class name.
     * 
     * @param strKlass The class name of the constructor being formatted.
     * @param numParameters The number of parameters in the constructor.
     * @return The name for a constructor of the given class with the given number of parameters.
     */
    export function formatNew(strKlass:string, numParameters:number) : string {
        return quby.runtime.formatClass(strKlass) + quby.runtime.NEW_PREFIX + numParameters;
    }

    export function formatSymbol(sym:string) : string {
        return quby.runtime.SYMBOL_PREFIX + sym.toLowerCase();
    }

    quby.runtime.ROOT_CLASS_CALL_NAME = quby.runtime.formatClass(quby.runtime.ROOT_CLASS_NAME);
}

/**
 * Standard core object that everything extends.
 */
function QubyObject() {
    // map JS toString to the Quby toString
};

/**
 * Arrays are not used in Quby, instead it uses it's own Array object.
 * 
 * These wrap a JavaScript array to avoid the issues with extending the
 * Array prototype.
 * 
 * Note that the values given are used internally. So do not
 * mutate it externally to this function!
 * 
 * If you are copying, copy the values first, then create a new
 * QubyArray with the values passed in.
 * 
 * @constructor
 * @param values Optionally takes an array of values, set as the default values for this array.
 */
function QubyArray( values:any[] ) : void {
    if ( values === undefined ) {
        this.values = <any[]> [];
    } else {
        this.values = values;
    }
}
QubyArray.prototype.set = function (key, value) {
    var index = key >> 0; // convert to int

    if ( index < 0 ) {
        quby.runtime.runtimeError( "Negative value given as array index: " + key );
    }

    var values = this.values,
        len = values.length;
    
    /* 
     * We first insert the new value, into the array,
     * at it's location. It's important to *not* pad
     * before we do this, as JS will automatically
     * allocate all the memory needed for that padding.
     */
    values[ index ] = value;

    /*
     * Then we convert the padded 'undefines' to 'null',
     * by just iterating over them.
     * 
     * As we added the index already, these locations
     * exist, so there are no allocation surprises for
     * the runtime.
     */
    while ( index > len ) {
        values[ --index ] = null;
    }

    return value;
};
QubyArray.prototype.get = function (key) {
    var index = key >> 0; // convert to int
    var len = this.values.length;
    
    if ( index < 0 ) {
        if ( -index > len ) {
            return null;
        } else {
            index = len+index;
        }
    } else if ( index >= len ) {
        return null;
    }

    return this.values[ index ];
};

/**
 * 
 * 
 * @constructor
 */
function QubyHash() : void {
    this.values = [];

    for ( var i = 0, argsLen = arguments.length; i < argsLen; i += 2 ) {
        var key   = arguments[ i   ];
        var value = arguments[ i+1 ];

        this.set( key, value );
    }
}
QubyHash.prototype.hash = function(val:any) : number {
    if ( val == null ) {
        return 0;
    } else if ( typeof(val) == 'string' ) {
        return val.length;
    } else {
        return val.toSource ? val.toSource().length : val.constructor.toString().length ;
    }
};
QubyHash.prototype.set = function (key, value) {
    var keyHash = this.hash( key );
    var vals = this.values[ keyHash ];

    if ( vals === undefined ) {
        this.values[ keyHash ] = [
                { key: key, value: value }
        ];
    } else {
        for ( var i = 0, valsLen = vals.length; i < valsLen; i++ ) {
            var node = vals[ i ];
            
            if ( node.key == key ) {
                node.value = value;
                return;
            }
        }

        vals.push(
                { key: key, value: value }
        );
    }
};
QubyHash.prototype.get = function (key) {
    var keyHash = this.hash( key );
    var vals = this.values[ keyHash ];

    if ( vals === undefined ) {
        return null;
    } else {
        for ( var i = 0, valsLen = vals.length; i < valsLen; i++ ) {
            var node = vals[ i ];

            if ( node.key == key ) {
                return node.value;
            }
        }

        return null;
    }
};
QubyHash.prototype.clone = function() {
    var copy = new QubyHash();

    for (var hash in this.values) {
        var keys = this.values[ hash ];

        copy.values[ hash ] = this.cloneKeys( keys );
    }

    return copy;
};
QubyHash.prototype.cloneKeys = function( keys ) {
    var newKeys = [];
    var keysLen = keys.length;

    for ( var i = 0; i < keysLen; i++ ) {
        var node = keys[i];

        newKeys.push( {
                key   : node.key,
                value : node.value
        } );
    }

    return newKeys;
};
QubyHash.prototype.each = function( fun ) {
    for (var hash in this.values) {
        var keys = this.values[ hash ];

        for ( var i = 0, len = keys.length; i < len; i++ ) {
            var node = keys[i];
            fun( node.key, node.value );
        }
    }
};
QubyHash.prototype.contains = function ( key: any ) {
    var keyHash = this.hash( key );
    var vals = this.values[ keyHash ];

    if ( vals !== undefined ) {
        for ( var i = 0, len = vals.length; i < len; i++ ) {
            if ( key == vals[i].key ) {
                return true;
            }
        }
    }

    return false;
};
QubyHash.prototype.remove = function( key:any ) {
    var keyHash:number = this.hash( key );
    var vals:any[] = this.values[ keyHash ];

    if ( vals !== undefined ) {
        for ( var i = 0, len = vals.length; i < len; i++ ) {
            var node = vals[i];

            if ( key == node.key ) {
                // remove the whole hash bucket if it's the only entry
                if ( vals.length === 1 ) {
                    delete this.values[ keyHash ];
                // delete it from the bucket, but more are remaining
                } else {
                    vals.splice( i, 1 );
                }

                return node.value;
            }
        }
    }
    
    return null;
};

