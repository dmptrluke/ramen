// A tool to explore caves, adventure, and find riches.
// Based on https://github.com/poomsc/Provably-Rare-Gem-Miner, and modified

import ABI from "./abi.json";
import BN from "bn.js";
import { randomBytes } from "crypto";
import Web3 from 'web3';

import config from './config.json'

const web3 = new Web3(config.network.rpc);
const provably = new web3.eth.Contract(ABI, config.network.gem_address);

function getSalt() {
    const value = randomBytes(32); // 32 bytes = 256 bits
    // Value as native bigint
    const bigInt = BigInt(`0x${value.toString("hex")}`);
    // Value as BN.js number
    const bn = new BN(value.toString("hex"), 16);
    return bn;
}

const getMineValue = async () => {
    return provably.methods.gems(config.gem_type).call();
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

    const resetMined = async () => {
        const { entropy, difficulty } = await getMineValue();
        const nonce = await provably.methods.nonce(config.address).call();
        return { entropy, difficulty, nonce };
    };

    let { entropy, difficulty, nonce } = await resetMined();

    let i = 0;
    while (!cancel) {
        const salt = getSalt();
        const ans = luck(web3, config.network.chain_id, entropy, config.network.gem_address, 
            config.address, config.gem_type, nonce, salt).toString();

        i += 1;
        if (new BN(2).pow(new BN(256)).div(new BN(difficulty)).gte(new BN(ans))) {
            console.log("You stumble upon a vein of gems!");
            console.log("SALT:", salt.toString());
            process.exit();
        }
        if (i % 10000 == 0) {
            resetMined().then((value) => {
                ({ entropy, difficulty, nonce } = value);
            });
            console.log("Iteration:", i, ", Difficulty:", difficulty);
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