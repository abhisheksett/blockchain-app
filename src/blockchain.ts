import type { Transaction, Block, AddressDataresponseType } from './blockchain.types';
import sha256 from 'sha256';
import {v4 as uuid} from 'uuid';

const MINING_SENDER_ADDRESS = '00';

class Blockchain {

    chain: Block[];
    pendingTransactions: Transaction[];
    currentNodeUrl: string;
    networkNodes: string[];

    constructor() {
        this.chain = []; 
        this.pendingTransactions = [];
        this.currentNodeUrl = process.argv[3];
        this.networkNodes = [];

        // Creating Genesis block
        // pass all random data
        this.createNewBlock(100, '0', '0');
    }

    createNewBlock(nonce: number, previousBlockHash: string, hash: string): Block {
        const newblock: Block = {
            index: this.chain.length + 1,
            timestamp: Date.now(),
            transactions: this.pendingTransactions,
            nonce,
            hash,
            previousBlockHash
        };

        this.pendingTransactions = [];
        this.chain.push(newblock);

        return newblock;
    }


    getLastBlock(): Block {
        return this.chain[this.chain.length -1];
    }

    createNewTransaction(amount: number, sender: string, recipient: string): Transaction | null {

        let newTransaction: Transaction | null = null;
        // If its mining transaction, create new transaction
        if (sender === MINING_SENDER_ADDRESS) {
            newTransaction = {
                amount,
                sender,
                recipient,
                transactionId: uuid().split('-').join('')
            };
        } else {
            const senderData = this.getAddressData(sender);
            console.log('----------senderData', senderData)
            // Make sure sender has balance to send
            if (senderData.addressBalance >= amount) {
                    newTransaction = {
                    amount,
                    sender,
                    recipient,
                    transactionId: uuid().split('-').join('')
                };
            }
        }

        return newTransaction;
    }

    addTransactiontoPendingtransaction(transactionObj: Transaction): number {
        this.pendingTransactions.push(transactionObj);
        return this.getLastBlock().index + 1;
    }


    hashBlock(previousBlockHash: string, currentBlockData: Transaction[], nonce: number): string {
        const dataAsString: string = previousBlockHash + nonce.toString() + JSON.stringify(currentBlockData);
        const hash: string = sha256(dataAsString);
        return hash;
    }

    proofOfWork(previousBlockHash: string, currentBlockData: Transaction[]): number {
        let nonce: number = 0;
        let hash: string = this.hashBlock(previousBlockHash, currentBlockData, nonce);

        while(hash.substring(0, 4) !== '0000') {
            nonce++;
            hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
        }

        return nonce;
    }

    chainIsValid(blockChain: Block[]): boolean {
        let validChain = true;
        for (let i = 1; i < blockChain.length; i++) {
            const currentBlock = blockChain[i];
            const prevBlock = blockChain[i-1];
            // check block hash to find if valid data
            const blockHash = this.hashBlock(prevBlock.hash, currentBlock.transactions, currentBlock.nonce);
            const notStartsWithValidZeros = blockHash.substring(0, 4) !== '0000';
            
            if (notStartsWithValidZeros || currentBlock.previousBlockHash !== prevBlock.hash) {
                validChain = false;
                break;
            }
        }

        // Check validity of genesis block
        const genesisBlock = blockChain[0];
        const { nonce, previousBlockHash, hash, transactions } = genesisBlock;
        if (
            nonce !== 100 ||
            previousBlockHash !== '0' ||
            hash !== '0' ||
            transactions.length !== 0
        ) {
            validChain = false;
        }

        return validChain;
    }


    getBlock(blockHash: string): Block | undefined {
        const correctBlock = this.chain.find(block => {
            return block.hash === blockHash
        })
        return correctBlock;
    }

    getTransaction(transactionId: string): Block | undefined {
        const correctTransaction = this.chain.find(block => {
            return block.transactions.some(transaction => transaction.transactionId === transactionId)
        })
        return correctTransaction;
    }

    getAddressData(address: string): AddressDataresponseType {
        const addressTransactions: Transaction[] = [];
        let addressBalance: number = 0;
        this.chain.forEach(block => {
            block.transactions.forEach(transaction => {
                if (transaction.recipient === address) {
                    addressBalance += transaction.amount;
                    addressTransactions.push(transaction)
                } else if (transaction.sender === address) {
                    addressBalance -= transaction.amount;
                    addressTransactions.push(transaction)
                }
            })
        });
        return {
            addressTransactions,
            addressBalance
        };
    }
}

export default Blockchain;