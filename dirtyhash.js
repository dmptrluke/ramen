/**
 * soliditySha3.js from web3.js, hacked to be faster by removing checks
 */

/*
 This file is part of web3.js.

 web3.js is free software: you can redistribute it and/or modify
 it under the terms of the GNU Lesser General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 web3.js is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Lesser General Public License for more details.

 You should have received a copy of the GNU Lesser General Public License
 along with web3.js.  If not, see <http://www.gnu.org/licenses/>.
 */

var BN = require('bn.js');
var utils = require('web3-utils');

var _elementaryName = function (name) {
    /*jshint maxcomplexity:false */
    if (name.startsWith('int[')) {
        return 'int256' + name.slice(3);
    }
    else if (name === 'int') {
        return 'int256';
    }
    else if (name.startsWith('uint[')) {
        return 'uint256' + name.slice(4);
    }
    else if (name === 'uint') {
        return 'uint256';
    }
    else if (name.startsWith('fixed[')) {
        return 'fixed128x128' + name.slice(5);
    }
    else if (name === 'fixed') {
        return 'fixed128x128';
    }
    else if (name.startsWith('ufixed[')) {
        return 'ufixed128x128' + name.slice(6);
    }
    else if (name === 'ufixed') {
        return 'ufixed128x128';
    }
    return name;
};
// Parse N from type<N>
var _parseTypeN = function (type) {
    var typesize = /^\D+(\d+).*$/.exec(type);
    return typesize ? parseInt(typesize[1], 10) : null;
};
// Parse N from type[<N>]
var _parseTypeNArray = function (type) {
    var arraySize = /^\D+\d*\[(\d+)\]$/.exec(type);
    return arraySize ? parseInt(arraySize[1], 10) : null;
};
var _parseNumber = function (arg) {
    var type = typeof arg;
    if (type === 'string') {
        if (utils.isHexStrict(arg)) {
            return new BN(arg.replace(/0x/i, ''), 16);
        }
        else {
            return new BN(arg, 10);
        }
    }
    else if (type === 'number') {
        return new BN(arg);
    }
    else if (utils.isBigNumber(arg)) {
        return new BN(arg.toString(10));
    }
    else if (utils.isBN(arg)) {
        return arg;
    }
    else {
        throw new Error(arg + ' is not a number');
    }
};
var _solidityPack = function (type, value, arraySize) {
    var size, num;
    type = _elementaryName(type);
    if (type === 'bytes') {
        return value;
    }
    else if (type === 'string') {
        return utils.utf8ToHex(value);
    }
    else if (type === 'bool') {
        return value ? '01' : '00';
    }
    else if (type.startsWith('address')) {
        return value.toLowerCase();
    }
    size = _parseTypeN(type);
    if (type.startsWith('bytes')) {
        // must be 32 byte slices when in an array
        if (arraySize) {
            size = 32;
        }
        if (size < 1 || size > 32 || size < value.replace(/^0x/i, '').length / 2) {
            throw new Error('Invalid bytes' + size + ' for ' + value);
        }
        return utils.rightPad(value, size * 2);
    }
    else if (type.startsWith('uint')) {
        num = _parseNumber(value);
        return size ? utils.leftPad(num.toString('hex'), size / 8 * 2) : num;
    }
    else if (type.startsWith('int')) {
        num = _parseNumber(value);
        return size ? utils.leftPad(num.toString('hex'), size / 8 * 2) : num;
    }
    else {
        throw new Error('Unsupported or invalid type: ' + type);
    }
};
var _processSolidityEncodePackedArgs = function (arg) {
    /*jshint maxcomplexity:false */
    if (Array.isArray(arg)) {
        throw new Error('Autodetection of array types is not supported.');
    }
    var type, value = '';
    var hexArg, arraySize;
    // if type is given
    if (!!arg && typeof arg === 'object' && (arg.hasOwnProperty('v') || arg.hasOwnProperty('t') || arg.hasOwnProperty('value') || arg.hasOwnProperty('type'))) {
        type = arg.hasOwnProperty('t') ? arg.t : arg.type;
        value = arg.hasOwnProperty('v') ? arg.v : arg.value;
        // otherwise try to guess the type
    }
    else {
        type = utils.toHex(arg, true);
        value = utils.toHex(arg);
        if (!type.startsWith('int') && !type.startsWith('uint')) {
            type = 'bytes';
        }
    }
    if ((type.startsWith('int') || type.startsWith('uint')) && typeof value === 'string' && !/^(-)?0x/i.test(value)) {
        value = new BN(value);
    }
    // get the array size
    if (Array.isArray(value)) {
        arraySize = _parseTypeNArray(type);
        if (arraySize && value.length !== arraySize) {
            throw new Error(type + ' is not matching the given array ' + JSON.stringify(value));
        }
        else {
            arraySize = value.length;
        }
    }
    if (Array.isArray(value)) {
        hexArg = value.map(function (val) {
            return _solidityPack(type, val, arraySize).toString('hex').replace('0x', '');
        });
        return hexArg.join('');
    }
    else {
        hexArg = _solidityPack(type, value, arraySize);
        return hexArg.toString('hex').replace('0x', '');
    }
};
/**
 * Hashes solidity values to a sha3 hash using keccak 256
 *
 * @method soliditySha3
 * @return {Object} the sha3
 */
var soliditySha3 = function () {
    /*jshint maxcomplexity:false */
    var args = Array.prototype.slice.call(arguments);
    var hexArgs = args.map(_processSolidityEncodePackedArgs);
    // console.log(args, hexArgs);
    // console.log('0x'+ hexArgs.join(''));
    return utils.sha3('0x' + hexArgs.join(''));
};
/**
 * Hashes solidity values to a sha3 hash using keccak 256 but does return the hash of value `null` instead of `null`
 *
 * @method soliditySha3Raw
 * @return {Object} the sha3
 */
var soliditySha3Raw = function () {
    return utils.sha3Raw('0x' + Array.prototype.slice.call(arguments).map(_processSolidityEncodePackedArgs).join(''));
};
/**
 * Encode packed args to hex
 *
 * @method encodePacked
 * @return {String} the hex encoded arguments
 */
var encodePacked = function () {
    /*jshint maxcomplexity:false */
    var args = Array.prototype.slice.call(arguments);
    var hexArgs = args.map(_processSolidityEncodePackedArgs);
    return '0x' + hexArgs.join('').toLowerCase();
};
module.exports = {
    soliditySha3: soliditySha3,
    soliditySha3Raw: soliditySha3Raw,
    encodePacked: encodePacked
};
