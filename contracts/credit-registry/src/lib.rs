#![no_std]

use soroban_sdk::{
    contract, contractimpl, panic_with_error, Address, Bytes, BytesN, Env, String, Vec,
};

use carbonveritas_shared::credit_metadata::{ApprovalRecord, ContractConfig, CreditMetadata, CreditStatus};
use carbonveritas_shared::errors::Error;

pub mod events;
pub mod storage;
pub mod types;
pub mod validation;

#[cfg(test)]
mod test;

#[contract]
pub struct CreditRegistry;

#[contractimpl]
impl CreditRegistry {
    /// Submit a new carbon credit for verifier review.
    /// Validates metadata, assigns a monotonically increasing ID, persists the record,
    /// and emits a CreditSubmitted event. The credit starts in Pending status.
    pub fn submit_credit(
        env: Env,
        issuer: Address,
        metadata: CreditMetadata,
        ipfs_hash: String,
    ) -> u64 {
        issuer.require_auth();
        validation::validate_metadata(&env, &metadata);
        let credit_id = storage::next_credit_id(&env);
        let mut m = metadata;
        m.status = CreditStatus::Pending;
        m.ipfs_hash = ipfs_hash;
        m.token_id = BytesN::from_array(&env, &[0u8; 32]);
        m.created_at = env.ledger().timestamp();
        storage::write_credit(&env, credit_id, &m);
        storage::write_owner(&env, credit_id, &issuer);
        storage::add_credit_to_issuer(&env, &issuer, credit_id);
        storage::add_credit_to_owner(&env, &issuer, credit_id);
        events::emit_credit_submitted(&env, credit_id, &issuer, &m.ipfs_hash);
        credit_id
    }

    /// Record a verifier approval for a pending credit.
    /// Once the approval count reaches verifier_threshold, the credit is automatically
    /// minted with an Active status. The token ID is derived from sha256(credit_id).
    /// Returns Some(token_id) on mint, None if the threshold is not yet met.
    /// Reverts if the verifier already voted or if credit is not in Pending status.
    pub fn approve_and_mint(
        env: Env,
        verifier: Address,
        credit_id: u64,
        comments: String,
    ) -> Option<BytesN<32>> {
        verifier.require_auth();
        validation::require_verifier(&env, &verifier);
        let mut credit = storage::read_credit(&env, credit_id);
        if credit.status != CreditStatus::Pending {
            panic_with_error!(&env, Error::CreditNotPending);
        }
        if storage::has_approval(&env, credit_id, &verifier) {
            panic_with_error!(&env, Error::AlreadyVoted);
        }
        let record = ApprovalRecord {
            verifier: verifier.clone(),
            approved: true,
            timestamp: env.ledger().timestamp(),
            comments,
        };
        storage::write_approval(&env, credit_id, &record);
        events::emit_credit_approved(&env, credit_id, &verifier);

        let config = storage::read_config(&env);
        let approvals = storage::count_approvals(&env, credit_id);
        if approvals >= config.verifier_threshold {
            credit.status = CreditStatus::Active;
            let id_bytes = BytesN::<8>::from_array(&env, &credit_id.to_be_bytes());
            let hash: BytesN<32> = env.crypto().sha256(&Bytes::from(id_bytes)).into();
            credit.token_id = hash.clone();
            storage::write_credit(&env, credit_id, &credit);
            events::emit_credit_minted(&env, credit_id);
            return Some(hash);
        }
        None
    }

    /// Record a verifier rejection for a pending credit.
    /// If rejections exceed (quorum - threshold), the credit is permanently Rejected.
    /// Returns true if the rejection threshold was met, false otherwise.
    /// Reverts if the verifier already voted or if credit is not Pending.
    pub fn reject_credit(
        env: Env,
        verifier: Address,
        credit_id: u64,
        reason: String,
    ) -> bool {
        verifier.require_auth();
        validation::require_verifier(&env, &verifier);
        let mut credit = storage::read_credit(&env, credit_id);
        if credit.status != CreditStatus::Pending {
            panic_with_error!(&env, Error::CreditNotPending);
        }
        if storage::has_approval(&env, credit_id, &verifier) {
            panic_with_error!(&env, Error::AlreadyVoted);
        }
        let record = ApprovalRecord {
            verifier: verifier.clone(),
            approved: false,
            timestamp: env.ledger().timestamp(),
            comments: reason,
        };
        storage::write_approval(&env, credit_id, &record);
        events::emit_credit_rejected(&env, credit_id, &verifier);

        let config = storage::read_config(&env);
        let rejections = storage::count_rejections(&env, credit_id);
        if rejections > (config.verifier_quorum - config.verifier_threshold) {
            credit.status = CreditStatus::Rejected;
            storage::write_credit(&env, credit_id, &credit);
            return true;
        }
        false
    }

