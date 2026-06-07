#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, Env};

fn setup_test(env: &Env) -> (Address, CreditRegistryClient<'static>) {
    env.mock_all_auths();
    let contract_id = env.register_contract(None, CreditRegistry);
    let client = CreditRegistryClient::new(env, &contract_id);
    let admin = Address::generate(env);
    client.init(&admin, &2, &3); // 2-of-3 threshold
    (admin, client)
}

fn create_metadata(env: &Env) -> CreditMetadata {
    CreditMetadata {
        project_id: String::from_str(env, "PRJ-001"),
        methodology: String::from_str(env, "VCS-VM0007"),
        vintage_start: 1704067200,
        vintage_end: 1735689600,
        tonnes: 1000,
        geography: String::from_str(env, "BR"),
        serial_prefix: String::from_str(env, "VCS-123"),
        sdg_flags: 0,
        permanence_rating: 100,
        buffer_contribution_pct: 10,
        additionality_type: 1,
        ipfs_hash: String::from_str(env, "bafy..."),
        status: CreditStatus::Pending,
        created_at: 0,
        token_id: BytesN::from_array(env, &[0u8; 32]),
    }
}

#[test]
fn test_init() {
    let env = Env::default();
    let (_, _client) = setup_test(&env);
}

#[test]
fn test_submit_credit() {
    let env = Env::default();
    let (_, client) = setup_test(&env);
    let issuer = Address::generate(&env);
    let metadata = create_metadata(&env);

    let credit_id = client.submit_credit(&issuer, &metadata, &String::from_str(&env, "ipfs://hash"));
    assert_eq!(credit_id, 1);

    let saved = client.get_credit(&credit_id);
    assert_eq!(saved.project_id, String::from_str(&env, "PRJ-001"));
    assert_eq!(saved.status, CreditStatus::Pending);
    assert_eq!(client.get_owner(&credit_id), issuer);
}

#[test]
fn test_approval_workflow() {
    let env = Env::default();
    let (admin, client) = setup_test(&env);
    let issuer = Address::generate(&env);
    let metadata = create_metadata(&env);

    let verifier1 = Address::generate(&env);
    let verifier2 = Address::generate(&env);
    let verifier3 = Address::generate(&env);

    client.add_verifier(&admin, &verifier1);
    client.add_verifier(&admin, &verifier2);
    client.add_verifier(&admin, &verifier3);

    let credit_id = client.submit_credit(&issuer, &metadata, &String::from_str(&env, "ipfs://hash"));

    // First approval
    client.approve_and_mint(&verifier1, &credit_id, &String::from_str(&env, "Looks good"));
    let saved = client.get_credit(&credit_id);
    assert_eq!(saved.status, CreditStatus::Pending);

    // Second approval - should mint
    client.approve_and_mint(&verifier2, &credit_id, &String::from_str(&env, "Verified"));
    let saved = client.get_credit(&credit_id);
    assert_eq!(saved.status, CreditStatus::Active);
    assert_ne!(saved.token_id, BytesN::from_array(&env, &[0u8; 32]));
}

#[test]
fn test_rejection_workflow() {
    let env = Env::default();
    let (admin, client) = setup_test(&env);
    let issuer = Address::generate(&env);
    let metadata = create_metadata(&env);

    let verifier1 = Address::generate(&env);
    let verifier2 = Address::generate(&env);

    client.add_verifier(&admin, &verifier1);
    client.add_verifier(&admin, &verifier2);

    let credit_id = client.submit_credit(&issuer, &metadata, &String::from_str(&env, "ipfs://hash"));

    // Quorum is 3, threshold is 2. Need 2 rejections to fail (3-2 + 1 = 2)
    client.reject_credit(&verifier1, &credit_id, &String::from_str(&env, "Incomplete MRV"));
    let saved = client.get_credit(&credit_id);
    assert_eq!(saved.status, CreditStatus::Pending);

    client.reject_credit(&verifier2, &credit_id, &String::from_str(&env, "Bad data"));
    let saved = client.get_credit(&credit_id);
    assert_eq!(saved.status, CreditStatus::Rejected);
}

#[test]
fn test_transfer_credit() {
    let env = Env::default();
    let (admin, client) = setup_test(&env);
    let issuer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let metadata = create_metadata(&env);

    let verifier1 = Address::generate(&env);
    let verifier2 = Address::generate(&env);
    client.add_verifier(&admin, &verifier1);
    client.add_verifier(&admin, &verifier2);

    let credit_id = client.submit_credit(&issuer, &metadata, &String::from_str(&env, "ipfs://hash"));
    client.approve_and_mint(&verifier1, &credit_id, &String::from_str(&env, "ok"));
    client.approve_and_mint(&verifier2, &credit_id, &String::from_str(&env, "ok"));

    client.transfer_credit(&issuer, &receiver, &credit_id);
    assert_eq!(client.get_owner(&credit_id), receiver);
}

#[test]
#[should_panic(expected = "Error(Contract, #205)")] // CreditNotOwned
fn test_unauthorized_transfer() {
    let env = Env::default();
    let (admin, client) = setup_test(&env);
    let issuer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let malicious = Address::generate(&env);
    let metadata = create_metadata(&env);

    let verifier1 = Address::generate(&env);
    let verifier2 = Address::generate(&env);
    client.add_verifier(&admin, &verifier1);
    client.add_verifier(&admin, &verifier2);

    let credit_id = client.submit_credit(&issuer, &metadata, &String::from_str(&env, "ipfs://hash"));
    client.approve_and_mint(&verifier1, &credit_id, &String::from_str(&env, "ok"));
    client.approve_and_mint(&verifier2, &credit_id, &String::from_str(&env, "ok"));

    client.transfer_credit(&malicious, &receiver, &credit_id);
}
