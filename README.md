# TweetLedger

👪 An on-chain social experiment.

Sovereign, permissionless and censorship resistant online townsquare.

🏗 Built on [Scaffold-ETH 2][eth]

[eth]: https://scaffoldeth.io/


## Development

### Requirements

Before you begin, you need to install the following tools:

- [Node (>= v20.18.3)](https://nodejs.org/en/download/)
- Yarn ([v1](https://classic.yarnpkg.com/en/docs/install/) or [v2+](https://yarnpkg.com/getting-started/install))
- [Git](https://git-scm.com/downloads)

### Quickstart


1. Install dependencies

```
cd tweetledger
yarn install
```

2. Run a local network in the first terminal:

```
yarn chain
```

This command starts a local Ethereum network using Hardhat. The network runs on your local machine and can be used for testing and development. You can customize the network configuration in `packages/hardhat/hardhat.config.ts`.

3. On a second terminal, deploy the test contract:

```
yarn deploy
```

This command deploys a test smart contract to the local network. The contract is located in `packages/hardhat/contracts` and can be modified to suit your needs. The `yarn deploy` command uses the deploy script located in `packages/hardhat/deploy` to deploy the contract to the network. You can also customize the deploy script.

4. On a third terminal, start your NextJS app:

```
yarn start
```

Visit your app on: `http://localhost:3000`. You can interact with your smart contract using the `Debug Contracts` page. You can tweak the app config in `packages/nextjs/scaffold.config.ts`.

Run smart contract test with `yarn hardhat:test`

- Edit your smart contracts in `packages/hardhat/contracts`
- Edit your frontend homepage at `packages/nextjs/app/page.tsx`. For guidance on [routing](https://nextjs.org/docs/app/building-your-application/routing/defining-routes) and configuring [pages/layouts](https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts) checkout the Next.js documentation.
- Edit your deployment scripts in `packages/hardhat/deploy`


### Documentation

Visit our [docs](https://docs.scaffoldeth.io) to learn how to start building with Scaffold-ETH 2.

To know more about its features, check out our [website](https://scaffoldeth.io).

## Deployment

### Deploying the Contract

🔐 You will need to generate a deployer address using `yarn generate`
This creates a mnemonic and saves it locally.

👩‍🚀 Use `yarn account` to view your deployer account balances.

⛽️ You will need to send ETH to your deployer address with your
wallet, or get it from a public faucet of your chosen network.

Set the contract owner wallet address `CONTRACT_OWNER_ADDRESS` in
`packages/hardhat/.env`

Scaffold ETH provides default Alchemy and Etherscan keys for
interacting with RPC servers and Etherscan. To avoid any issues with
rate limits, you can use your own.

Set the following in `packages/hardhat/.env` from [Alchemy][alchemy]
and [Etherscan][etherscan] respectively:

- `ALCHEMY_API_KEY`
- `ETHERSCAN_V2_API_KEY`

[alchemy]: https://dashboard.alchemy.com/
[etherscan]: https://etherscan.io/


📡 Edit the `defaultNetwork` to your choice of public EVM networks in
`packages/hardhat/hardhat.config.ts` e.g. `sepolia`. Alternatively,
use the `--network` flat when deploying below.

🚀 Run `yarn deploy` to deploy your smart contract to the public network
selected in hardhat.config.ts above, **OR** specify the network
e.g. `yarn deploy --network sepolia`. Note the contract address.

Optionally run `yarn verify --network <network> to verify the contract
on etherscan.