    pub fn transfer_credit(env: Env, from: Address, to: Address, credit_id: u64) -> bool {
        from.require_auth();
        let owner = storage::read_owner(&env, credit_id);
        if owner != from {
            panic_with_error!(&env, Error::CreditNotOwned);
        }
        let credit = storage::read_credit(&env, credit_id);
        if credit.status != CreditStatus::Active {
            panic_with_error!(&env, Error::CreditNotActive);
        }
        storage::write_owner(&env, credit_id, &to);
        storage::add_credit_to_owner(&env, &to, credit_id);
        events::emit_credit_transferred(&env, credit_id, &from, &to);
        true
    }

    pub fn get_credit(env: Env, credit_id: u64) -> CreditMetadata {
        storage::read_credit(&env, credit_id)
    }

    pub fn get_provenance(env: Env, credit_id: u64) -> Vec<ApprovalRecord> {
        storage::read_provenance(&env, credit_id)
    }

    pub fn get_credits_by_issuer(env: Env, issuer: Address, offset: u32, limit: u32) -> Vec<u64> {
        storage::read_credits_by_issuer(&env, &issuer, offset, limit)
    }

    pub fn get_owner(env: Env, credit_id: u64) -> Address {
        storage::read_owner(&env, credit_id)
    }

    pub fn get_credits_by_owner(env: Env, owner: Address) -> Vec<u64> {
        storage::read_credits_by_owner(&env, &owner)
    }

    /// Permanently retire a credit. Called only by an authorized contract
    /// (the RetirementTracker or MerkleBridge) via cross-contract call. This is
    /// irreversible — once Retired, a credit can never be transferred or reactivated.
    /// Reverts unless `caller` is both authenticated and registered as an
    /// authorized retirer via `add_retirer`.
    pub fn mark_retired(env: Env, caller: Address, credit_id: u64) {
        caller.require_auth();
        if !storage::is_authorized_retirer(&env, &caller) {
            panic_with_error!(&env, Error::NotAuthorized);
        }
        let mut credit = storage::read_credit(&env, credit_id);
        if credit.status != CreditStatus::Active {
            panic_with_error!(&env, Error::CreditNotActive);
        }
        credit.status = CreditStatus::Retired;
        storage::write_credit(&env, credit_id, &credit);
    }

    /// Initialize the contract with admin and verifier configuration.
    /// Threshold must be >= 1 and <= quorum. Called once at deployment.
    pub fn init(env: Env, admin: Address, threshold: u32, quorum: u32) {
        if threshold == 0 || quorum == 0 || threshold > quorum {
            panic_with_error!(&env, Error::InvalidInput);
        }
        storage::write_config(
            &env,
            &ContractConfig {
                admin,
                verifier_threshold: threshold,
                verifier_quorum: quorum,
                approval_window: carbonveritas_shared::constants::APPROVAL_WINDOW_SECONDS,
                protocol_fee_bps: carbonveritas_shared::constants::PROTOCOL_FEE_BPS,
                buffer_pool_pct: 10,
            },
        );
    }

    /// Return the current protocol configuration (threshold, quorum, fees, etc.).
    /// This is the single source of truth for protocol parameters and is
    /// consumed by the API, indexer, and any external integrators.
    pub fn get_config(env: Env) -> ContractConfig {
        storage::read_config(&env)
    }

    /// Update protocol configuration. Admin-only. Validates each parameter
    /// against sane bounds to prevent governance mistakes:
    ///   - threshold >= 1 and <= quorum, quorum >= 1 and <= MAX_VERIFIERS
    ///   - approval_window in [1 hour, 90 days]
    ///   - protocol_fee_bps <= 1000 (10%)
    ///   - buffer_pool_pct <= 50
    /// Emits a ConfigUpdated event on success.
    pub fn update_config(
        env: Env,
        admin: Address,
        verifier_threshold: u32,
        verifier_quorum: u32,
        approval_window: u64,
        protocol_fee_bps: u32,
        buffer_pool_pct: u32,
    ) -> bool {
        admin.require_auth();
        if admin != storage::read_admin(&env) {
            panic_with_error!(&env, Error::NotAuthorized);
        }

        if verifier_threshold == 0
            || verifier_quorum == 0
            || verifier_threshold > verifier_quorum
            || verifier_quorum > carbonveritas_shared::constants::MAX_VERIFIERS
        {
            panic_with_error!(&env, Error::InvalidInput);
        }
        if !(3600..=90 * 24 * 3600).contains(&approval_window) {
            panic_with_error!(&env, Error::InvalidInput);
        }
        if protocol_fee_bps > 1000 {
            panic_with_error!(&env, Error::InvalidInput);
        }
        if buffer_pool_pct > 50 {
            panic_with_error!(&env, Error::InvalidInput);
        }

        let mut config = storage::read_config(&env);
        config.verifier_threshold = verifier_threshold;
        config.verifier_quorum = verifier_quorum;
        config.approval_window = approval_window;
        config.protocol_fee_bps = protocol_fee_bps;
        config.buffer_pool_pct = buffer_pool_pct;
        storage::write_config(&env, &config);
        events::emit_config_updated(&env, &admin);
        true
    }

