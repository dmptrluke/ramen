# Ramen
A tool to explore caves, adventure, and find riches! 💎

Ramen is an quick, easy to use Javascript miner for [Provably Rare Gems](https://gems.alphafinance.io/#/rarity) on Fantom, otherwise known as raritygems.

## How to use
First, [install node.js](https://nodejs.org/en/). And grab all the files, of course.

Create your **config.json** file. Instructions are included below!

Then you'll need to open up a terminal/command line in the correct folder, and run the following two commands:

`npm ci` to install required software.


`npm start` to start mining!

## Configuration
The default configuration for automatically claiming gems looks like the example below. Set `loop` to true if you want the miner to keep mining after it finds a gem.

Set `gem_type` to pick the gem you want to mine. You can see a list of gem types at the start of [mine.mjs](https://github.com/dmptrluke/ramen/blob/master/mine.mjs).

```json
{
    "network": {
        "chain_id": "250",
        "rpc": "https://rpc.ftm.tools/",
        "gem_address": "0x342EbF0A5ceC4404CcFF73a40f9c30288Fc72611"
    },
    "ding": true,
    "loop": false,
    "gem_type": 0,
    "address": "ADDRESS HERE",
    "claim": {
        "private_key": "PRIVATE KEY HERE",
        "maximum_gas_price": 500
    }
}
```

**Remember to be safe!** It's good practise to make a second account in Metamask for scripts like this, so you don't expose your main private key. If you'd like to just get salts and claim gems yourself, you can remove the whole `claim` section from the default configuration.

## License

Ramen is **licensed** under the **GPL v3** license. The terms are as follows.

![GPL V3](https://www.gnu.org/graphics/gplv3-127x51.png)
    
    Copyright © Ramen

    Ramen is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Ramen is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with Ramen.  If not, see <http://www.gnu.org/licenses/>.
    
Ramen is based on code from https://github.com/poomsc/Provably-Rare-Gem-Miner
