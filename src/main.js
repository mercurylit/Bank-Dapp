import Web3 from 'web3'
import { newKitFromWeb3 } from '@celo/contractkit'
import BigNumber from "bignumber.js"
import bankDappAbi from '../contract/bankDapp.abi.json'
import erc20Abi from "../contract/erc20.abi.json"

// Smart contract variables
const ERC20_DECIMALS = 18
const BDContractAddress = "0xDF80e13DE836B4896bE43Ed0Fb7353a2E89a47Ec"
const cUSDContractAddress = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1"

let accountDetails = {};
let userExists = false;
let contract
let kit

const connectCeloWallet = async function () {
    if (window.celo) {
        notification("⚠️ Please approve this DApp to use it.")
      try {
        await window.celo.enable()
        notificationOff()
  
        const web3 = new Web3(window.celo)
        kit = newKitFromWeb3(web3)
  
        const accounts = await kit.web3.eth.getAccounts()
        kit.defaultAccount = accounts[0]
        
        contract = new kit.web3.eth.Contract(bankDappAbi, BDContractAddress)
  
      } catch (error) {
        notification(`⚠️ ${error}.`)
      }
    } else {
      notification("⚠️ Please install the CeloExtensionWallet.")
    }
  }

async function approve(_amount) {
    const cUSDContract = new kit.web3.eth.Contract(erc20Abi, cUSDContractAddress)
  
    const result = await cUSDContract.methods
      .approve(BDContractAddress, _amount)
      .send({ from: kit.defaultAccount })
    return result
  }
// SC variables

//Notification Messages
const Toast = {
    init() {
      this.hideTimeout = null;
  
      this.el = document.createElement("div");
      this.el.className = "toast";
      document.getElementById("container").appendChild(this.el)
    },
  
    show(message, state) {
      clearTimeout(this.hideTimeout);
  
      this.el.textContent = message;
      this.el.className = "toast toast--visible";
  
      if (state) {
        this.el.classList.add(`toast--${state}`);
      }
    },

    hide(){
        this.hideTimeout = setTimeout(() => {
            this.el.classList.remove("toast--visible");
          }, 3000);
    },
};

function notification(_text) {
    Toast.show(_text, 'notification');
}
  
function notificationOff() {
   Toast.hide()
}
//Notification Messages

// Html Constants
const transactionType = document.querySelector("#transaction_type");  
const transactionTypeSavings = document.querySelector("#transaction_type_savings");
const transAmount = document.querySelector("#transaction_amount");
const transAmountSavings = document.querySelector("#transaction_amount_savings");
const transDescription = document.querySelector("#transaction_description");
const table = document.querySelector("#trans_table");
const tableSavings =  document.querySelector("#trans_table_savings");
const desc = document.querySelector("#desc");
const receiver = document.querySelector("#receiver_account")
const receiverAccount = document.querySelector("#receiver_description")
const accDisplay = document.querySelector("#account_details")
const userName = document.querySelector('#create_user')
const userInfo = document.querySelector("#user_info");
const userLogo = document.querySelector("#user_logo");

// Constants

//Grabbing Account details from the blockchain
const getAccounts = async function() {
    notification(`⌛ Loading`)
    let _getAccount = new Promise(async (resolve, reject) => {
        let p = await contract.methods.getAccount().call()
            resolve({
            userName: p[0],
            savingsBal: new BigNumber(p[1]),
            checkingsBal: new BigNumber(p[2]),
            savingsRecord: p[3],
            checkingsRecord: p[4],
        })
      });

    accountDetails = await _getAccount;
    
    checkingAccount.allTransactions = [...checkingAccount.allTransactions, ...accountDetails.checkingsRecord]
    savingsAccount.allTransactions = [...savingsAccount.allTransactions, ...accountDetails.savingsRecord]
    checkingAccount.balance = accountDetails.checkingsBal.shiftedBy(-ERC20_DECIMALS).toFixed(2)
    savingsAccount.balance = accountDetails.savingsBal.shiftedBy(-ERC20_DECIMALS).toFixed(2)
}

