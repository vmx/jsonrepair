/*
This software is licensed under the MIT License.

Copyright (c) 2012 Volker Mische.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var fs = require('fs');
var util = require('util');
var clarinet = require("clarinet");


var RepairStream = function(rules) {
    this.readable = true;
    this.writable = true;

    var that = this;

    // A buffer that will be emitted in front of the data. This is used to
    // prevent trailing commas
    var emitBuffer = '';

    var emitData = function(data) {
        that.emit('data', emitBuffer + data);
    };

    var parser = clarinet.createStream();
    parser.on("error", function (e) {
        //console.error("error!", e);

        var stack = this._parser.stack;
        var state = clarinet.STATE[this._parser.state];

        // Some states are ambiguous, add all possible intepretations
        // to the `expected` array
        var expected = [state];
        switch(state) {
        case 'OPEN_OBJECT':
            if (clarinet.STATE[stack[stack.length-1]] === 'CLOSE_OBJECT') {
                expected.push('OPEN_KEY');
            }
            break;
        case 'CLOSE_OBJECT':
            if (stack.length === 0 ||
                clarinet.STATE[stack[stack.length-1]] === 'CLOSE_OBJECT' ||
                clarinet.STATE[stack[stack.length-1]] === 'CLOSE_ARRAY') {
                // NOTE vmx 2012-11-23: Not pushing here is intended
                expected = ['CLOSE_KEY'];
            }
            break;
        case 'VALUE':
            if (clarinet.STATE[stack[stack.length-1]] === 'CLOSE_ARRAY') {
                expected.push('OPEN_ARRAY');
            }
            break;
        }

        rules.forEach(function(rule) {
            if(parser._parser.c === rule.character &&
                    expected.indexOf(rule.expected) !== -1) {
                //console.error('Applying rule:', rule.description);
                rule.action.call(that, parser._parser);
            }
        });

        // clear the error
        this._parser.error = null;
        this._parser.resume();
    });

    // The following event handlers are just there to output proper JSON
    parser.on("openobject", function (node) {
        emitData('{"' + node.toString() + '": ');
        emitBuffer = '';
    });
    parser.on("closeobject", function (node) {
        emitBuffer = '';
        emitData('}');
        emitBuffer = ', ';
    });

    parser.on("openarray", function (node) {
        emitBuffer = '';
        emitData('[');
    });
    parser.on("closearray", function (node) {
        var stack = this._parser.stack;
        var state = clarinet.STATE[this._parser.state];
        emitBuffer = '';
        emitData(']');
        emitBuffer = ', ';
    });

    parser.on("key", function (node) {
        emitData(JSON.stringify(node) + ': ');
        emitBuffer = '';
    });

    parser.on("value", function (node) {
        emitData(JSON.stringify(node));
        emitBuffer = ', ';
    });

    this.parser = parser;
};
util.inherits(RepairStream, require('stream'));


RepairStream.prototype.write = function(data) {
    this.parser.write(data);
};
RepairStream.prototype.end = function() {
    this.emit('end');
};
RepairStream.prototype.destroy = function() {
    this.emit('close');
};

module.exports.RepairStream = RepairStream;
