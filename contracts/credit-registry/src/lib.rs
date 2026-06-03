#![no_std]

use soroban_sdk::{
    contract, contractimpl, panic_with_error, Address, Bytes, BytesN, Env, String, Vec,
};

use carbonveritas_shared::credit_metadata::{ApprovalRecord, CreditMetadata, CreditStatus};
use carbonveritas_shared::errors::Error;

pub mod events;
pub mod storage;
pub mod types;
pub mod validation;

#[contract]
pub struct CreditRegistry;

#[contractimpl]
impl CreditRegistry {
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
        m.created_at = env.ledger().timestamp();
        storage::write_credit(&env, credit_id, &m);
        storage::write_owner(&env, credit_id, &issuer);
        storage::add_credit_to_issuer(&env, &issuer, credit_id);
        storage::add_credit_to_owner(&env, &issuer, credit_id);
        events::emit_credit_submitted(&env, credit_id, &issuer, &m.ipfs_hash);
        credit_id
    }

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
        storage::write_approval(&env, credit_id, &verifier, &record);
        events::emit_credit_approved(&env, credit_id, &verifier);

        let config = storage::read_config(&env);
        let approvals = storage::count_approvals(&env, credit_id);
        if approvals >= config.verifier_threshold {
            credit.status = CreditStatus::Active;
            let id_bytes = BytesN::<8>::from_array(&env, &credit_id.to_be_bytes());
            let hash: BytesN<32> = env.crypto().sha256(&Bytes::from(id_bytes)).into();
            credit.token_id = Some(hash);
            storage::write_credit(&env, credit_id, &credit);
            events::emit_credit_minted(&env, credit_id);
            return credit.token_id;
        }
        None
    }

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
        storage::write_approval(&env, credit_id, &verifier, &record);
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

    pub fn mark_retired(env: Env, credit_id: u64) {
        validation::require_admin(&env);
        let mut credit = storage::read_credit(&env, credit_id);
        if credit.status != CreditStatus::Active {
            panic_with_error!(&env, Error::CreditNotActive);
        }
        credit.status = CreditStatus::Retired;
        storage::write_credit(&env, credit_id, &credit);
    }

    pub fn init(env: Env, admin: Address, threshold: u32, quorum: u32) {
        storage::write_config(
            &env,
            &carbonveritas_shared::credit_metadata::ContractConfig {
                admin,
                verifier_threshold: threshold,
                verifier_quorum: quorum,
                approval_window: carbonveritas_shared::constants::APPROVAL_WINDOW_SECONDS,
                protocol_fee_bps: carbonveritas_shared::constants::PROTOCOL_FEE_BPS,
                buffer_pool_pct: 10,
            },
        );
    }
}
