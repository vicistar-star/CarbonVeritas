#![no_std]

use soroban_sdk::{contract, contractimpl, panic_with_error, Address, Env, Vec};

use carbonveritas_shared::constants::{COOLDOWN_PERIOD_SECONDS, MIN_STAKE_AMOUNT};
use carbonveritas_shared::credit_metadata::Verifier;
use carbonveritas_shared::errors::Error;

#[contract]
pub struct VerifierStake;

#[contractimpl]
impl VerifierStake {
    pub fn register(env: Env, verifier: Address) -> bool {
        verifier.require_auth();
        if env.storage().instance().has(&verifier) {
            panic_with_error!(&env, Error::VerifierAlreadyRegistered);
        }
        let record = Verifier {
            address: verifier.clone(),
            total_staked: MIN_STAKE_AMOUNT,
            reputation_score: 0,
            approval_count: 0,
            rejection_count: 0,
            last_heartbeat: env.ledger().timestamp(),
            registered_at: env.ledger().timestamp(),
        };
        env.storage().instance().set(&verifier, &record);
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
        record.total_staked += amount;
        env.storage().instance().set(&verifier, &record);
        true
    }

    pub fn slash(env: Env, admin: Address, verifier: Address, amount: i128) -> bool {
        admin.require_auth();
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
        env.storage().instance().remove(&verifier);
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
        Vec::new(&env)
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
