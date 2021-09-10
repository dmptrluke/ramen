# Ramen
A tool to explore caves, adventure, and find riches! 💎

Ramen is an experimental Javascript miner for Provably Rare Gems on Fantom, otherwise known as raritygems.

## How to use
First, get NPM/nodejs installed. And grab all the files, of course.

Then, install a few things:
`npm i`

Make a copy of `config.default.json` called `config.json`, and fill out the details.

Then go mining:
`npm start`

## Automatic claiming
Ramen can now automatically claim gems if you put the following block in your config:

THIS FEATURE IS EXPERIMENTAL, use at your own risk. I recommend you create a new account in Metamask/your Fantom wallet for this.

```
"claim": {
    "private_key": "KEY HERE"
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
