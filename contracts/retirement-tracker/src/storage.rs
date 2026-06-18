use soroban_sdk::{Address, Env, String, Vec};

use carbonveritas_shared::credit_metadata::RetirementRecord;

const RETIRED_PREFIX: &str = "r";
const BENEFICIARY_PREFIX: &str = "b";
const CREDIT_REGISTRY_KEY: &str = "cr";
const ADMIN_KEY: &str = "adm";

pub fn write_retirement_record(env: &Env, credit_id: u64, record: &RetirementRecord) {
    env.storage()
        .instance()
        .set(&(RETIRED_PREFIX, credit_id), record);
}

pub fn read_retirement_record(env: &Env, credit_id: u64) -> Option<RetirementRecord> {
    env.storage()
        .instance()
        .get(&(RETIRED_PREFIX, credit_id))
}

pub fn is_retired(env: &Env, credit_id: u64) -> bool {
    env.storage()
        .instance()
        .has(&(RETIRED_PREFIX, credit_id))
}

pub fn add_retirement_to_beneficiary(env: &Env, beneficiary: &String, credit_id: u64) {
    let mut list: Vec<u64> = env
        .storage()
        .instance()
        .get(&(BENEFICIARY_PREFIX, beneficiary.clone()))
        .unwrap_or_else(|| Vec::new(env));
    list.push_back(credit_id);
    env.storage()
        .instance()
        .set(&(BENEFICIARY_PREFIX, beneficiary.clone()), &list);
}

pub fn read_retirements_by_beneficiary(
    env: &Env,
    beneficiary: &String,
    offset: u32,
    limit: u32,
) -> Vec<RetirementRecord> {
    let ids: Vec<u64> = env
        .storage()
        .instance()
        .get(&(BENEFICIARY_PREFIX, beneficiary.clone()))
        .unwrap_or_else(|| Vec::new(env));
    let end = core::cmp::min(offset.saturating_add(limit), ids.len());
    if offset >= ids.len() {
        return Vec::new(env);
    }
    let mut result = Vec::new(env);
    for i in offset..end {
        if let Some(id) = ids.get(i) {
            if let Some(record) = read_retirement_record(env, id) {
                result.push_back(record);
            }
        }
    }
    result
}

pub fn write_credit_registry(env: &Env, addr: &Address) {
    env.storage().instance().set(&CREDIT_REGISTRY_KEY, addr);
}

pub fn read_credit_registry(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&CREDIT_REGISTRY_KEY)
        .unwrap()
}

pub fn write_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&ADMIN_KEY, admin);
}

pub fn read_admin(env: &Env) -> Address {
    env.storage().instance().get(&ADMIN_KEY).unwrap()
}
