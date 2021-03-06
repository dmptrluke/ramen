import { parentPort, workerData } from 'worker_threads';
const config = workerData.config;
const worker_id = workerData.i + 1;

import BN from 'bn.js';

// why do we specify an older verion of js-sha3 in package.json?
// newer versions have more safety/sanity checks, which we don't
// need - they slow down hashing performance
import sha3 from 'js-sha3';

import { exit } from 'process';
import { sleep } from './util.mjs';
import { randomBytes } from 'crypto';

// worker/parent communication
var state;
var prefix;
var difficulty;

var ready = false;
var paused = false;
var halted = false;

parentPort.on('message', (message) => {
    if (message.topic === 'state') {
        state = message.data;
        prefix = state.prefix;

        difficulty = new BN(2).pow(new BN(256)).div(new BN(message.data.difficulty));
        ready = true;
    }
    if (message.topic === 'pause') {
        paused = true;
        ready = false;
    }
    if (message.topic === 'resume') {
        paused = false;
    }
    if (message.topic === 'halt') {
        halted = true;
    }

});

async function work() {
    var i = 0;
    
    // wait until the parent thread has updated us with the current state
    while (!ready) {
        await sleep(50);
    }
    
    var timer = process.hrtime.bigint();

    // get enough random bytes for 128 salts 
    var random_bytes = [...randomBytes(4096)];

    while (!paused) {
        // if bytes are depleted, get more
        if (i % 128 == 0) {
            random_bytes = [...randomBytes(4096)];
        }

        // get some random bytes (a salt)
        const bytes = random_bytes.splice(0, 32)
        
        // hash the salt and prefix with Keccak-256
        const hash = new BN(sha3.keccak_256(prefix.concat(bytes)), 16);

        i += 1;
        if (difficulty.gte(hash)) {
            if (!paused) {
                // dont send a gem to the parent thread if we are paused
                // if we do, the transactions will conflict

                const salt = new BN(bytes);
                parentPort.postMessage(salt.toString());
            }

        }
        if (i % 80000 == 0) {
            const speed = 80000 / (Number((process.hrtime.bigint() - timer)) / 1000000000);
            console.log(`[${worker_id}] Hashes: ${i}, Speed: ${(speed / 1000).toFixed(1)}KH/s, Difficulty: ${state.difficulty}`);

            var timer = process.hrtime.bigint();
        }

        // we need to allow other tasks to be completed, so we have a slight pause
        if (i % 16000 == 0) {
            await sleep(0);
        }
    }
};

async function worker() {
    console.log(`[${worker_id}] Mining worker ${worker_id} is online.`);

    while (!halted) {
        await work();
        await sleep(50);
    }
    exit(0);
};

worker();
