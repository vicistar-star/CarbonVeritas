#![cfg(test)]

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
        (beneficiary1.clone(), 6000), // 60%
        (beneficiary2.clone(), 4000)  // 40%
    ];
    
    client.configure(&admin, &project_id, &beneficiaries);
    
    let payer = Address::generate(&env);
    let token_admin = token::StellarAssetClient::new(&env, &token_id);
    token_admin.mint(&payer, &10_000);
    
    // Total 10,000. Protocol fee 0.5% (50 bps) = 50. Net = 9950.
    // B1: 9950 * 0.6 = 5970
    // B2: 9950 * 0.4 = 3980
    client.distribute(&payer, &project_id, &token_id, &10_000);
    
    let token_logic = token::Client::new(&env, &token_id);
    assert_eq!(token_logic.balance(&fee_addr), 50);
    assert_eq!(token_logic.balance(&beneficiary1), 5970);
    assert_eq!(token_logic.balance(&beneficiary2), 3980);
}
