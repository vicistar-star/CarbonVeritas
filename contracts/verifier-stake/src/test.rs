#![cfg(test)]

extern crate std;

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::testutils::Ledger as _;
use soroban_sdk::{Address, Env, token};
use carbonveritas_shared::constants::MIN_STAKE_AMOUNT;

fn setup_test(env: &Env) -> (Address, Address, VerifierStakeClient<'static>, Address) {
    env.mock_all_auths();
    let admin = Address::generate(env);
    let token_id = env.register_stellar_asset_contract_v2(Address::generate(env));
    let token_address = token_id.address();
    
    let contract_id = env.register_contract(None, VerifierStake);
    let client = VerifierStakeClient::new(env, &contract_id);
    client.init(&admin, &token_address);

    (admin, token_address.clone(), client, token_address)
}

fn fund_and_register(env: &Env, client: &VerifierStakeClient<'static>, token_id: &Address) -> Address {
    let verifier = Address::generate(env);
    let token_admin = token::StellarAssetClient::new(env, token_id);
    token_admin.mint(&verifier, &MIN_STAKE_AMOUNT);
    client.register(&verifier);
    verifier
}

#[test]
fn test_verifier_registration() {
    let env = Env::default();
    let (_, token_id, client, _) = setup_test(&env);
    
    let verifier = Address::generate(&env);
    let token_admin = token::StellarAssetClient::new(&env, &token_id);
    token_admin.mint(&verifier, &MIN_STAKE_AMOUNT);
    
    client.register(&verifier);
    
    assert!(client.is_verifier(&verifier));
    let record = client.get_verifier(&verifier);
    assert_eq!(record.total_staked, MIN_STAKE_AMOUNT);
    
    let token_logic = token::Client::new(&env, &token_id);
    assert_eq!(token_logic.balance(&client.address), MIN_STAKE_AMOUNT);
}

#[test]
fn test_staking_and_slashing() {
    let env = Env::default();
    let (admin, token_id, client, _) = setup_test(&env);
    
    let verifier = fund_and_register(&env, &client, &token_id);
    let token_admin = token::StellarAssetClient::new(&env, &token_id);
    token_admin.mint(&verifier, &2000);
    
    client.stake(&verifier, &500);
    
    let mut record = client.get_verifier(&verifier);
    assert_eq!(record.total_staked, MIN_STAKE_AMOUNT + 500);
    
    client.slash(&admin, &verifier, &1000);
    record = client.get_verifier(&verifier);
    assert_eq!(record.total_staked, MIN_STAKE_AMOUNT - 500);
    assert_eq!(record.reputation_score, 90);
}

#[test]
fn test_unregister_after_cooldown() {
    let env = Env::default();
    let (_, token_id, client, _) = setup_test(&env);
    
    let verifier = fund_and_register(&env, &client, &token_id);
    
    // Jump past cooldown period
    env.ledger().set_timestamp(COOLDOWN_PERIOD_SECONDS + 1);
    
    let token_logic = token::Client::new(&env, &token_id);
    let balance_before = token_logic.balance(&verifier);
    
    client.unregister(&verifier);
    
    assert!(!client.is_verifier(&verifier));
    // Funds returned
    assert_eq!(token_logic.balance(&verifier), balance_before + MIN_STAKE_AMOUNT);
}

#[test]
fn test_unregister_before_cooldown_fails() {
    let env = Env::default();
    let (_, token_id, client, _) = setup_test(&env);
    
    let verifier = fund_and_register(&env, &client, &token_id);
    
    // No time jump - still in cooldown
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.unregister(&verifier);
    }));
    assert!(result.is_err());
}

#[test]
fn test_double_register_fails() {
    let env = Env::default();
    let (_, token_id, client, _) = setup_test(&env);
    
    let verifier = fund_and_register(&env, &client, &token_id);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.register(&verifier);
    }));
    assert!(result.is_err());
}

