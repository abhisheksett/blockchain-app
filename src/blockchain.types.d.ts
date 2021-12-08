
import type { sha256 } from 'sha256';

export type Transaction = {
    amount: number;
    sender: string;
    recipient: string;
    transactionId: string;
}

export type Block = {
    index: number;
    timestamp: number;
    transactions: Transaction[];
    nonce: number;
    hash: string;
    previousBlockHash: string;
}

export type AddressDataresponseType = {
    addressTransactions: Transaction[];
    addressBalance: number;
}