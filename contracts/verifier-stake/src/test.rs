#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address as _;
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
    
    let verifier = Address::generate(&env);
    let token_admin = token::StellarAssetClient::new(&env, &token_id);
    token_admin.mint(&verifier, &(MIN_STAKE_AMOUNT + 500));
    
    client.register(&verifier);
    client.stake(&verifier, &500);
    
    let mut record = client.get_verifier(&verifier);
    assert_eq!(record.total_staked, MIN_STAKE_AMOUNT + 500);
    
    client.slash(&admin, &verifier, &1000);
    record = client.get_verifier(&verifier);
    assert_eq!(record.total_staked, MIN_STAKE_AMOUNT - 500);
    assert_eq!(record.reputation_score, 90);
}
