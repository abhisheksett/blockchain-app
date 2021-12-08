# blockchain-app

This is a somple blockchain app which contains all major blockchain functionalities. It has complete typescript support

## APIs

first run the command: `yarn node_1`. This will start the first node at port 3001. Then following API's can be used


- **/register-and-broadcast-node** - Send this request to any runnuing node to register a new node.
```
Example - 
url: http://localhost:3001
method: POST
body: { "newNodeUrl": "http://localhost:3002" }
```
This will register node 3002 to the network


- **/blockchain** - This gives complete blockchain in the network
```
Example - 
url: http://localhost:3001/blockchain
method: GET
```

- **/mine** - This will mine a new block
```
Example - 
url: http://localhost:3001/mine
method: GET
```

- **/consensus** - This API checks if current node has correct blockchain. It uses longest chain algorithm to determine the most trusted chain and replaces own chain with that one
```
Example - 
url: http://localhost:3001/consensus
method: GET
```

- **/transaction/broadcast** - This API will register a new transaction and broadcast it in the network
Example - 
```
url: http://localhost:3001/transaction/broadcast
method: POST
body: {
        "amount": 15,
        "sender": "8737b4206f374ec19c84919de395f934",
        "recipient": "SETT7657656FD"
    }
```

### Pending enhancements

- Introduce websocket to make faster broadcast in network
- Update UI. Right now it's static Angular page with limited functionality. Add more functionalities and move to React
- Add Swagger for more elaborative API descriptions
- Add documentation on code
- Add error handling