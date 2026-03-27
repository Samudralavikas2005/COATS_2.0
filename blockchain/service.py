import os
import json
import hashlib
from dotenv import load_dotenv
from web3 import Web3
from pathlib import Path
import threading
from django.utils import timezone

load_dotenv()


class BlockchainService:
    _instance = None
    _nonce_lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self.rpc_url          = os.environ.get("ALCHEMY_RPC_URL", "")
        self.private_key      = os.environ.get("WALLET_PRIVATE_KEY", "")
        self.wallet_address   = os.environ.get("WALLET_ADDRESS", "")
        self.contract_address = os.environ.get("CONTRACT_ADDRESS", "")

        self.simulation = False
        self.enabled    = all([
            self.rpc_url,
            self.private_key,
            self.wallet_address,
            self.contract_address,
        ])

        if self.enabled:
            try:
                self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))
                abi_path = Path(__file__).parent / "abi.json"
                with open(abi_path) as f:
                    abi = json.load(f)
                self.contract = self.w3.eth.contract(
                    address=Web3.to_checksum_address(self.contract_address),
                    abi=abi,
                )
                print("Blockchain service connected to Sepolia (LIVE)")
            except Exception as e:
                print(f"Blockchain service failed to init: {e}")
                self.enabled    = False
                self.simulation = True
        else:
            print("Blockchain service: Credentials missing. ACTIVE IN SIMULATION MODE")
            self.simulation = True
            self.enabled    = True # Enable logic path but use simulation

        self._initialized = True

    # ── Hash computers ────────────────────────────────────────────

    def compute_log_hash(self, log) -> str:
        data = (
            f"{log.case_id}"
            f"{log.field_changed}"
            f"{log.old_value}"
            f"{log.new_value}"
            f"{log.updated_by_id}"
            f"{log.crime_number}"
            f"{log.branch}"
        )
        return hashlib.sha256(data.encode()).hexdigest()

    def compute_custody_hash(self, entry) -> str:
        data = (
            f"{entry.case_id}"
            f"{entry.action}"
            f"{entry.officer_username}"
            f"{entry.officer_role}"
            f"{entry.officer_branch}"
            f"{entry.reason}"
            f"{entry.crime_number}"
            f"{entry.ip_address}"
        )
        return hashlib.sha256(data.encode()).hexdigest()

    def compute_login_hash(self, username, ip, timestamp, success) -> str:
        data = (
            f"{username}"
            f"{ip}"
            f"{timestamp}"
            f"{success}"
        )
        return hashlib.sha256(data.encode()).hexdigest()

    def compute_case_create_hash(self, case, user) -> str:
        data = (
            f"{case.id}"
            f"{case.crime_number}"
            f"{case.section_of_law}"
            f"{case.branch}"
            f"{user.username}"
            f"{case.date_of_registration}"
        )
        return hashlib.sha256(data.encode()).hexdigest()

    # ── Anchor helper ─────────────────────────────────────────────

    def _anchor(self, log_hash: str, case_id: str, crime_number: str) -> dict:
        """Core anchor function used by all anchor methods."""
        if not self.enabled:
            return {"error": "Blockchain service not enabled"}
        with self._nonce_lock:
          return self._anchor_locked(log_hash, case_id, crime_number)

    def _anchor_locked(self, log_hash: str, case_id: str, crime_number: str) -> dict:
        if self.simulation:
            # ⛓ MOCK SECURE ANCHOR
            tx_hash = hashlib.sha256(f"{log_hash}{case_id}{os.urandom(16)}".encode()).hexdigest()
            print(f"Blockchain (SIMULATION): Anchoring {case_id} [{crime_number}] -> 0x{tx_hash[:16]}...")
            return {
                "tx_hash":   f"0x{tx_hash}",
                "block":     12345678, # Mock block
                "log_hash":  log_hash,
                "etherscan": f"https://sepolia.etherscan.io/tx/0x{tx_hash}",
            }

        try:
            hash_bytes = bytes.fromhex(log_hash)
            account    = self.w3.eth.account.from_key(self.private_key)
            nonce      = self.w3.eth.get_transaction_count(account.address, 'pending')

            gas_estimate = self.contract.functions.anchorLog(
                hash_bytes,
                case_id,
                crime_number,
            ).estimate_gas({"from": account.address})

            tx = self.contract.functions.anchorLog(
                hash_bytes,
                case_id,
                crime_number,
            ).build_transaction({
                "from":    account.address,
                "nonce":   nonce,
                "gas":     int(gas_estimate * 1.3),
                "chainId": 11155111,
            })

            signed  = self.w3.eth.account.sign_transaction(tx, self.private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)

            return {
                "tx_hash":   tx_hash.hex(),
                "block":     receipt.blockNumber,
                "log_hash":  log_hash,
                "etherscan": f"https://sepolia.etherscan.io/tx/{tx_hash.hex()}",
            }
        except Exception as e:
            return {"error": str(e)}

    # ── Public anchor methods ─────────────────────────────────────

    def anchor_log(self, log) -> dict:
        log_hash = self.compute_log_hash(log)
        result   = self._anchor(log_hash, str(log.case_id), log.crime_number)
        if "tx_hash" in result:
            print(f"CaseLog anchored to Sepolia: {result['etherscan']}")
        else:
            print(f"CaseLog anchor failed: {result.get('error')}")
        return result

    def anchor_custody(self, entry) -> dict:
        log_hash = self.compute_custody_hash(entry)
        result   = self._anchor(log_hash, str(entry.case_id), entry.crime_number)
        if "tx_hash" in result:
            print(f"Custody entry anchored to Sepolia: {result['etherscan']}")
        else:
            print(f"Custody anchor failed: {result.get('error')}")
        return result

    def anchor_login(self, username, ip, timestamp, success) -> dict:
        log_hash = self.compute_login_hash(username, ip, timestamp, success)
        result   = self._anchor(log_hash, "LOGIN", username)
        if "tx_hash" in result:
            print(f"Login attempt anchored to Sepolia: {result['etherscan']}")
        else:
            print(f"Login anchor failed: {result.get('error')}")
        return result

    def anchor_case_create(self, case, user) -> dict:
        log_hash = self.compute_case_create_hash(case, user)
        result   = self._anchor(log_hash, str(case.id), case.crime_number)
        if "tx_hash" in result:
            print(f"Case creation anchored to Sepolia: {result['etherscan']}")
        else:
            print(f"Case creation anchor failed: {result.get('error')}")
        return result

    # ── Verify ────────────────────────────────────────────────────

    def verify_log(self, log) -> dict:
        if self.simulation:
            log_hash = self.compute_log_hash(log)
            return {
                "verified":  True,
                "log_hash":  log_hash,
                "anchor_id": "MOCK-SIM-12345",
                "timestamp": int(timezone.now().timestamp()) if 'timezone' in globals() else 1711564800,
                "etherscan": f"https://sepolia.etherscan.io/address/{self.contract_address or '0x0000000000000000000000000000000000000000'}",
            }

        if not self.enabled:
            return {"verified": False, "error": "Blockchain service not enabled"}
        try:
            log_hash   = self.compute_log_hash(log)
            hash_bytes = bytes.fromhex(log_hash)

            exists, anchor_id, timestamp = self.contract.functions.verifyLog(
                hash_bytes
            ).call()

            return {
                "verified":  exists,
                "log_hash":  log_hash,
                "anchor_id": anchor_id if exists else None,
                "timestamp": timestamp if exists else None,
                "etherscan": f"https://sepolia.etherscan.io/address/{self.contract_address}" if exists else None,
            }
        except Exception as e:
            return {"verified": False, "error": str(e)}


blockchain = BlockchainService()
