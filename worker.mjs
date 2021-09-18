import { parentPort, workerData } from 'worker_threads';
const config = workerData.config;
const worker_id = workerData.i + 1;

import BN from 'bn.js';

import { soliditySha3 } from "./dirtyhash.js";
import { exit } from 'process';

import { sleep } from './util.mjs';

import { randomBytes } from 'crypto';

var mining_target = config.address;

// worker/parent communication
var state;
var difficulty;

var ready = false;
var paused = false;
var halted = false;

parentPort.on('message', (message) => {
    if (message.topic === 'pause') {
        paused = true;
    } 
    if (message.topic === 'resume') {
        paused = false;
    } 
    if (message.topic === 'halt') {
        halted = true;
    } 
    if (message.topic === 'state') {
        state = message.data;
        difficulty = new BN(2).pow(new BN(256)).div(new BN(state.difficulty));
        ready = true;
    }
});

function hash(state) {
    const salt = new BN(randomBytes(32).toString("hex"), 16);
    const result = new BN(soliditySha3({ t: "uint256", v: config.network.chain_id },
        { t: "bytes32", v: state.entropy }, { t: "address", v: config.network.gem_address },
        { t: "address", v: mining_target },
        { t: "uint", v: config.gem_type },
        { t: "uint", v: state.nonce },
        { t: "uint", v: salt }
    ).slice(2), 16);

    return { salt, result }
}

async function work() {
    var i = 0;
    var timer = process.hrtime.bigint();

    while (!paused) {
        // wait until the parent thread has updated us with the current state
        while (!ready) {
            await sleep(50);
        }
        var iteration = hash(state);
        
        i += 1;
        if (difficulty.gte(iteration.result)) {
            if (!paused){
                // dont send a gem to the parent thread if we are paused
                // if we do, the transactions will conflict
                parentPort.postMessage(iteration.salt.toString()); 
            }
            
        }
        if (i % 40000 == 0) {
            const speed = 40000 / (Number((process.hrtime.bigint() - timer))  / 1000000000); 
            console.log(`[${worker_id}] Hashes: ${i}, Speed: ${(speed / 1000).toFixed(1)}KH/s, Difficulty: ${state.difficulty}`);

            var timer = process.hrtime.bigint();
        }

        // we need to allow other tasks to be completed, so we have a slight pause
        if (i % 10000 == 0) {
            await sleep(1);
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