const checkUser = async function() {
    notification(`⌛ Loading`)
    userExists = await contract.methods.checkUser().call()
    if(userExists){
        notification(`⌛ Loading`)
        renderLogo();
        displayAccountBalances();
        hideToggle("#user_info");
        checkTx(table, checkingAccount);
        checkTx(tableSavings, savingsAccount);
        hideToggle("#account_details");
        notification(`Loading complete`)
        notificationOff()
    }else{
        notification(`⚠️ You do not have an account`)
        userInfo.style.display = "block";
    }
}

function checkTx(table, account){
    if(account.allTransactions != undefined ){
        printTableList(table, account);
    }
}

//Initializing Account
const createUser = async function(){
    let user = userName.value.toUpperCase()
    notification(`⌛ Creating new user ${user}`)
    if (user == "") {
        notification(`⚠️ Please enter a username`) 
    } else {
        try{
            const result = await contract.methods.createAccount(user).send({ from: kit.defaultAccount })
            hideToggle("#user_info");
            getAccounts();
            renderLogo();
            displayAccountBalances();
            hideToggle("#account_details");
        }catch (error){
            notification(`⚠️ ${error}.`) 
        }
        notificationOff()
    } 
}



// Checking Account
let checkingAccount = {
    // Checking account.
    name: "checking",
    balance: 0.00,
    id: 1,
    allTransactions: [],

    deposit: async function (amount, id) {
        amount = new BigNumber(amount).shiftedBy(ERC20_DECIMALS);
        notification(`⌛ Waiting for transaction approval`)
        try {
            await approve(amount)
            notification(`🎉 Transaction approved".`)
        }catch (error){
           notification(`⚠️ ${error}.`) 
        }
        notification(`⌛ Loading`)
        try {
            const result = await contract.methods.deposit(amount, id).send({ from: kit.defaultAccount })
            await getAccounts()
            displayAccountBalances()
            printTable(table, checkingAccount)
            notification(`🎉 Transaction successful".`)
        }catch (error){
            notification(`⚠️ ${error}.`) 
        }
        notificationOff()
    },
    withdraw: async function (amount, id) {
        notification(`⌛ Loading`)
        amount = new BigNumber(amount).shiftedBy(ERC20_DECIMALS);
        try {
            const result = await contract.methods.withdraw(amount, id).send({ from: kit.defaultAccount })
            await getAccounts()
            displayAccountBalances()
            printTable(table, checkingAccount)
            notification(`🎉 Transaction successful".`)
        }catch (error){
            notification(`⚠️ ${error}.`) 
        }
        notificationOff()
    },   
    debit: async function (amount, purpose, recipient) {
        amount = new BigNumber(amount).shiftedBy(ERC20_DECIMALS);
        notification(`⌛ Loading`)
        try {
            const result = await contract.methods.sendMoney(amount, recipient, purpose).send({ from: kit.defaultAccount })
            await getAccounts()
            displayAccountBalances()
            printTable(table, checkingAccount)
            notification(`🎉 Transaction successful".`)
        }catch (error){
            notification(`⚠️ ${error}.`) 
        }
        notificationOff()
    },
    transfer: async function (amount, id, purpose) {
        amount = new BigNumber(amount).shiftedBy(ERC20_DECIMALS);
        notification(`⌛ Loading`)
        try {
            const result = await contract.methods.transfer(amount, id, purpose).send({ from: kit.defaultAccount })
            await getAccounts()
            displayAccountBalances();
            printTable(table, checkingAccount);
            printTable(tableSavings, savingsAccount);
            notification(`🎉 Transaction successful".`)
        }catch (error){
            notification(`⚠️ ${error}.`) 
        }
        notificationOff()
    }
}

