import express from 'express';
import bodyParser from 'body-parser';
import Blockchain from './blockchain';
import {v4 as uuid} from 'uuid';
import rp from 'request-promise';
import type { RequestPromise } from 'request-promise';
import type { Transaction, Block } from './blockchain.types';

const port = process.argv[2];

const nodeAddress = uuid().split('-').join('');

const coin = new Blockchain();

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/blockchain', (req, res) => {
    res.send(coin);
});

app.post('/transaction', (req, res) => {
    const { newTransaction } = req.body;
    const blockindex = coin.addTransactiontoPendingtransaction(newTransaction);
    res.json({ note: `Transaction will be added at block ${blockindex}`});
});

app.post('/transaction/broadcast', (req, res) => {
    const { amount, sender, recipient } = req.body;
    const newTransaction = coin.createNewTransaction(amount, sender, recipient);
    if (newTransaction) {
        coin.addTransactiontoPendingtransaction(newTransaction);

        const requestPromises: RequestPromise<any>[] = [];
        coin.networkNodes.forEach((url: string) => {
            const requestOptions = {
                uri: `${url}/transaction`,
                method: 'POST',
                body: { newTransaction },
                json: true
            };

            requestPromises.push(rp(requestOptions));
        });

        Promise.all(requestPromises).then( data => {
            res.json({
                note: 'Transaction created and broadcast successfully!'
            })
        });
    } else {
        res.json({
            note: 'Sorry, sender doesn\'t have sufficient balance !!'
        })
    }
    
});

app.get('/mine', (req, res) => {
    const lastblock = coin.getLastBlock();
    const { hash: previousBlockHash } = lastblock;

    // const currentBlockData = {
    //     transactions: coin.pendingTransactions,
    //     index: lastblock.index + 1
    // };

    const nonce = coin.proofOfWork(previousBlockHash, coin.pendingTransactions);
    const blockHash = coin.hashBlock(previousBlockHash, coin.pendingTransactions, nonce);

    const newBlock = coin.createNewBlock(nonce, previousBlockHash, blockHash);

    // broadcast the new blovk to whole network
    const requestPromises: RequestPromise<any>[] = [];
    coin.networkNodes.forEach((url: string) => {
        const requestoptions = {
            uri: `${url}/receive-new-block`,
            method: 'POST',
            body: {
                newBlock
            },
            json: true
        };
        requestPromises.push(rp(requestoptions));
    });

    Promise.all(requestPromises)
    .then(data => {
        // broadcast the mining reward transaction here

        // This is where we send reward to miner
        // As per 2021, bitcoin reward is 6.25
        // Send the reward to current node, hence nodeAddress
        const requestOptions = {
            uri: `${coin.currentNodeUrl}/transaction/broadcast`,
            method: 'POST',
            body: {
                amount: 6.25,
                sender: '00',
                recipient: nodeAddress
            },
            json: true
        }

        return rp(requestOptions)
    })
    .then(data => {
            res.json({
                note: 'New block mined and broadcasted',
                block: newBlock
            })
        })
});


app.post('/receive-new-block', (req, res) => {
    const { newBlock } = req.body;
    // check if the block is legitimate
    const lastBlock = coin.getLastBlock();
    const correctHash = lastBlock.hash === newBlock.previousBlockHash;
    // new block should be 1 index above the last block
    const correctIndex = lastBlock.index + 1 === newBlock.index;
    if (correctHash && correctIndex) {
        coin.chain.push(newBlock);
        // clear out the pending transactions because all pending
        // transactions should be there in newBlock
        coin.pendingTransactions = [];
        res.json({
            note: 'New block received and accepted!',
            newBlock
        })
    } else {
        res.json({
            note: 'New block rejected',
            newBlock
        })
    }
})

