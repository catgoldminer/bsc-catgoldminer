# BSC Catgoldminer Repository

# Local Development

The following assumes the use of `node@>=14` and `npm@>=6`.

## Install Dependencies

`yarn`

## Compile Contracts

`npx hardhat compile`

## Run Ganache-cli

`npx hardhat node`

## Run Tests

### Localhost

`npx hardhat --network localhost test` or `yarn test`

## Network

### Deploy BSC MainNet
`npx hardhat run --network bsc deploy/checkin.js`

### Verify + public source code on bscscan

1. Create new constructor params file in arguments folder
2.

```bash
npx hardhat --network bsc verify --constructor-args ./args/bsc/checkin.js {{contract_address}}
```

### Get verify network hardhat support

`npx hardhat verify --list-networks`

## Resources

### BSC Mainnet
Dapp website url: https://wallet.catgoldminer.ai
Verified smart contracts: 
- Shop: https://bscscan.com/address/0xfb0bC4cc8159E3324cC9499C162c1f2e1B8dB6f8#code 
- Checkin: https://bscscan.com/address/0x0f5B887f71CE324622e51FFC6ABA83841e195E3D#code