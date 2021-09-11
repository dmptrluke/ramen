# Ramen
A tool to explore caves, adventure, and find riches! 💎

Ramen is an quick, easy to use Javascript miner for [Provably Rare Gems](https://gems.alphafinance.io/#/rarity) on Fantom, otherwise known as raritygems.

## How to use
First, get NPM/nodejs installed. And grab all the files, of course.

Then, install a few things:
`npm i`

Make a copy of `config.default.json` called `config.json`, and fill out the details.

Then go mining:
`npm start`

## Automatic claiming
Ramen can now automatically claim gems if you edit your `config.json` to look like the example below:

THIS FEATURE IS EXPERIMENTAL! I recommend you create a new account in Metamask/your Fantom wallet for this.

```json
{
    "network": {
        "chain_id": "250",
        "rpc": "https://rpc.ftm.tools/",
        "gem_address": "0x342EbF0A5ceC4404CcFF73a40f9c30288Fc72611"
    },
    "ding": true,
    "gem_type": 0,
    "address": "ADDRESS HERE",
    "claim": {
        "private_key": "PRIVATE KEY HERE",
        "maximum_gas_price": 500
    }
}
```

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