#[test]
fn test_slash_insufficient_stake_fails() {
    let env = Env::default();
    let (admin, token_id, client, _) = setup_test(&env);
    
    let verifier = fund_and_register(&env, &client, &token_id);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.slash(&admin, &verifier, &(MIN_STAKE_AMOUNT + 1));
    }));
    assert!(result.is_err());
}

#[test]
fn test_update_heartbeat() {
    let env = Env::default();
    let (_, token_id, client, _) = setup_test(&env);
    
    let verifier = fund_and_register(&env, &client, &token_id);

    env.ledger().set_timestamp(1000);
    client.update_heartbeat(&verifier);
    
    let record = client.get_verifier(&verifier);
    assert_eq!(record.last_heartbeat, 1000);
}

#[test]
fn test_slash_unauthorized_fails() {
    let env = Env::default();
    let (_, token_id, client, _) = setup_test(&env);
    
    let verifier = fund_and_register(&env, &client, &token_id);
    let fake_admin = Address::generate(&env);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.slash(&fake_admin, &verifier, &100);
    }));
    assert!(result.is_err());
}

#[test]
fn test_get_all_verifiers() {
    let env = Env::default();
    let (_, token_id, client, _) = setup_test(&env);

    let v1 = fund_and_register(&env, &client, &token_id);
    let v2 = fund_and_register(&env, &client, &token_id);
    
    let all = client.get_all_verifiers();
    assert_eq!(all.len(), 2);
}

#[test]
fn test_stake_zero_amount_fails() {
    let env = Env::default();
    let (_, token_id, client, _) = setup_test(&env);
    
    let verifier = fund_and_register(&env, &client, &token_id);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.stake(&verifier, &0);
    }));
    assert!(result.is_err());
}

#[test]
fn test_slash_zero_amount_fails() {
    let env = Env::default();
    let (admin, token_id, client, _) = setup_test(&env);
    
    let verifier = fund_and_register(&env, &client, &token_id);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.slash(&admin, &verifier, &0);
    }));
    assert!(result.is_err());
}

#[test]
fn test_get_nonexistent_verifier_fails() {
    let env = Env::default();
    let (_, _, client, _) = setup_test(&env);
    
    let nonexistent = Address::generate(&env);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.get_verifier(&nonexistent);
    }));
    assert!(result.is_err());
}

#[test]
fn test_register_with_insufficient_balance_fails() {
    let env = Env::default();
    let (_, token_id, client, _) = setup_test(&env);
    
    let verifier = Address::generate(&env);
    // Don't mint tokens - should fail with insufficient balance

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.register(&verifier);
    }));
    assert!(result.is_err());
}

#[test]
fn test_reputation_score_stays_at_zero() {
    let env = Env::default();
    let (admin, token_id, client, _) = setup_test(&env);
    
    let verifier = fund_and_register(&env, &client, &token_id);

    // Slash 10 times (100 -> 0), then try once more
    for _ in 0..10 {
        client.slash(&admin, &verifier, &1);
    }
    
    let record = client.get_verifier(&verifier);
    assert_eq!(record.reputation_score, 0);
    
    // One more slash shouldn't underflow
    let result = client.slash(&admin, &verifier, &1);
    assert!(result);
    
    let record = client.get_verifier(&verifier);
    assert_eq!(record.reputation_score, 0);
}

#[test]
fn test_stake_multiple_times() {
    let env = Env::default();
    let (_, token_id, client, _) = setup_test(&env);
    
    let verifier = fund_and_register(&env, &client, &token_id);
    let token_admin = token::StellarAssetClient::new(&env, &token_id);
    token_admin.mint(&verifier, &2000);
    
    client.stake(&verifier, &500);
    client.stake(&verifier, &1500);
    
    let record = client.get_verifier(&verifier);
    assert_eq!(record.total_staked, MIN_STAKE_AMOUNT + 2000);
}
