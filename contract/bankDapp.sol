// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;

interface IERC20Token {
  function transfer(address, uint256) external returns (bool);
  function approve(address, uint256) external returns (bool);
  function transferFrom(address, address, uint256) external returns (bool);
  function totalSupply() external view returns (uint256);
  function balanceOf(address) external view returns (uint256);
  function allowance(address, address) external view returns (uint256);

  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract bankDapp{
    
  address internal cUsdTokenAddress = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;
  uint userIndex;
  uint internal checkingsID = 1; // To indicate that account type is checking
  uint internal savingsID = 2; // To indicate that account type is savings

  struct TransactionsRecords {
    uint date;
    string transactiontype;
    string description;
    string sender;
    string recipient;
    uint amount;
    uint balance;
  }

  TransactionsRecords internal transactions;

  struct AccountTypes {
    // 1 for checking Account
    // 2 for savings Account
    uint balance;
    TransactionsRecords[] records;
  }

  struct Account{
    string userName;
    address owner;
    // 1 for checking Account
    // 2 for savings Account
    mapping (uint => AccountTypes) accountType;
  }

  mapping(address => Account) internal accounts;
  mapping(string => address) internal userRecords;
  mapping(address => bool) internal userCreated;
  mapping(string => bool) internal userNameExists;

  modifier validID(uint _accountID){
    require(_accountID == 1 || _accountID == 2, "Invalid User ID");
    _;
  }

  modifier nameExists(string memory _userName){
    require(!userNameExists[_userName], "Name has already been taken");
    _;
  }

  modifier userExists(string memory _userName){
    require(userNameExists[_userName], "User does not exist");
    _;
  }

  modifier enoughBalance(uint _amount, uint _accountID){
    require(accounts[msg.sender].accountType[_accountID].balance >= _amount, "Insuffcient Balance");
    _;
  }

  function createAccount (
    string memory _userName
  ) public nameExists(_userName){
    userRecords[_userName] = msg.sender;
    userNameExists[_userName] = true;
    userCreated[msg.sender] = true;
    Account storage _account = accounts[msg.sender];
    _account.owner = payable(msg.sender);
    _account.userName = _userName;
    _account.accountType[savingsID].balance = 0;
    _account.accountType[checkingsID].balance = 0;
    userIndex++;
  }

  function deposit (
    uint _amount,
    uint _accountID
  ) public validID(_accountID){
    require(
      IERC20Token(cUsdTokenAddress).transferFrom(msg.sender, address(this), _amount),
      "Transfer failed"
    );
    transactions.transactiontype = "Deposit";
    transactions.amount = _amount;
    transactions.balance = _amount;
    transactions.description = "";
    transactions.sender = "";
    transactions.recipient = "";
    //Showing time the transaction took place
    transactions.date = block.timestamp;

    if(_accountID == checkingsID){
      AccountTypes storage _checkings = accounts[msg.sender].accountType[checkingsID];
      _checkings.balance += _amount;
      _checkings.records.push(transactions);

    }else if(_accountID == savingsID){  
      AccountTypes storage _savings = accounts[msg.sender].accountType[savingsID];
      _savings.balance += _amount;
      _savings.records.push(transactions);
    }
  }
  
  function getAccount()public view returns(
    string memory _userName,
    uint savingsBalance,
    uint checkingBalance,
    TransactionsRecords[] memory _savingsRecords,
    TransactionsRecords[] memory _checkingsRecords
  ){
    Account storage _account = accounts[msg.sender];
    return(
      _account.userName,
      _account.accountType[savingsID].balance,
      _account.accountType[checkingsID].balance,
      _account.accountType[savingsID].records,
      _account.accountType[checkingsID].records
    );

  }

  function withdraw (
    uint _amount,
    uint _accountID
  ) public validID(_accountID) enoughBalance(_amount, _accountID){
    require(
      IERC20Token(cUsdTokenAddress).transfer(msg.sender, _amount),
      "Withdrawal failed"
    );
    transactions.transactiontype = "Withdrawal";
    transactions.amount = _amount;
    transactions.description = "";
    transactions.sender = "";
    transactions.recipient = "";
    //Showing time the transaction took place
    transactions.date = block.timestamp;

    if(_accountID == checkingsID){
      AccountTypes storage _checkings = accounts[msg.sender].accountType[checkingsID];
      _checkings.balance -= _amount;
      transactions.balance = _checkings.balance;
      _checkings.records.push(transactions);

    }else if(_accountID == savingsID){  
      AccountTypes storage _savings = accounts[msg.sender].accountType[savingsID];
      _savings.balance -= _amount;
      transactions.balance = _amount;
      _savings.records.push(transactions);
    }
  }

  function transfer (
    uint _amount,
    uint _accountID,
    string memory _description
  ) public validID(_accountID) enoughBalance(_amount, _accountID){
    transactions.transactiontype = "Transfer";
    transactions.amount = _amount;
    //Showing time the transaction took place
    transactions.date = block.timestamp;

    if(_accountID == checkingsID){

      AccountTypes storage _checkings = accounts[msg.sender].accountType[checkingsID];
      _checkings.balance -= _amount;
      transactions.balance = _checkings.balance;
      transactions.description = _description;
      transactions.sender = " ";
      transactions.recipient = "Savings Account";
      _checkings.records.push(transactions);

      // To update the transaction details on the Savings End
      accounts[msg.sender].accountType[savingsID].balance += _amount;
      // Noticed how it was the checking accounts balance that was reflected after transfer to savings is made
      transactions.balance = accounts[msg.sender].accountType[savingsID].balance;
      transactions.description = _description;
      transactions.sender = "Checking Account";
      transactions.recipient = " ";
      accounts[msg.sender].accountType[savingsID].records.push(transactions);

    }else if(_accountID == savingsID){  

      AccountTypes storage _savings = accounts[msg.sender].accountType[savingsID];
      _savings.balance -= _amount;
      transactions.balance = _amount;
      transactions.description = "Transfer To Checking Account";
      transactions.sender = "Savings Account";
      transactions.recipient = "Checking Account";
      _savings.records.push(transactions);

      // To update the transaction details on the Checking End
      accounts[msg.sender].accountType[checkingsID].balance += _amount;
      // Noticed how it was the savings accounts balance that was reflected after transfer to checkings is made
      transactions.balance = accounts[msg.sender].accountType[checkingsID].balance;
      transactions.description = "Transfer From Checking Account";
      transactions.sender = "Savings Account";
      transactions.recipient = "";
      accounts[msg.sender].accountType[checkingsID].records.push(transactions);
    }
  }

  function sendMoney(
    uint _amount,
    string memory _userName,
    string memory _description
  ) public userExists(_userName) enoughBalance(_amount, checkingsID){
    address recipient = userRecords[_userName];
    string memory _sender = accounts[msg.sender].userName;
    
    AccountTypes storage _checkings = accounts[msg.sender].accountType[checkingsID];
    _checkings.balance -= _amount;
    //Showing time the transaction took place
    uint date = block.timestamp;

    transactions.transactiontype = "Debit";
    transactions.description = _description;
    transactions.amount = _amount;
    transactions.balance = _checkings.balance;
    transactions.sender = "";
    transactions.recipient = _userName;
    transactions.date = date;
    _checkings.records.push(transactions);

    // Sending Transaction details to Recipient
    AccountTypes storage _recipientCheckings = accounts[recipient].accountType[checkingsID];
    _recipientCheckings.balance += _amount;
    transactions.transactiontype = "Credit";
    transactions.description = _description;
    transactions.amount = _amount;
    transactions.balance = _recipientCheckings.balance;
    transactions.sender = _sender;
    transactions.recipient = " ";
    transactions.date = date;
    _recipientCheckings.records.push(transactions);
  }
  
  
  function checkUser() public view returns(bool) {
      return(userCreated[msg.sender]);
  }
    
}