// Registers itself and broadcasts to others
app.post('/register-and-broadcast-node', (req, res) => {
    const newNodeUrl = req.body.newNodeUrl;
    // if the network doesnt have new node, then add it
    if (!coin.networkNodes.includes(newNodeUrl)) {
        coin.networkNodes.push(newNodeUrl);
    }

    const registerNodePromises: RequestPromise<any>[] = [];
    // broadcast new node to all other nodes
    coin.networkNodes.forEach((url: string) => {
        const requestOptions = {
            uri: `${url}/register-node`,
            method: 'post',
            body: {
                newNodeUrl
            },
            json: true
        }
        registerNodePromises.push(rp(requestOptions));
    });

    Promise.all(registerNodePromises)
    .then(data => {
        const bulkRegisterOptions = {
            uri: `${newNodeUrl}/register-nodes-bulk`,
            method: 'POST',
            body: {
                allNetworkNodes: [
                    ...coin.networkNodes,
                    coin.currentNodeUrl
                ]
            },
            json: true
        };
        return rp(bulkRegisterOptions);
    })
    .then(data => {
        res.json({
            note: 'New node registered successfully!'
        })
    })
});

// Register a node with network. Basically registers other networks
app.post('/register-node', (req, res) => {
    const { newNodeUrl } = req.body;
    const alreadyPresent = coin.networkNodes.includes(newNodeUrl);
    const currentNode = coin.currentNodeUrl === newNodeUrl;
    if (!alreadyPresent && !currentNode) {
        coin.networkNodes.push(newNodeUrl);
    } 
    res.json({
        note: `New node registered successfully to ${coin.currentNodeUrl}`
    })
});

// register multiple nodes at once
app.post('/register-nodes-bulk', (req, res) => {
    const { allNetworkNodes } = req.body;
    allNetworkNodes.forEach((url: string) => {
        const alreadyExists = coin.networkNodes.includes(url);
        const isCurrentNode = coin.currentNodeUrl === url;
        if (!alreadyExists && !isCurrentNode) {
            coin.networkNodes.push(url);
        }
    });
    res.json({
        note: 'Bulk registration successful!'
    })
});

app.get('/consensus', (req, res) => {
    const requestPromises: RequestPromise<any>[] = [];
    coin.networkNodes.forEach((url: string) => {
        const requestOptions = {
            uri: `${url}/blockchain`,
            method: 'GET',
            json: true
        };

        requestPromises.push(rp(requestOptions));
    });

    // The longest chain method is being used to check if chain is valid across all nodes
    // If a chain is longest, consider that chain as most reliable and replace
    // current node chain with that
    Promise.all(requestPromises).then((blockchains: Blockchain[]) => {
        const currentChainLength: number = coin.chain.length;
        let maxChainLength: number = currentChainLength;
        let newLongestChain: Block[] = [];
        let newPendingTransactions: Transaction[] = [];

        blockchains.forEach((blockchain: Blockchain) => {
            if (blockchain.chain.length > maxChainLength) {
                maxChainLength = blockchain.chain.length;
                newLongestChain = blockchain.chain;
                newPendingTransactions = blockchain.pendingTransactions;
            }
        });

        // if there is no longer chain or if there is longer chain but that's not valid
        // then don't replace current chain
        if (!newLongestChain || (newLongestChain && !coin.chainIsValid(newLongestChain))) {
            console.log('chain is NOT being replaced')
            res.json({
                note: 'Current chain has not been replaced',
                chain: coin.chain
            })
        } else {
            console.log('chain is being replaced')
            coin.chain = newLongestChain;
            coin.pendingTransactions = newPendingTransactions;
            res.json({
                note: 'This chain has been replaced',
                chain: coin.chain
            })
        }
    });
});


app.get('/block/:blockHash', (req, res) => {
    const { blockHash } = req.params;
    const block = coin.getBlock(blockHash) || null;
    res.json({
        block 
    });
});

app.get('/transaction/:transactionId', (req, res) => {
    const { transactionId } = req.params;
    const transaction = coin.getTransaction(transactionId) || null;
    res.json({
        transaction
    })
});

app.get('/address/:address', (req, res) => {
    const { address } = req.params;
    const transactions = coin.getAddressData(address);
    res.json({
        transactions
    })
});

app.get('/block-explorer', (_, res) => {
    res.sendFile('./block-explorer/index.html', { root: __dirname})
})

app.listen(port, () => {
    console.log(`Listening on port ${port}...`)
});