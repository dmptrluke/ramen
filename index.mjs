import { Worker } from 'worker_threads';
import Web3 from 'web3';
import BN from 'bn.js';
import os from 'os';

import { sleep, hexStringToBytes } from './util.mjs';

import config from './config.json'
import ABI_GEM from './abi/gem.json';

var workers = [];
var state;
var paused = false;

const web3 = new Web3(config.network.rpc);
const contract = new web3.eth.Contract(ABI_GEM, config.network.gem_address);

var gem_name = "";

// get the block explorer from config (ftmscan as fallback)
var explorer = "https://ftmscan.com/";
if ('explorer' in config.network) {
    explorer = config.network.explorer;
}

// default to all cores
var threads = os.cpus().length;
if ('threads' in config) {
    threads = config.threads;
}

// if auto-claim is enabled, load the users private key
if ('claim' in config) {
    web3.eth.accounts.wallet.add(config.claim.private_key);
}

// utility functions
async function get_name() {
    const { name } = await contract.methods.gems(config.gem_type).call();
    return name;
};

/**
 * Calls the gems() function on the gem contract to get the current
 * entropy, difficult, and nonce.
 */
async function getState() {
    const { entropy, difficulty } = await contract.methods.gems(config.gem_type).call();
    const nonce = await contract.methods.nonce(config.address).call();

    // we calulate most of the string to hash ahead of time, and
    // just add the encoded salt to the end for each iteration
    const unpacked = web3.utils.encodePacked(
        { t: "uint256", v: config.network.chain_id },
        { t: "bytes32", v: entropy }, { t: "address", v: config.network.gem_address },
        { t: "address", v: config.address },
        { t: "uint", v: config.gem_type },
        { t: "uint", v: nonce }
    ).slice(2);

    const prefix = hexStringToBytes(unpacked);
    
    return { entropy, difficulty, nonce, prefix };
};

/**
 * Calls getState() to fetch the latest gem state, then sends it to all workers.
 * If state is invalid, does nothing.
 */
async function updateWorkers() {
    try {
        state = await getState();

        for (const port of workers) {
            port.postMessage({topic: 'state', data: state});
        }
    } catch (error) {

        console.log(`Failed to update state, will try again in a moment.`);
    }
}

/**
 * Take a salt and calls the mine() function the the gem contract.
 * @param {BN} salt A previously-verified salt to process.
 */
async function mine(salt) {
    try {
        let estimated_gas = await contract.methods.mine(config.gem_type.toString(), salt.toString()).estimateGas(
            {
                from: config.address,
                gas: '120000'
            });
        console.log(`Estimated gas required to claim is ${estimated_gas}.`);
    } catch (error) {
        // if the required gas is over 120k, this gem is probably unminable
        console.log('The gas required to claim this gem is too high, it is invalid or has already been mined.');
        return;
    }

    if ('claim' in config) {
        let gas_price = await web3.eth.getGasPrice();

        if ('maximum_gas_price' in config.claim) {
            var max_price = web3.utils.toWei(config.claim.maximum_gas_price.toString(), "Gwei")
        } else {
            var max_price = web3.utils.toWei("1", "Gwei")
        }

        if (parseFloat(gas_price) > max_price) {
            console.log(`Current network gas price is ${web3.utils.fromWei(gas_price, "Gwei")} GWEI, above your price limit of ${web3.utils.fromWei(max_price, "Gwei")} GWEI. Not claiming.`);
            return;
        }

        await contract.methods.mine(config.gem_type, salt)
            .send({
                from: config.address,
                gasPrice: gas_price,
                gas: "120000"
            }).on('sent', () => {
                console.log('Claim transaction submitted...')
            }).on('transactionHash', (hash) => {
                console.log(`${explorer}tx/${hash}`)
            }).on('receipt', (receipt) => {
                console.log(`Done!`)
            })
            .catch((error) => {
                console.log('Error', error)
            });
    } else {
        console.log(`KIND: ${config.gem_type} SALT: ${salt}`);
    }
}

/**
 * Called when a worker finds a valid salt. 
 * Pauses all workers and calls mine(), then wait and restarts all workers.
 * @param {BN} salt A previously-verified salt to process.
 */
async function handle(salt) {
    if (paused) {
        // another instance of handle is working, don't process this event
        return;
    }

    paused = true;
    for (const port of workers) {
        port.postMessage({topic: 'pause', data: []});
    }

    console.log(`You stumble upon a vein of ${gem_name}!`);
    await mine(salt);
    if (config.ding) {
        console.log('\u0007');
    }

    if (!config.loop) {
        process.exit(0)
    }

    await sleep(500);
    
    paused = false;
    
    await updateWorkers();
    for (const port of workers) {
        port.postMessage({topic: 'resume', data: []});
    }

    console.log('You find a new branch of the cave to mine and head in.');
}

async function main() {
    gem_name = await get_name();
    state = await getState();

    console.log(`You send your team of ${threads} into the mines in search of ${gem_name}...`);
    

    for (let i = 0; i < threads; i++) {
        const port = new Worker('./worker.mjs', { workerData: { i, config, state } });
        workers.push(port);

        port.on("message", (data) => handle(data))
    }

    while (true) {
        if (!paused) {
            await updateWorkers();
        }

        // update state less often for difficult gems
        if (config.gem_type == 0) {
            await sleep(1000);
        } else {
            await sleep(5000);
        }
    }
}

main();
