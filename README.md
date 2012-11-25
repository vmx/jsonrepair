jsonrepair
==========

jsonrepair is transforming malformed JSON streams into valid ones. It uses [clarinet](https://github.com/dscape/clarinet/) in the background to do the JSON parsing. Whenever an error occurs, you can handle that and move and with parsing. This is useful when your JSON got automatically generated from some other source, but contains some errors. Things like trailing commas in arrays, or two subsequent commas.


Defining rules
--------------

To transform the malformed JSON, you need to define rules that should be applied whenever a parsing error occurs. For example when you want to remove a trailing comma in an array, if there is any, the rule would look like this:

    {
        description: 'Removing trailing comma within array',
        character: ']',
        expected: 'VALUE',
        action: function(parser) {
            parser.stack.pop();
            parser.onclosearray();
            var newState = parser.stack.pop();
            parser.state = newState;
        }
    }

The `character` defines the character that is currently processed. In case of the trailing comma case, we see an error when the closing bracket `]` is hit.

The `expected` property defines in which state the error is happening. When a comma within an array was read, the next state is `VALUE` as it expects to read the next value. Here's a list of possible values for the `expected` property:

 - **BEGIN**: Something in front of everything (e.g. a header)
 - **OPEN_OBJECT**: Right after the opening bracket of an object
 - **CLOSE_OBJECT**: After the value of a key-value pair (before the comma or the ending bracket)
 - **OPEN_KEY**: Right before the key of an object (after a comma or the opening bracket)
 - **CLOSE_KEY**: Right after the key, *before* the colon
 - **VALUE**:
   - In an object: After the key, before the value (after the colon)
   - In an array: After a previous value (after the comma) or right after the opening bracket
 - **OPEN_ARRAY**: Right after the opening bracket of an array
 - **CLOSE_ARRAY**: After the value in an array (before the comma or the ending bracket)

`action` defines what should happen. It's a function that takes the internal clarinet parser as an input. There you can manipulate the current state of the parser to make it move on in the expected way.


Full example
------------

    var fs = require('fs');
    var RepairStream = require('jsonrepair').RepairStream;

    var repairRules = [{
        description: 'Removing trailing comma within array',
        character: ']',
        expected: 'VALUE',
        action: function(parser) {
            parser.stack.pop();
            parser.onclosearray();
            var newState = parser.stack.pop();
            parser.state = newState;
        }
    }];

    var input = fs.createReadStream('malformed.json');
    var repairJson = new RepairStream(repairRules);

    input.pipe(repairJson).pipe(process.stdout);


See the `example/` directory for more examples.


License
-------

The code is licensed under the MIT License.
