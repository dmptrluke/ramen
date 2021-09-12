// A tool to explore caves, adventure, and find riches.
// https://github.com/dmptrluke/ramen

import BN from "bn.js";
import { randomBytes } from "crypto";
import Web3 from 'web3';

import config from './config.json'
import { soliditySha3 } from "./dirtyhash.js";

import ABI_FANTOM_GEM from "./abi/gem.json";
import ABI_FANTOM_POOL from "./abi/fantom_pool.json";

const web3 = new Web3(config.network.rpc);
const provably = new web3.eth.Contract(ABI_FANTOM_GEM, config.network.gem_address);

const { name } = await provably.methods.gems(config.gem_type).call();

// if auto-claim is enabled, load the users private key
if ('claim' in config) {
    web3.eth.accounts.wallet.add(config.claim.private_key);
}

// support for yoyoismee's pooled mining contract
var pool;
var pooled = false;
var mining_target = config.address;

if ('pool_address' in config.network) {
    pool = new web3.eth.Contract(ABI_FANTOM_POOL, config.network.pool_address);
    pooled = true;
    mining_target = config.network.pool_address;
}

/**
 * Take a salt and calls the mine() function the the gem contract.
 * @param {BN} salt A previously-verified salt to process.
 */
async function mine(salt) {
    try {
        let estimated_gas = await provably.methods.mine(config.gem_type.toString(), salt.toString()).estimateGas(
            {
                from: mining_target,
                gas: '120000'
            });
        console.log(`Estimated gas required to claim is ${estimated_gas}.`);
    } catch (error) {
        // if the required gas is over 100k, this gem is probably unminable
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

        var contract = provably;
        var gas_limit = '120000';
        if (pooled) {
            contract = pool;
            gas_limit = '300000';
        } 

        await contract.methods.mine(config.gem_type, salt)
            .send({
                from: config.address,
                gasPrice: gas_price,
                gas: gas_limit
            }).on('sent', () => {
                console.log('Claim transaction submitted...')
            }).on('transactionHash', (hash) => {
                console.log(`https://ftmscan.com/tx/${hash}`)
            }).on('receipt', (receipt) => {
                console.log(`Done!`)
            })
            .catch((error) => {
                console.log('Error', error)
            });
    }
}

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

var cancel = false;

async function loop() {
    console.log('You find a new branch of the cave to mine and head in.');

    // get the inital contract state
    var state = await getState();

    let i = 0;
    while (!cancel) {
        let iteration = hash(state);

        i += 1;
        if (state.calulated_difficulty.gte(iteration.result)) {
            console.log(`You stumble upon a vein of ${name}!`);
            console.log(`KIND: ${config.gem_type} SALT: ${iteration.salt}`);

            await mine(iteration.salt);
            if (config.ding) {
                console.log('\u0007');
            }
            cancel = true;
        }
        if (i % 20000 == 0) {
            getState().then((x) => {state = x});
            console.log(`Iteration: ${i}, Difficulty: ${state.difficulty}`);
        }
        if (i % 2000 == 0) {
            // pause every 2000 iterations to allow other async operations to process
            await new Promise(r => setTimeout(r, 1));
        }
    }
    cancel = false;
};

async function main() {
    console.log(`You venture into the mines in search of ${name}...`);
    if (config.loop) {
        while (true) {
            await loop();
        }
    } else {
        await loop();
    }
};

main();