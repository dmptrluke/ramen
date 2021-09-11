// A tool to explore caves, adventure, and find riches.
// https://github.com/dmptrluke/ramen

import ABI from "./abi.json";
import BN from "bn.js";
import { randomBytes } from "crypto";
import Web3 from 'web3';

import config from './config.json'

const gems = {
    0: "turquoise",
	1: "pearl",
	2: "zircon",
	3: "moonstone",
	4: "amber",
    5: "spinel",
}

const web3 = new Web3(config.network.rpc);
const provably = new web3.eth.Contract(ABI, config.network.gem_address);

// if auto-claim is enabled, load the users private key
if ('claim' in config) {
    web3.eth.accounts.wallet.add(config.claim.private_key);
}

/**
 * Take a salt and calls the mine() function the the gem contract.
 * @param {BN} salt A previously-verified salt to process.
 */
async function mine(salt) {
    try {
        let estimated_gas = await provably.methods.mine(config.gem_type.toString(), salt.toString()).estimateGas(
            {
                from: config.address,
                gas: '100000'
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

        await provably.methods.mine(config.gem_type, salt)
            .send({
                from: config.address,
                gasPrice: gas_price,
                gas: "100000"
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
 * Generates a random salt.
 * @return {BN} a randomly generated salt.
 */
function randomSalt() {
    return new BN(randomBytes(32).toString("hex"), 16);
}

/**
 * Calls the gems() function on the gem contract to get the current
 * entropy, difficult, and nonce.
 */
async function getState() {
    const { entropy, difficulty } = await provably.methods.gems(config.gem_type).call();
    const nonce = await provably.methods.nonce(config.address).call();
    const calulated_difficulty = new BN(2).pow(new BN(256)).div(new BN(difficulty));
    return { entropy, difficulty, calulated_difficulty, nonce };
};

function luck(web3, chainId, entropy, gemAddr, senderAddr, kind, nonce, salt) {
    return new BN(web3.utils.soliditySha3({ t: "uint256", v: chainId }, // chainid
        { t: "bytes32", v: entropy }, { t: "address", v: gemAddr }, // gem address
        { t: "address", v: senderAddr }, // sender address
        { t: "uint", v: kind }, // gem kind
        { t: "uint", v: nonce }, // sender nonce
        { t: "uint", v: salt } // sender salt
    ).slice(2), 16);
}

var cancel = false;

const infLoop = async () => {
    console.log('You find a new branch of the cave to mine and head in.');

    // get the inital contract state
    var { entropy, difficulty, calulated_difficulty, nonce } = await getState();

    let i = 0;
    while (!cancel) {
        const salt = randomSalt();
        const ans = luck(web3, config.network.chain_id, entropy, config.network.gem_address,
            config.address, config.gem_type, nonce, salt).toString();

        i += 1;
        if (calulated_difficulty.gte(new BN(ans))) {
            console.log(`You stumble upon a vein of ${gems[config.gem_type]}!`);
            console.log(`KIND: ${config.gem_type} SALT: ${salt}`);
            
            await mine(salt);
            if (config.ding) {
                console.log('\u0007');
            }
            cancel = true;
        }
        if (i % 10000 == 0) {
            getState().then((state) => {({ entropy, difficulty, calulated_difficulty, nonce } = state)});
            console.log(`Iteration: ${i}, Difficulty: ${difficulty}`);
        }
        if (i % 1000 == 0) {
            // pause every 1000 iterations to allow other async operations to process
            await new Promise(r => setTimeout(r, 1));
        }
    }
    cancel = false;
};

const main = async () => {
    console.log(`You venture into the mines in search of ${gems[config.gem_type]}...`);
    if (config.loop) {
        while (true) {
            await infLoop();
        }
    } else {
        await infLoop();
    }
};

main();