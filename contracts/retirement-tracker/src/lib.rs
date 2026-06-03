#![no_std]

use soroban_sdk::{contract, contractimpl, panic_with_error, Address, BytesN, Env, String, Vec};

use carbonveritas_shared::credit_metadata::RetirementRecord;
use carbonveritas_shared::errors::Error;

#[contract]
pub struct RetirementTracker;

#[contractimpl]
impl RetirementTracker {
    pub fn retire(
        env: Env,
        owner: Address,
        credit_id: u64,
        reason: String,
        beneficiary: String,
        accounting_period: String,
    ) -> RetirementRecord {
        owner.require_auth();
        // Cross-contract call to CreditRegistry to mark retired.
        // Placeholder — Day 3 will wire the actual client.
        if reason.is_empty() || beneficiary.is_empty() {
            panic_with_error!(&env, Error::InvalidInput);
        }
        let record = RetirementRecord {
            credit_id,
            retired_by: owner.clone(),
            beneficiary,
            reason,
            accounting_period,
            tonnes_retired: 0,
            tx_hash: BytesN::from_array(&env, &[0u8; 32]),
            ledger_sequence: env.ledger().sequence(),
            timestamp: env.ledger().timestamp(),
            certificate_hash: None,
        };
        let _ = credit_id;
        record
    }

    pub fn batch_retire(
        env: Env,
        owner: Address,
        retirements: Vec<RetirementRecord>,
    ) -> Vec<RetirementRecord> {
        owner.require_auth();
        let mut results: Vec<RetirementRecord> = Vec::new(&env);
        for record in retirements.iter() {
            let result = Self::retire(
                env.clone(),
                owner.clone(),
                record.credit_id,
                record.reason,
                record.beneficiary,
                record.accounting_period,
            );
            results.push_back(result);
        }
        results
    }

    pub fn is_retired(env: Env, credit_id: u64) -> bool {
        env.storage().instance().has(&credit_id)
    }

    pub fn get_retirement_record(env: Env, credit_id: u64) -> Option<RetirementRecord> {
        env.storage().instance().get(&credit_id)
    }

    pub fn get_retirements_by_beneficiary(
        env: Env,
        _beneficiary: String,
        _offset: u32,
        _limit: u32,
    ) -> Vec<RetirementRecord> {
        let results: Vec<RetirementRecord> = Vec::new(&env);
        results
    }
}
