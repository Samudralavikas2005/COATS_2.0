import os
import json
from web3 import Web3
from solcx import compile_source, install_solc
from dotenv import load_dotenv

load_dotenv()

RPC_URL     = os.environ["ALCHEMY_RPC_URL"]
PRIVATE_KEY = os.environ["WALLET_PRIVATE_KEY"]

w3 = Web3(Web3.HTTPProvider(RPC_URL))
assert w3.is_connected(), "Could not connect to Sepolia"
print(f"Connected to Sepolia — Block: {w3.eth.block_number}")

install_solc("0.8.0")

with open("blockchain/contract.sol") as f:
    source = f.read()

compiled = compile_source(source, output_values=["abi", "bin"], solc_version="0.8.0")
contract_id, contract_interface = list(compiled.items())[0]

abi      = contract_interface["abi"]
bytecode = contract_interface["bin"]

with open("blockchain/abi.json", "w") as f:
    json.dump(abi, f, indent=2)
print("ABI saved to blockchain/abi.json")

Contract = w3.eth.contract(abi=abi, bytecode=bytecode)
account  = w3.eth.account.from_key(PRIVATE_KEY)
nonce    = w3.eth.get_transaction_count(account.address)

tx = Contract.constructor().build_transaction({
    "from":    account.address,
    "nonce":   nonce,
    "gas":     2000000,
    "chainId": 11155111,
})

signed  = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
print(f"Deploying... TX: {tx_hash.hex()}")

receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
print(f"\nContract deployed!")
print(f"Contract Address: {receipt.contractAddress}")
print(f"View on Etherscan: https://sepolia.etherscan.io/address/{receipt.contractAddress}")
print(f"\nAdd this to your .env file:")
print(f"CONTRACT_ADDRESS={receipt.contractAddress}")