// Saving Account
let savingsAccount = {
    // Savings account.
    name: "savings",
    id: 2,
    balance: 0.00,
    desc: "Transfer",
    allTransactions: [],
    deposit: async function(amount, id){
        amount = new BigNumber(amount).shiftedBy(ERC20_DECIMALS);
        notification(`⌛ Waiting for transaction approval`)
        try {
            await approve(amount)
            notification(`🎉 Transaction approved".`)
        }catch (error){
           notification(`⚠️ ${error}.`) 
        }
        notification(`⌛ Loading`)
        try {
            const result = await contract.methods.deposit(amount, id).send({ from: kit.defaultAccount })
            notification(`🎉 Transaction successful".`)
            await getAccounts()
            displayAccountBalances(); 
            printTable(tableSavings, savingsAccount);
            notification(`🎉 Transaction successful".`)
        }catch (error){
            notification(`⚠️ ${error}.`) 
        }
        notificationOff()
    },  
    transfer: async function (amount, id, desc) {
        amount = new BigNumber(amount).shiftedBy(ERC20_DECIMALS);
        notification(`⌛ Loading`)
        try {
            const result = await contract.methods.transfer(amount, id, desc).send({ from: kit.defaultAccount })
            notification(`🎉 Transaction successful".`)
            await getAccounts()
            displayAccountBalances();
            printTable(tableSavings, savingsAccount);
            printTable(table, checkingAccount);
            notification(`🎉 Transaction successful".`)
        }catch (error){
            notification(`⚠️ ${error}.`) 
        }
        notificationOff()
    }
}

function printTable(tableId, account) {
    // Prints items to table as they are entered.
    let newRow = tableId.insertRow(-1);5
    let newCell1 = newRow.insertCell(0);
    let newCell2 = newRow.insertCell(1);
    let newCell3 = newRow.insertCell(2);
    let newCell4 = newRow.insertCell(3);
    let newCell5 = newRow.insertCell(4);
    let newCell6 = newRow.insertCell(5);
    newCell1.innerHTML = account.allTransactions[account.allTransactions.length - 1].transactiontype.toUpperCase();
    newCell5.innerHTML = `$${new BigNumber(account.allTransactions[account.allTransactions.length - 1].amount).shiftedBy(-ERC20_DECIMALS).toFixed(2)}`;
    newCell6.innerHTML = `$${new BigNumber(account.allTransactions[account.allTransactions.length - 1].balance).shiftedBy(-ERC20_DECIMALS).toFixed(2)}`;    
    if (account.allTransactions[account.allTransactions.length - 1].description != undefined || account.allTransactions[account.allTransactions.length - 1].description != "") {
        newCell2.innerHTML = account.allTransactions[account.allTransactions.length - 1].description.toUpperCase();
    } else {
        newCell2.innerHTML = "";
    }

    if (account.allTransactions[account.allTransactions.length - 1].sender != undefined || account.allTransactions[account.allTransactions.length - 1].sender != "") {
        newCell3.innerHTML = account.allTransactions[account.allTransactions.length - 1].sender.toUpperCase();
    } else {
        newCell3.innerHTML = "";
    }
    if (account.allTransactions[account.allTransactions.length - 1].recipient != undefined || account.allTransactions[account.allTransactions.length - 1].recipient != "") {
        newCell4.innerHTML = account.allTransactions[account.allTransactions.length - 1].recipient.toUpperCase();
    } else {
        newCell4.innerHTML = "";
    }
}

// Prints items to table, by iterating through the records
function printTableList(tableId, account) {
    let txLength = account.allTransactions.length;
    for (let i = 0; i < txLength; i++){
        let newRow = tableId.insertRow(-1);5
        let newCell1 = newRow.insertCell(0);
        let newCell2 = newRow.insertCell(1);
        let newCell3 = newRow.insertCell(2);
        let newCell4 = newRow.insertCell(3);
        let newCell5 = newRow.insertCell(4);
        let newCell6 = newRow.insertCell(5);

        newCell1.innerHTML = account.allTransactions[i].transactiontype.toUpperCase();
        newCell5.innerHTML = `$${new BigNumber(account.allTransactions[i].amount).shiftedBy(-ERC20_DECIMALS).toFixed(2)}`;
        newCell6.innerHTML = `$${new BigNumber(account.allTransactions[i].balance).shiftedBy(-ERC20_DECIMALS).toFixed(2)}`;
        if (account.allTransactions[i].description != undefined || account.allTransactions[i].description != '') {
            newCell2.innerHTML = account.allTransactions[i].description.toUpperCase();
        } else {
            newCell2.innerHTML = "";
        }

        if (account.allTransactions[i].sender != undefined || account.allTransactions[i].sender != "") {
            newCell3.innerHTML = account.allTransactions[i].sender.toUpperCase();
        } else {
            newCell3.innerHTML = "";
        }
        if (account.allTransactions[i].recipient != undefined || account.allTransactions[i].recipient != "") {
            newCell4.innerHTML = account.allTransactions[i].recipient.toUpperCase();
        } else {
            newCell4.innerHTML = "";
        }
    }
    
}