    pub fn add_verifier(env: Env, admin: Address, verifier: Address) {
        admin.require_auth();
        validation::require_admin(&env);
        let mut verifiers = storage::read_verifiers(&env);
        for i in 0..verifiers.len() {
            if let Some(v) = verifiers.get(i) {
                if v == verifier {
                    panic_with_error!(&env, Error::VerifierAlreadyRegistered);
                }
            }
        }
        if verifiers.len() >= carbonveritas_shared::constants::MAX_VERIFIERS {
            panic_with_error!(&env, Error::InvalidInput);
        }
        verifiers.push_back(verifier);
        storage::write_verifiers(&env, &verifiers);
    }

    pub fn remove_verifier(env: Env, admin: Address, verifier: Address) {
        admin.require_auth();
        validation::require_admin(&env);
        let verifiers = storage::read_verifiers(&env);
        let mut new_list: Vec<Address> = Vec::new(&env);
        let mut found = false;
        for i in 0..verifiers.len() {
            if let Some(v) = verifiers.get(i) {
                if v == verifier {
                    found = true;
                } else {
                    new_list.push_back(v);
                }
            }
        }
        if !found {
            panic_with_error!(&env, Error::VerifierNotFound);
        }
        storage::write_verifiers(&env, &new_list);
    }

    /// Mint a credit directly via an authorized bridge contract (e.g. MerkleBridge).
    /// Skips the verifier approval workflow since the credit was already verified
    /// on the source registry. Only pre-authorized bridge addresses can call this.
    pub fn mint_bridged(
        env: Env,
        bridge: Address,
        to: Address,
        metadata: CreditMetadata,
    ) -> u64 {
        bridge.require_auth();
        if !storage::is_authorized_bridge(&env, &bridge) {
            panic_with_error!(&env, Error::NotAuthorized);
        }
        validation::validate_metadata(&env, &metadata);
        
        let credit_id = storage::next_credit_id(&env);
        let mut m = metadata;
        m.status = CreditStatus::Active;
        m.created_at = env.ledger().timestamp();
        
        let id_bytes = BytesN::<8>::from_array(&env, &credit_id.to_be_bytes());
        let hash: BytesN<32> = env.crypto().sha256(&Bytes::from(id_bytes)).into();
        m.token_id = hash;

        storage::write_credit(&env, credit_id, &m);
        storage::write_owner(&env, credit_id, &to);
        storage::add_credit_to_owner(&env, &to, credit_id);
        
        events::emit_credit_minted(&env, credit_id);
        credit_id
    }

    pub fn add_bridge(env: Env, admin: Address, bridge: Address) {
        admin.require_auth();
        validation::require_admin(&env);
        storage::set_authorized_bridge(&env, &bridge, true);
    }

    pub fn remove_bridge(env: Env, admin: Address, bridge: Address) {
        admin.require_auth();
        validation::require_admin(&env);
        storage::set_authorized_bridge(&env, &bridge, false);
    }

    /// Authorize a contract (e.g. RetirementTracker or MerkleBridge) to mark
    /// credits as retired via `mark_retired`. Admin-only.
    pub fn add_retirer(env: Env, admin: Address, retirer: Address) {
        admin.require_auth();
        validation::require_admin(&env);
        storage::set_authorized_retirer(&env, &retirer, true);
    }

    /// Revoke a contract's authorization to mark credits as retired. Admin-only.
    pub fn remove_retirer(env: Env, admin: Address, retirer: Address) {
        admin.require_auth();
        validation::require_admin(&env);
        storage::set_authorized_retirer(&env, &retirer, false);
    }

    pub fn is_retirer(env: Env, retirer: Address) -> bool {
        storage::is_authorized_retirer(&env, &retirer)
    }
}
