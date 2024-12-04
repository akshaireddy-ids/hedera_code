const {
    Hbar,
    Client,
    PrivateKey,
    AccountBalanceQuery,
    AccountCreateTransaction,
    TokenCreateTransaction,
    TokenType,
    TokenSupplyType,
    TokenAssociateTransaction,
    TransferTransaction,
  } = require("@hashgraph/sdk");
  require("dotenv").config();
  
  async function environmentSetup() {
    // Grab your Hedera testnet account ID and private key from your .env file
    const myAccountId = process.env.MY_ACCOUNT_ID;
    const myPrivateKey = process.env.MY_PRIVATE_KEY;
  
    // If we weren't able to grab it, we should throw a new error
    if (myAccountId == null || myPrivateKey == null) {
      throw new Error(
        "Environment variables myAccountId and myPrivateKey must be present"
      );
    }
  
    // Create your connection to the Hedera Network
    const client = Client.forTestnet();
    client.setOperator(myAccountId, myPrivateKey);
  
    //Set the default maximum transaction fee (in Hbar)
    client.setDefaultMaxTransactionFee(new Hbar(100));
  
    //Set the maximum payment for queries (in Hbar)
    client.setDefaultMaxQueryPayment(new Hbar(50));
  
    // Create new keys
    const newAccountPrivateKey = PrivateKey.generateED25519();
    const newAccountPublicKey = newAccountPrivateKey.publicKey;
  
    // Create a new account with 1,000 tinybar starting balance
    const newAccount = await new AccountCreateTransaction()
      .setKey(newAccountPublicKey)
      .setInitialBalance(Hbar.fromTinybars(1000))
      .execute(client);
  
    // Get the new account ID
    const getReceipt = await newAccount.getReceipt(client);
    const newAccountId = getReceipt.accountId;
    
    console.log("\nNew account ID: " + newAccountId);

    const supplyKey = PrivateKey.generate();

    // CREATE FUNGIBLE TOKEN
    let tokenCreateTx = await new TokenCreateTransaction()
    .setTokenName("USD Bar")
    .setTokenSymbol("USDB")
    .setTokenType(TokenType.FungibleCommon)
    .setDecimals(2)
    .setInitialSupply(10000)
    .setTreasuryAccountId(myAccountId)
    .setSupplyType(TokenSupplyType.Infinite)
    .setSupplyKey(supplyKey)
    .freezeWith(client);

    //SIGN WITH TREASURY KEY
    let tokenCreateSign = await tokenCreateTx.sign(PrivateKey.fromString(myPrivateKey));

    //SUBMIT THE TRANSACTION
    let tokenCreateSubmit = await tokenCreateSign.execute(client);

    //GET THE TRANSACTION RECEIPT
    let tokenCreateRx = await tokenCreateSubmit.getReceipt(client);

    //GET THE TOKEN ID
    let tokenId = tokenCreateRx.tokenId;

    //LOG THE TOKEN ID TO THE CONSOLE
    console.log(`- Created token with ID: ${tokenId} \n`);
   
    const transaction = await new TokenAssociateTransaction()
    .setAccountId(newAccountId)
    .setTokenIds([tokenId])
    .freezeWith(client);

    const signTx = await transaction.sign(newAccountPrivateKey);
    const txResponse = await signTx.execute(client)

    const associateReceipt = await txResponse.getReceipt(client);
    const transactionStatus =  associateReceipt.status;

    console.log("Transaction Of Association Status Was :"+transactionStatus);

    var balanceCheckTx = await new AccountBalanceQuery().setAccountId(myAccountId).execute(client);
    console.log(`- Treasury balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`);
    var balanceCheckTx = await new AccountBalanceQuery().setAccountId(newAccountId).execute(client);
    console.log(`- New's balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`);

    const transferTransaction = await new TransferTransaction()
     .addTokenTransfer(tokenId, myAccountId, -10)
     .addTokenTransfer(tokenId, newAccountId, 10)
     .freezeWith(client)

    const singTransferTx = await transferTransaction.sign(PrivateKey.fromString(myPrivateKey))

    const transferTxResponse = await singTransferTx.execute(client)
    const transferReceipt = await transferTxResponse.getReceipt(client)
    const transferStatus = transferReceipt.status

    console.log("Transaction Status For Transfer Was : "+transferStatus)

    var balanceCheckTx = await new AccountBalanceQuery().setAccountId(myAccountId).execute(client);
    console.log(`- Treasury balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`);
    var balanceCheckTx = await new AccountBalanceQuery().setAccountId(newAccountId).execute(client);
    console.log(`- New's balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`);
  }
  environmentSetup();




//   New account ID: 0.0.5046652
//   - Created token with ID: 0.0.5046653
  
//   Transaction Of Association Status Was :22
//   Transaction Status For Transfer Was : 22
  

// After Balance Check
// New account ID: 0.0.5046661
// - Created token with ID: 0.0.5046662

// Transaction Of Association Status Was :22
// - Treasury balance: 10000 units of token ID 0.0.5046662
// - New's balance: 0 units of token ID 0.0.5046662
// Transaction Status For Transfer Was : 22
// - Treasury balance: 9990 units of token ID 0.0.5046662
// - New's balance: 10 units of token ID 0.0.5046662