//Display accocunts balance
function displayAccountBalances () {
    // Displays current balance of both accounts.
    document.querySelector("#current_checking_balance").textContent = "Current Balance: $" + checkingAccount.balance;
    document.querySelector("#current_savings_balance").textContent = "Current Balance: $" + savingsAccount.balance;
}

// Bank Actions
function mainBankChecking() {
    // Checks which transaction button is selected and executes correct function.
    if (transactionType.value === "Debit") {
        runDebitChecking();
        transDescription.value = "";
        transAmount.value = "";
        receiverAccount.value = "";
    } else if (transactionType.value === "Deposit") {
        runDepositChecking();
        transAmount.value = "";
    } else if (transactionType.value === "Withdraw") {
        runWithdrawChecking();
        transAmount.value = "";
    } else if (transactionType.value === "Transfer") {
        runTransferChecking();
        transAmount.value = "";
        transDescription.value = "";
    }
}

function mainBankSavings() {
    // Checks which transaction button is selected and executes correct function.
    if (transactionTypeSavings.value === "Deposit") {
        runDepositSavings();
        transAmountSavings.value = "";
    } else if (transactionTypeSavings.value === "Transfer") {
        runTransferSavings();
        transAmountSavings.value = "";
        transDescription.value = "";
    }
}


// Checking Account Functionalities
function runDepositChecking() {
    // Checking deposit.
    let howMuch = Number.parseFloat(transAmount.value);
    let id = checkingAccount.id;
    if (isNaN(howMuch)) {
        notification("⚠️ Enter Amount.");
        } else if (howMuch <= 0) {
            notification("⚠️ Enter positive number.");
        } else {
            checkingAccount.deposit(howMuch, id);
        } 
}

function runWithdrawChecking() {
    // Checking withdrawal.
    let howMuch = Number.parseFloat(transAmount.value);
    let id = checkingAccount.id;
    let bal = checkingAccount.balance
    if (isNaN(howMuch)) {
        notification("⚠️ Enter Amount.");
        } else if (howMuch <= 0) {
            notification("⚠️ Enter positive number.");
        } else {
            if (bal >= howMuch) {
                checkingAccount.withdraw(howMuch, id);
            } else {
                notification("⚠️ Not enough funds for transaction.");
            }
    }  
}

function runDebitChecking() {
    // Checking debit.
    let howMuch = Number.parseFloat(transAmount.value);
    let forWhat = transDescription.value.toUpperCase();
    let toWho = receiverAccount.value.toUpperCase();
    let bal = checkingAccount.balance
    if (isNaN(howMuch)) {
        notification("⚠️ Enter Amount.");
        } else if (howMuch <= 0) {
            notification("⚠️ Enter positive number.");
        } else {
            if (bal >= howMuch) {
                checkingAccount.debit(howMuch, forWhat, toWho);
            } else {
                notification("⚠️ Not enough funds for transaction.");
            }
        }
}

function runTransferChecking() {
    // Transfer Checking to Savings.
    let howMuch = Number.parseFloat(transAmount.value);
    let id = checkingAccount.id;
    let forWhat = transDescription.value.toUpperCase();
    let bal = checkingAccount.balance
    if (isNaN(howMuch)) {
        notification("⚠️ Enter Amount.");
        } else if (howMuch <= 0) {
            notification("⚠️ Enter positive number.");
        } else {
            if (bal >= howMuch) {
                checkingAccount.transfer(howMuch, id, forWhat);
            } else {
                notification("⚠️ Not enough funds for transaction.");
            }
    }  
}

// Savings Accounts Functionalities
function runDepositSavings() {
    // Savings deposit.
    let howMuch = Number.parseFloat(transAmountSavings.value);
    let id = savingsAccount.id;
    if (isNaN(howMuch)) {
        notification("⚠️ Enter Amount.");
        } else if (howMuch <= 0) {
            notification("⚠️ Enter positive number.");
        } else {
            savingsAccount.deposit(howMuch, id);
        } 
}

