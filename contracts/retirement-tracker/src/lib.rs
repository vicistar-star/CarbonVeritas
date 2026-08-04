#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, panic_with_error, Address, BytesN, Env, String, Vec};

use carbonveritas_credit_registry::CreditRegistryClient;
use carbonveritas_shared::constants::MAX_BATCH_RETIRE;
use carbonveritas_shared::credit_metadata::RetirementRecord;
use carbonveritas_shared::errors::Error;

pub mod events;
pub mod storage;

#[cfg(test)]
mod test;

#[contract]
pub struct RetirementTracker;

#[contracttype]
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RetireInput {
    pub credit_id: u64,
    pub reason: String,
    pub beneficiary: String,
    pub accounting_period: String,
}

#[contractimpl]
impl RetirementTracker {
    pub fn init(env: Env, admin: Address, credit_registry: Address) {
        admin.require_auth();
        storage::write_admin(&env, &admin);
        storage::write_credit_registry(&env, &credit_registry);
    }

    /// Permanently retire a credit. This is irreversible — the credit's status
    /// is set to Retired via cross-contract call to CreditRegistry.mark_retired.
    /// Emits a Retired event and stores the full retirement record on-chain.
    pub fn retire(
        env: Env,
        owner: Address,
        credit_id: u64,
        reason: String,
        beneficiary: String,
        accounting_period: String,
    ) -> RetirementRecord {
        owner.require_auth();

        if reason.is_empty() || beneficiary.is_empty() || accounting_period.is_empty() {
            panic_with_error!(&env, Error::InvalidInput);
        }
        if storage::is_retired(&env, credit_id) {
            panic_with_error!(&env, Error::CreditAlreadyRetired);
        }

        let credit_registry = storage::read_credit_registry(&env);
        let client = CreditRegistryClient::new(&env, &credit_registry);
        
        let owner_on_chain = client.get_owner(&credit_id);
        if owner_on_chain != owner {
            panic_with_error!(&env, Error::CreditNotOwned);
        }

        client.mark_retired(&env.current_contract_address(), &credit_id);

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
            certificate_hash: BytesN::from_array(&env, &[0u8; 32]),
        };
        storage::write_retirement_record(&env, credit_id, &record);
        storage::add_retirement_to_beneficiary(&env, &record.beneficiary, credit_id);
        events::emit_retired(&env, &record);
        record
    }

    /// Batch retire multiple credits in a single transaction.
    /// All-or-nothing semantics — reverts entirely if any single retirement fails.
    /// Limited to MAX_BATCH_RETIRE credits per call to prevent gas exhaustion.
    pub fn batch_retire(
        env: Env,
        owner: Address,
        retirements: Vec<RetireInput>,
    ) -> Vec<RetirementRecord> {
        owner.require_auth();

        if retirements.len() > MAX_BATCH_RETIRE {
            panic_with_error!(&env, Error::InvalidInput);
        }

        let credit_registry = storage::read_credit_registry(&env);
        let client = CreditRegistryClient::new(&env, &credit_registry);

        let mut results: Vec<RetirementRecord> = Vec::new(&env);
        for input in retirements.iter() {
            if input.reason.is_empty() || input.beneficiary.is_empty() || input.accounting_period.is_empty() {
                panic_with_error!(&env, Error::InvalidInput);
            }
            if storage::is_retired(&env, input.credit_id) {
                panic_with_error!(&env, Error::CreditAlreadyRetired);
            }

            let owner_on_chain = client.get_owner(&input.credit_id);
            if owner_on_chain != owner {
                panic_with_error!(&env, Error::CreditNotOwned);
            }

            client.mark_retired(&env.current_contract_address(), &input.credit_id);

            let record = RetirementRecord {
                credit_id: input.credit_id,
                retired_by: owner.clone(),
                beneficiary: input.beneficiary,
                reason: input.reason,
                accounting_period: input.accounting_period,
                tonnes_retired: 0,
                tx_hash: BytesN::from_array(&env, &[0u8; 32]),
                ledger_sequence: env.ledger().sequence(),
                timestamp: env.ledger().timestamp(),
                certificate_hash: BytesN::from_array(&env, &[0u8; 32]),
            };
            storage::write_retirement_record(&env, input.credit_id, &record);
            storage::add_retirement_to_beneficiary(&env, &record.beneficiary, input.credit_id);
            events::emit_retired(&env, &record);
            results.push_back(record);
        }
        results
    }

    pub fn is_retired(env: Env, credit_id: u64) -> bool {
        storage::is_retired(&env, credit_id)
    }

    pub fn get_retirement_record(env: Env, credit_id: u64) -> Option<RetirementRecord> {
        storage::read_retirement_record(&env, credit_id)
    }

    pub fn get_retirements_by_beneficiary(
        env: Env,
        beneficiary: String,
        offset: u32,
        limit: u32,
    ) -> Vec<RetirementRecord> {
        storage::read_retirements_by_beneficiary(&env, &beneficiary, offset, limit)
    }
}
