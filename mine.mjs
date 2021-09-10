// A tool to explore caves, adventure, and find riches.
// https://github.com/dmptrluke/ramen

import ABI from "./abi.json";
import BN from "bn.js";
import { randomBytes } from "crypto";
import Web3 from 'web3';

import config from './config.json'

const web3 = new Web3(config.network.rpc);
const provably = new web3.eth.Contract(ABI, config.network.gem_address);

if ('claim' in config) {
    web3.eth.accounts.wallet.add(config.claim.private_key);
}

async function mineGem(salt) {
    try {
        let estimated_gas = await provably.methods.mine(config.gem_type.toString(), salt.toString()).estimateGas(
            {
                from: config.address,
                gas: '100000'
            });
        console.log(`Estimated gas limit to claim is ${estimated_gas}.`);
    } catch (error) {
        console.log('Gas to claim is too high, this gem has already been claimed.');
        return;
    }

    if ('claim' in config) {
        let gas_price = await web3.eth.getGasPrice();
        let max_price = web3.utils.toWei("200", "Gwei")
        
        if (gas_price > max_price) {
            console.log(`Current network gas price is ${gas_price}, above your maximum of ${max_price}. Not claiming.`);
            return;
        }

        provably.methods.mine(config.gem_type, salt)
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

function getSalt() {
    const value = randomBytes(32); // 32 bytes = 256 bits
    // Value as native bigint
    const bigInt = BigInt(`0x${value.toString("hex")}`);
    // Value as BN.js number
    const bn = new BN(value.toString("hex"), 16);
    return bn;
}

async function getState() {
    const { entropy, difficulty } = await provably.methods.gems(config.gem_type).call();
    const nonce = await provably.methods.nonce(config.address).call();
    return { entropy, difficulty, nonce };
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
    console.log('You venture into the mines...');

    

    let { entropy, difficulty, nonce } = await getState();

    let i = 0;
    while (!cancel) {
        const salt = getSalt();
        const ans = luck(web3, config.network.chain_id, entropy, config.network.gem_address,
            config.address, config.gem_type, nonce, salt).toString();

        i += 1;
        if (new BN(2).pow(new BN(256)).div(new BN(difficulty)).gte(new BN(ans))) {
            if (config.ding) {
                console.log('\u0007');
            }

            console.log("You stumble upon a vein of gems!");
            console.log(`KIND: ${config.gem_type} SALT: ${salt}`);
            mineGem(salt);
            cancel = true;
        }
        if (i % 10000 == 0) {
            getState().then((state) => {({ entropy, difficulty, nonce } = state)});
            console.log(`Iteration: ${i}, Difficulty: ${difficulty}`);
        }
        if (i % 1000 == 0) {
            await new Promise(r => setTimeout(r, 1));
        }
    }
    cancel = false;
};

const main = async () => {
    infLoop();
};

main();