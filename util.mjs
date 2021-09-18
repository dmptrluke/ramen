function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function hexStringToBytes(hex) {
    for (var bytes = [], c = 0; c < hex.length; c += 2)
        bytes.push(parseInt(hex.substr(c, 2), 16));
    return bytes;
};

export { sleep, hexStringToBytes };
