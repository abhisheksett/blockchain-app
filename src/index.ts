
// const Blockchain = require("./blockchain");
import Blockchain from "./blockchain";

const bc = new Blockchain();

const previousBlockHash = "JHJHVJV878SD";
const currentBlockData = [
    {
        amount: 10,
        sender: 'SETT238423',
        recipient: 'XYZ8HHJJJ'
    },
    {
        amount: 1,
        sender: 'XYZ8HHJJJ',
        recipient: 'SETT238423'
    },
    {
        amount: 50,
        sender: 'XYZ8HHJJJ',
        recipient: 'JON3424234'
    }
];

// console.log(bc.hashBlock(previousBlockHash, currentBlockData, 1003));

// console.log('************ Proof of Work ************', bc.proofOfWork(previousBlockHash, currentBlockData));

console.log('********* Blockchain *********', bc);