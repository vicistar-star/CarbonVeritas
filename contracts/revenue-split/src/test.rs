#![cfg(test)]

extern crate std;

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{vec, Address, Env, token};

fn setup_test(env: &Env) -> (Address, Address, RevenueSplitClient<'static>, Address) {
    env.mock_all_auths();
    let admin = Address::generate(env);
    let fee_addr = Address::generate(env);
    let token_id = env.register_stellar_asset_contract_v2(Address::generate(env));
    let token_address = token_id.address();

    let contract_id = env.register_contract(None, RevenueSplit);
    let client = RevenueSplitClient::new(env, &contract_id);
    client.init(&admin, &fee_addr);

    (admin, fee_addr, client, token_address)
}

#[test]
fn test_revenue_distribution() {
    let env = Env::default();
    let (admin, fee_addr, client, token_id) = setup_test(&env);
    
    let project_id = String::from_str(&env, "PRJ-001");
    let beneficiary1 = Address::generate(&env);
    let beneficiary2 = Address::generate(&env);
    
    let beneficiaries = vec![&env, 
        (beneficiary1.clone(), 6000),
        (beneficiary2.clone(), 4000),
    ];
    
    client.configure(&admin, &project_id, &beneficiaries);
    
    let payer = Address::generate(&env);
    let token_admin = token::StellarAssetClient::new(&env, &token_id);
    token_admin.mint(&payer, &10_000);
    
    // Total 10,000. Protocol fee 50 bps = 50. Net = 9950.
    // B1: 9950 * 0.6 = 5970
    // B2: 9950 * 0.4 = 3980
    client.distribute(&payer, &project_id, &token_id, &10_000);
    
    let token_logic = token::Client::new(&env, &token_id);
    assert_eq!(token_logic.balance(&fee_addr), 50);
    assert_eq!(token_logic.balance(&beneficiary1), 5970);
    assert_eq!(token_logic.balance(&beneficiary2), 3980);
}

#[test]
fn test_configure_invalid_bps_fails() {
    let env = Env::default();
    let (admin, _, client, _token_id) = setup_test(&env);
    
    let project_id = String::from_str(&env, "PRJ-001");
    let beneficiary1 = Address::generate(&env);
    
    let beneficiaries = vec![&env, 
        (beneficiary1.clone(), 5000),
    ];
    
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.configure(&admin, &project_id, &beneficiaries);
    }));
    assert!(result.is_err());
}

#[test]
fn test_configure_empty_beneficiaries_fails() {
    let env = Env::default();
    let (admin, _, client, _token_id) = setup_test(&env);
    
    let project_id = String::from_str(&env, "PRJ-001");
    let beneficiaries = vec![&env];
    
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.configure(&admin, &project_id, &beneficiaries);
    }));
    assert!(result.is_err());
}

#[test]
fn test_configure_unauthorized_fails() {
    let env = Env::default();
    let (_, _, client, _token_id) = setup_test(&env);
    
    let project_id = String::from_str(&env, "PRJ-001");
    let beneficiary = Address::generate(&env);
    let fake_admin = Address::generate(&env);
    
    let beneficiaries = vec![&env, 
        (beneficiary, 10000),
    ];
    
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.configure(&fake_admin, &project_id, &beneficiaries);
    }));
    assert!(result.is_err());
}

#[test]
fn test_distribute_no_fee() {
    let env = Env::default();
    let (admin, _fee_addr, client, token_id) = setup_test(&env);
    
    let project_id = String::from_str(&env, "PRJ-001");
    let beneficiary = Address::generate(&env);
    
    let beneficiaries = vec![&env, 
        (beneficiary.clone(), 10000),
    ];
    
    client.configure(&admin, &project_id, &beneficiaries);
    
    let payer = Address::generate(&env);
    let token_admin = token::StellarAssetClient::new(&env, &token_id);
    token_admin.mint(&payer, &100);
    
    // With only 100 units and 50 bps fee = 0 (integer truncation)
    client.distribute(&payer, &project_id, &token_id, &100);
    
    let token_logic = token::Client::new(&env, &token_id);
    assert_eq!(token_logic.balance(&beneficiary), 100);
}

#[test]
fn test_get_config() {
    let env = Env::default();
    let (admin, _, client, _token_id) = setup_test(&env);
    
    let project_id = String::from_str(&env, "PRJ-001");
    let beneficiary1 = Address::generate(&env);
    let beneficiary2 = Address::generate(&env);
    
    let beneficiaries = vec![&env, 
        (beneficiary1.clone(), 6000),
        (beneficiary2.clone(), 4000),
    ];
    
    client.configure(&admin, &project_id, &beneficiaries.clone());
    
    let config = client.get_config(&project_id);
    assert_eq!(config.project_id, project_id);
    assert_eq!(config.beneficiaries.len(), 2);
}

#[test]
fn test_distribute_unconfigured_project_fails() {
    let env = Env::default();
    let (_, _, client, token_id) = setup_test(&env);
    
    let project_id = String::from_str(&env, "UNKNOWN");
    let payer = Address::generate(&env);
    let token_admin = token::StellarAssetClient::new(&env, &token_id);
    token_admin.mint(&payer, &10_000);
    
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.distribute(&payer, &project_id, &token_id, &10_000);
    }));
    assert!(result.is_err());
}

#[test]
fn test_multiple_projects() {
    let env = Env::default();
    let (admin, fee_addr, client, token_id) = setup_test(&env);
    
    let project_a = String::from_str(&env, "PRJ-A");
    let project_b = String::from_str(&env, "PRJ-B");
    
    let ben_a = Address::generate(&env);
    let ben_b = Address::generate(&env);
    
    client.configure(&admin, &project_a, &vec![&env, (ben_a.clone(), 10000)]);
    client.configure(&admin, &project_b, &vec![&env, (ben_b.clone(), 10000)]);
    
    let payer = Address::generate(&env);
    let token_admin = token::StellarAssetClient::new(&env, &token_id);
    token_admin.mint(&payer, &20_000);
    
    client.distribute(&payer, &project_a, &token_id, &10_000);
    client.distribute(&payer, &project_b, &token_id, &10_000);
    
    let token_logic = token::Client::new(&env, &token_id);
    // Each distribution: fee = 50, beneficiary gets 9950
    assert_eq!(token_logic.balance(&ben_a), 9950);
    assert_eq!(token_logic.balance(&ben_b), 9950);
}

#[test]
fn test_overflow_protection() {
    let env = Env::default();
    let (admin, _, client, token_id) = setup_test(&env);
    
    let project_id = String::from_str(&env, "PRJ-001");
    let beneficiaries = vec![&env, 
        (Address::generate(&env), 3000),
        (Address::generate(&env), 3000),
        (Address::generate(&env), 4000),
    ];
    
    client.configure(&admin, &project_id, &beneficiaries);
    
    let payer = Address::generate(&env);
    let token_admin = token::StellarAssetClient::new(&env, &token_id);
    token_admin.mint(&payer, &1_000_000_000);
    
    // Should not overflow with large amounts
    let result = client.distribute(&payer, &project_id, &token_id, &1_000_000_000);
    assert!(result);
}
