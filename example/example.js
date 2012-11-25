var fs = require('fs');

var RepairStream = require('jsonrepair').RepairStream;

var repairRules = [
    {
        description: 'Removing double commas after values in objects',
        character: ',',
        expected: 'OPEN_KEY',
        action: function(parser) {
            parser.stack.pop();
        }
    },{
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
];

var input = fs.createReadStream('malformed.json');
var repairJson = new RepairStream(repairRules);

input.pipe(repairJson).pipe(process.stdout);
