import { parentPort, workerData } from 'worker_threads';
const config = workerData.config;
const worker_id = workerData.i + 1;

import BN from 'bn.js';

import { soliditySha3 } from "./dirtyhash.js";
import { exit } from 'process';

import { randomBytes } from 'crypto';
import Web3 from 'web3';

import ABI_GEM from "./abi/gem.json";

const web3 = new Web3(config.network.rpc);
const provably = new web3.eth.Contract(ABI_GEM, config.network.gem_address);

var mining_target = config.address;

// state
var state;

// worker/parent communication
var paused = false;
var halted = false;

parentPort.on('message', (message) => {
    if (message == 'pause') {
        paused = true;
    } else if (message == 'resume') {
        paused = false;
    } else if (message == 'halt') {
        halted = true;
    }
});


/**
 * Calls the gems() function on the gem contract to get the current
 * entropy, difficult, and nonce.
 */
async function getState() {
    const { entropy, difficulty } = await provably.methods.gems(config.gem_type).call();
    const nonce = await provably.methods.nonce(mining_target).call();
    const calulated_difficulty = new BN(2).pow(new BN(256)).div(new BN(difficulty));
    return { entropy, difficulty, calulated_difficulty, nonce };
};


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
    // get the inital contract state
    state = await getState();

    let i = 0;
    while (!paused) {

        let iteration = hash(state);

        i += 1;
        if (state.calulated_difficulty.gte(iteration.result)) {
            if (!paused){
                // dont send a gem to the parent thread if we are paused, it wont work well
                parentPort.postMessage(iteration.salt.toString()); 
            }
            
        }
        if (i % 20000 == 0) {
                getState().then((x) => {state = x});
                console.log(`[${worker_id}] Hashes: ${i}, Difficulty: ${state.difficulty}`);
        }
        if (i % 2000 == 0) {
            // pause every 2000 iterations to allow other async operations to process
            await new Promise(r => setTimeout(r, 1));
        }
    }
};

async function worker() {
    console.log(`[${worker_id}] Mining worker ${worker_id} is online.`);
    while (!halted) {
        await work();
    }
    exit(0);
};

worker();