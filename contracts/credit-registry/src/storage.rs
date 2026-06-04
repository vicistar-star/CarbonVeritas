use soroban_sdk::{panic_with_error, vec, Address, Env, Vec};

use carbonveritas_shared::constants::DataKey;
use carbonveritas_shared::credit_metadata::{ApprovalRecord, ContractConfig, CreditMetadata};
use carbonveritas_shared::errors::Error;

const CREDIT_PREFIX: &str = "c";
const OWNER_PREFIX: &str = "o";
const APPROVAL_PREFIX: &str = "a";
const ISSUER_LIST_PREFIX: &str = "il";
const OWNER_LIST_PREFIX: &str = "ol";
const VERIFIER_LIST_KEY: &str = "vl";

pub fn next_credit_id(env: &Env) -> u64 {
    let counter: u64 = env
        .storage()
        .instance()
        .get(&DataKey::CreditCounter)
        .unwrap_or(0);
    env.storage()
        .instance()
        .set(&DataKey::CreditCounter, &(counter + 1));
    counter + 1
}

pub fn write_credit(env: &Env, id: u64, metadata: &CreditMetadata) {
    env.storage()
        .instance()
        .set(&(CREDIT_PREFIX, id), metadata);
}

pub fn read_credit(env: &Env, id: u64) -> CreditMetadata {
    env.storage()
        .instance()
        .get(&(CREDIT_PREFIX, id))
        .unwrap_or_else(|| panic_with_error!(env, Error::CreditNotFound))
}

pub fn write_owner(env: &Env, credit_id: u64, owner: &Address) {
    env.storage()
        .instance()
        .set(&(OWNER_PREFIX, credit_id), owner);
}

pub fn read_owner(env: &Env, credit_id: u64) -> Address {
    env.storage()
        .instance()
        .get(&(OWNER_PREFIX, credit_id))
        .unwrap_or_else(|| panic_with_error!(env, Error::CreditNotFound))
}

pub fn write_approval(env: &Env, credit_id: u64, record: &ApprovalRecord) {
    let mut records: Vec<ApprovalRecord> = env
        .storage()
        .instance()
        .get(&(APPROVAL_PREFIX, credit_id))
        .unwrap_or_else(|| vec![env]);
    records.push_back(record.clone());
    env.storage()
        .instance()
        .set(&(APPROVAL_PREFIX, credit_id), &records);
}

pub fn has_approval(env: &Env, credit_id: u64, verifier: &Address) -> bool {
    let records: Vec<ApprovalRecord> = env
        .storage()
        .instance()
        .get(&(APPROVAL_PREFIX, credit_id))
        .unwrap_or_else(|| vec![env]);
    for i in 0..records.len() {
        if let Some(r) = records.get(i) {
            if r.verifier == *verifier {
                return true;
            }
        }
    }
    false
}

pub fn count_approvals(env: &Env, credit_id: u64) -> u32 {
    let records: Vec<ApprovalRecord> = env
        .storage()
        .instance()
        .get(&(APPROVAL_PREFIX, credit_id))
        .unwrap_or_else(|| vec![env]);
    let mut count = 0;
    for i in 0..records.len() {
        if let Some(r) = records.get(i) {
            if r.approved {
                count += 1;
            }
        }
    }
    count
}

pub fn count_rejections(env: &Env, credit_id: u64) -> u32 {
    let records: Vec<ApprovalRecord> = env
        .storage()
        .instance()
        .get(&(APPROVAL_PREFIX, credit_id))
        .unwrap_or_else(|| vec![env]);
    let mut count = 0;
    for i in 0..records.len() {
        if let Some(r) = records.get(i) {
            if !r.approved {
                count += 1;
            }
        }
    }
    count
}

pub fn read_provenance(env: &Env, credit_id: u64) -> Vec<ApprovalRecord> {
    env.storage()
        .instance()
        .get(&(APPROVAL_PREFIX, credit_id))
        .unwrap_or_else(|| vec![env])
}

pub fn add_credit_to_issuer(env: &Env, issuer: &Address, credit_id: u64) {
    let mut list: Vec<u64> = env
        .storage()
        .instance()
        .get(&(ISSUER_LIST_PREFIX, issuer.clone()))
        .unwrap_or_else(|| vec![env]);
    list.push_back(credit_id);
    env.storage()
        .instance()
        .set(&(ISSUER_LIST_PREFIX, issuer.clone()), &list);
}

pub fn read_credits_by_issuer(env: &Env, issuer: &Address, offset: u32, limit: u32) -> Vec<u64> {
    let list: Vec<u64> = env
        .storage()
        .instance()
        .get(&(ISSUER_LIST_PREFIX, issuer.clone()))
        .unwrap_or_else(|| vec![env]);
    let end = core::cmp::min(offset.saturating_add(limit), list.len() as u32);
    if offset >= list.len() as u32 {
        return vec![env];
    }
    let mut result = vec![env];
    for i in offset..end {
        if let Some(val) = list.get(i) {
            result.push_back(val);
        }
    }
    result
}

pub fn add_credit_to_owner(env: &Env, owner: &Address, credit_id: u64) {
    let mut list: Vec<u64> = env
        .storage()
        .instance()
        .get(&(OWNER_LIST_PREFIX, owner.clone()))
        .unwrap_or_else(|| vec![env]);
    list.push_back(credit_id);
    env.storage()
        .instance()
        .set(&(OWNER_LIST_PREFIX, owner.clone()), &list);
}

pub fn read_credits_by_owner(env: &Env, owner: &Address) -> Vec<u64> {
    env.storage()
        .instance()
        .get(&(OWNER_LIST_PREFIX, owner.clone()))
        .unwrap_or_else(|| vec![env])
}

pub fn write_config(env: &Env, config: &ContractConfig) {
    env.storage()
        .instance()
        .set(&DataKey::ContractConfig, config);
}

pub fn read_config(env: &Env) -> ContractConfig {
    env.storage()
        .instance()
        .get(&DataKey::ContractConfig)
        .unwrap()
}

pub fn read_admin(env: &Env) -> Address {
    let config = read_config(env);
    config.admin
}

pub fn read_verifiers(env: &Env) -> Vec<Address> {
    env.storage()
        .instance()
        .get(&VERIFIER_LIST_KEY)
        .unwrap_or_else(|| vec![env])
}

pub fn write_verifiers(env: &Env, verifiers: &Vec<Address>) {
    env.storage()
        .instance()
        .set(&VERIFIER_LIST_KEY, verifiers);
}

pub fn is_verifier(env: &Env, addr: &Address) -> bool {
    let verifiers = read_verifiers(env);
    for i in 0..verifiers.len() {
        if let Some(v) = verifiers.get(i) {
            if v == *addr {
                return true;
            }
        }
    }
    false
}
