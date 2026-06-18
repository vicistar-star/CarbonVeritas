#![no_std]

use soroban_sdk::{contract, contractimpl, panic_with_error, Address, Env, String, Vec, symbol_short, token};

use carbonveritas_shared::credit_metadata::RevenueConfig;
use carbonveritas_shared::errors::Error;

#[cfg(test)]
mod test;

#[contract]
pub struct RevenueSplit;

#[contractimpl]
impl RevenueSplit {
    pub fn init(env: Env, admin: Address, protocol_fee_address: Address) {
        if env.storage().instance().has(&symbol_short!("admin")) {
            panic_with_error!(&env, Error::AlreadyExists);
        }
        env.storage().instance().set(&symbol_short!("admin"), &admin);
        env.storage().instance().set(&symbol_short!("fee_addr"), &protocol_fee_address);
    }

    /// Configure revenue split beneficiaries for a project.
    /// Each beneficiary gets a share in basis points (bps). The sum of all
    /// shares must equal exactly 10000 (100.00%) to ensure complete distribution.
    /// Protocol fee is applied on top of the total via distribute().
    pub fn configure(
        env: Env,
        admin: Address,
        project_id: String,
        beneficiaries: Vec<(Address, u32)>,
    ) {
        let stored_admin: Address = env.storage().instance().get(&symbol_short!("admin")).unwrap();
        admin.require_auth();
        if admin != stored_admin {
            panic_with_error!(&env, Error::NotAuthorized);
        }

        if project_id.is_empty() || beneficiaries.is_empty() {
            panic_with_error!(&env, Error::InvalidInput);
        }
        
        let mut total_bps: u32 = 0;
        for i in 0..beneficiaries.len() {
            if let Some((_, bps)) = beneficiaries.get(i) {
                total_bps += bps;
            }
        }

        if total_bps != 10000 {
            panic_with_error!(&env, Error::InvalidInput);
        }

        let config = RevenueConfig {
            project_id: project_id.clone(),
            beneficiaries,
            protocol_fee_bps: carbonveritas_shared::constants::PROTOCOL_FEE_BPS,
        };
        env.storage().instance().set(&project_id, &config);
    }

    /// Distribute payment among configured beneficiaries.
    /// First deducts the protocol fee (to the fee address), then splits the
    /// remaining amount proportionally according to each beneficiary's bps share.
    /// Uses i128 arithmetic with checked semantics from token client.
    pub fn distribute(env: Env, caller: Address, project_id: String, asset: Address, amount: i128) -> bool {
        caller.require_auth();
        let config: RevenueConfig = env
            .storage()
            .instance()
            .get(&project_id)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotFound));
        
        let client = token::Client::new(&env, &asset);
        
        let fee_address: Address = env.storage().instance().get(&symbol_short!("fee_addr")).unwrap();
        let fee = amount * (config.protocol_fee_bps as i128) / 10000;
        let net_amount = amount - fee;

        if fee > 0 {
            client.transfer(&caller, &fee_address, &fee);
        }

        for i in 0..config.beneficiaries.len() {
            if let Some((beneficiary, bps)) = config.beneficiaries.get(i) {
                let share = net_amount * (bps as i128) / 10000;
                if share > 0 {
                    client.transfer(&caller, &beneficiary, &share);
                }
            }
        }
        
        true
    }

    pub fn get_config(env: Env, project_id: String) -> RevenueConfig {
        env.storage()
            .instance()
            .get(&project_id)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotFound))
    }
}
