#![no_std]

use soroban_sdk::{contract, contractimpl, panic_with_error, Address, Env, String, Vec};

use carbonveritas_shared::credit_metadata::RevenueConfig;
use carbonveritas_shared::errors::Error;

#[contract]
pub struct RevenueSplit;

#[contractimpl]
impl RevenueSplit {
    pub fn configure(
        env: Env,
        admin: Address,
        project_id: String,
        beneficiaries: Vec<(Address, u32)>,
    ) {
        admin.require_auth();
        if project_id.is_empty() {
            panic_with_error!(&env, Error::InvalidInput);
        }
        if beneficiaries.is_empty() {
            panic_with_error!(&env, Error::InvalidInput);
        }
        let total_bps: u64 = beneficiaries
            .iter()
            .map(|(_, bps)| bps as u64)
            .sum::<u64>();
        if total_bps != 10000 {
            panic_with_error!(&env, Error::InvalidInput);
        }
        let config = RevenueConfig {
            project_id,
            beneficiaries,
            protocol_fee_bps: 50,
        };
        env.storage().instance().set(&config.project_id, &config);
    }

    pub fn distribute(env: Env, caller: Address, project_id: String) -> bool {
        caller.require_auth();
        let config: RevenueConfig = env
            .storage()
            .instance()
            .get(&project_id)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotFound));
        let _ = config;
        true
    }

    pub fn get_config(env: Env, project_id: String) -> RevenueConfig {
        env.storage()
            .instance()
            .get(&project_id)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotFound))
    }
}