function runTransferSavings() {
    // Transfer Savings to Checking.
    let howMuch = Number.parseFloat(transAmountSavings.value);
    
    let id = savingsAccount.id;
    let desc = savingsAccount.desc.toUpperCase();
    let bal = savingsAccount.balance
    if (isNaN(howMuch)) {
        notification("⚠️ Enter Amount.");
        } else if (howMuch <= 0) {
            notification("⚠️ Enter Amount.");
        } else {
            alert(`${howMuch}`);
            if (bal >= howMuch) {
                savingsAccount.transfer(howMuch, id, desc);
            } else {
                notification("⚠️ Not enough funds for transaction.");
            }
    }  
}


function clearBox(elementID) {
    // Clears element html.
    document.getElementById(elementID).innerHTML = "";
}

// For Checking account
function checkTransType() {
    // Checks transaction type. If debit it then shows description box. If not debit it hides box.
    if (transactionType.value === "Debit") {
        desc.style.display = "block";
        receiver.style.display = "block";
        transDescription.value = "";
        receiverAccount.value = "";
    } else if (transactionType.value === "Deposit") {
        desc.style.display = "none";
        receiver.style.display = "none";
    } else if (transactionType.value === "Withdraw") {
        desc.style.display = "none";
        receiver.style.display = "none";
    } else if (transactionType.value === "Transfer") {
        receiver.style.display = "none";
        desc.style.display = "block";
        transDescription.value = "";
    }
}

transactionType.addEventListener("click", checkTransType);


function hideToggle(itemToHide) {
    // Toggle to hide items.
    if ($(itemToHide).hasClass('_hidden')){
        $(itemToHide).removeClass('_hidden');
    }else{
        $(itemToHide).addClass('_hidden');
    }
}

function validate(event) {
    // Limits input boxes to .00 decimal places. Use this function oninput for input boxess in html.
    let x = this.value;
    this.value = (x.indexOf(".") >= 0) ? (x.substr(0, x.indexOf(".")) + x.substr(x.indexOf("."), 3)) : x;
}
transAmount.addEventListener("input", validate);
transAmountSavings.addEventListener("input", validate);

//Render Logo

function renderLogo() {
    userLogo.innerHTML = ""
    const newDiv = document.createElement("div")
    newDiv.className = "dropdown"
    newDiv.innerHTML = identiconTemplate(kit.defaultAccount)
    userLogo.appendChild(newDiv)
}

function identiconTemplate(_address) {
    const icon = blockies
      .create({
        seed: _address,
        size: 8,
        scale: 16,
      })
      .toDataURL()

    return `
    <div class="dropdown-toggle" id="navbarDropdownMenuLink" role="button" data-bs-toggle="dropdown" aria-expanded="false">
        <div class="rounded-circle overflow-hidden d-inline-block border border-white border-2 shadow-sm m-0 >
            <a class="dropdown-item" href="#"><img src="${icon}" width="36" alt="${_address}"></a>
        </div>
    </div>
    <ul class="dropdown-menu" aria-labelledby="navbarDropdownMenuLink">
        <li><a class="dropdown-item" >User Name: ${accountDetails.userName} </a></li>
        <li>
            <a class="dropdown-item" href="https://alfajores-blockscout.celo-testnet.org/address/${_address}/transactions"
            target="_blank"> View on Blockchain
            </a>
        </li>
    </ul>
    `
}



// Initiate account creation
document.querySelector("#submit_user_name").addEventListener("click", createUser);


// Activate Banking Functions
document.querySelector("#submit_transaction").addEventListener("click", () => {
    mainBankChecking();
});
document.querySelector("#submit_transaction_savings").addEventListener("click", () => {
    mainBankSavings();
});


$(document).ready(()=>{
    $('.toggler').on('change', function(){
      var $select = $(this);
      var $selected = $select.find('option:selected');
      var hideSelector = $selected.data('r-hide-target');
      var showSelector = $selected.data('r-show-target');
          
      $(hideSelector).addClass('_hidden');
      $(showSelector).removeClass('_hidden');
    });

})

  
window.addEventListener('load', async () => {
    Toast.init();
    notification("⌛ Loading...")
    await connectCeloWallet()
    await getAccounts()
    await checkUser()
  });