#![no_std]

use soroban_sdk::{contract, contractimpl, panic_with_error, Address, Env, Vec, symbol_short, token};

use carbonveritas_shared::constants::{COOLDOWN_PERIOD_SECONDS, MIN_STAKE_AMOUNT};
use carbonveritas_shared::credit_metadata::Verifier;
use carbonveritas_shared::errors::Error;

#[cfg(test)]
mod test;

#[contract]
pub struct VerifierStake;

#[contractimpl]
impl VerifierStake {
    pub fn init(env: Env, admin: Address, staking_asset: Address) {
        if env.storage().instance().has(&symbol_short!("admin")) {
            panic_with_error!(&env, Error::AlreadyExists);
        }
        env.storage().instance().set(&symbol_short!("admin"), &admin);
        env.storage().instance().set(&symbol_short!("asset"), &staking_asset);
    }

    pub fn register(env: Env, verifier: Address) -> bool {
        verifier.require_auth();
        if env.storage().instance().has(&verifier) {
            panic_with_error!(&env, Error::VerifierAlreadyRegistered);
        }

        let asset: Address = env.storage().instance().get(&symbol_short!("asset")).unwrap();
        let client = token::Client::new(&env, &asset);
        client.transfer(&verifier, &env.current_contract_address(), &MIN_STAKE_AMOUNT);

        let record = Verifier {
            address: verifier.clone(),
            total_staked: MIN_STAKE_AMOUNT,
            reputation_score: 100,
            approval_count: 0,
            rejection_count: 0,
            last_heartbeat: env.ledger().timestamp(),
            registered_at: env.ledger().timestamp(),
        };
        env.storage().instance().set(&verifier, &record);

        let mut list: Vec<Address> = env.storage().instance().get(&symbol_short!("v_list")).unwrap_or_else(|| Vec::new(&env));
        list.push_back(verifier.clone());
        env.storage().instance().set(&symbol_short!("v_list"), &list);

        true
    }

    pub fn stake(env: Env, verifier: Address, amount: i128) -> bool {
        verifier.require_auth();
        if amount <= 0 {
            panic_with_error!(&env, Error::InvalidInput);
        }
        let mut record: Verifier = env
            .storage()
            .instance()
            .get(&verifier)
            .unwrap_or_else(|| panic_with_error!(&env, Error::VerifierNotFound));
        
        let asset: Address = env.storage().instance().get(&symbol_short!("asset")).unwrap();
        let client = token::Client::new(&env, &asset);
        client.transfer(&verifier, &env.current_contract_address(), &amount);

        record.total_staked += amount;
        env.storage().instance().set(&verifier, &record);
        true
    }

    pub fn slash(env: Env, admin: Address, verifier: Address, amount: i128) -> bool {
        let stored_admin: Address = env.storage().instance().get(&symbol_short!("admin")).unwrap();
        admin.require_auth();
        if admin != stored_admin {
            panic_with_error!(&env, Error::NotAuthorized);
        }

        if amount <= 0 {
            panic_with_error!(&env, Error::InvalidInput);
        }
        let mut record: Verifier = env
            .storage()
            .instance()
            .get(&verifier)
            .unwrap_or_else(|| panic_with_error!(&env, Error::VerifierNotFound));
        
        if amount > record.total_staked {
            panic_with_error!(&env, Error::InsufficientStake);
        }
        record.total_staked -= amount;
        record.reputation_score = record.reputation_score.saturating_sub(10);
        env.storage().instance().set(&verifier, &record);
        
        // Slashed funds stay in contract or go to fee address? 
        // For now, let's just keep them in the contract.
        
        true
    }

    pub fn unregister(env: Env, verifier: Address) -> bool {
        verifier.require_auth();
        let record: Verifier = env
            .storage()
            .instance()
            .get(&verifier)
            .unwrap_or_else(|| panic_with_error!(&env, Error::VerifierNotFound));
        
        let elapsed = env.ledger().timestamp() - record.registered_at;
        if elapsed < COOLDOWN_PERIOD_SECONDS {
            panic_with_error!(&env, Error::CooldownActive);
        }

        let asset: Address = env.storage().instance().get(&symbol_short!("asset")).unwrap();
        let client = token::Client::new(&env, &asset);
        client.transfer(&env.current_contract_address(), &verifier, &record.total_staked);

        env.storage().instance().remove(&verifier);
        
        let list: Vec<Address> = env.storage().instance().get(&symbol_short!("v_list")).unwrap_or_else(|| Vec::new(&env));
        let mut new_list = Vec::new(&env);
        for i in 0..list.len() {
            if let Some(v) = list.get(i) {
                if v != verifier {
                    new_list.push_back(v);
                }
            }
        }
        env.storage().instance().set(&symbol_short!("v_list"), &new_list);

        true
    }

    pub fn get_verifier(env: Env, verifier: Address) -> Verifier {
        env.storage()
            .instance()
            .get(&verifier)
            .unwrap_or_else(|| panic_with_error!(&env, Error::VerifierNotFound))
    }

    pub fn is_verifier(env: Env, verifier: Address) -> bool {
        env.storage().instance().has(&verifier)
    }

    pub fn get_all_verifiers(env: Env) -> Vec<Verifier> {
        let list: Vec<Address> = env.storage().instance().get(&symbol_short!("v_list")).unwrap_or_else(|| Vec::new(&env));
        let mut result = Vec::new(&env);
        for i in 0..list.len() {
            if let Some(addr) = list.get(i) {
                if let Some(v) = env.storage().instance().get::<Address, Verifier>(&addr) {
                    result.push_back(v);
                }
            }
        }
        result
    }

    pub fn update_heartbeat(env: Env, verifier: Address) {
        verifier.require_auth();
        let mut record: Verifier = env
            .storage()
            .instance()
            .get(&verifier)
            .unwrap_or_else(|| panic_with_error!(&env, Error::VerifierNotFound));
        record.last_heartbeat = env.ledger().timestamp();
        env.storage().instance().set(&verifier, &record);
    }
}
