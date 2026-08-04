#![cfg(test)]

extern crate std;

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, BytesN, Env, String, Vec};

fn setup_test(env: &Env) -> (Address, CreditRegistryClient<'static>) {
    env.mock_all_auths();
    let contract_id = env.register_contract(None, CreditRegistry);
    let client = CreditRegistryClient::new(env, &contract_id);
    let admin = Address::generate(env);
    client.init(&admin, &2, &3);
    (admin, client)
}

fn setup_single_verifier(env: &Env) -> (Address, CreditRegistryClient<'static>) {
    env.mock_all_auths();
    let contract_id = env.register_contract(None, CreditRegistry);
    let client = CreditRegistryClient::new(env, &contract_id);
    let admin = Address::generate(env);
    client.init(&admin, &1, &1);
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

fn add_verifiers(env: &Env, client: &CreditRegistryClient<'static>, admin: &Address, count: u32) -> Vec<Address> {
    let mut verifiers = Vec::new(env);
    for i in 0..count {
        let v = Address::generate(env);
        client.add_verifier(admin, &v);
        verifiers.push_back(v);
    }
    verifiers
}

#[test]
fn test_init() {
    let env = Env::default();
    let (_, _client) = setup_test(&env);
}

#[test]
fn test_init_invalid_params() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, CreditRegistry);
    let client = CreditRegistryClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    // threshold = 0 should panic
    let env2 = Env::default();
    env2.mock_all_auths();
    let contract_id2 = env2.register_contract(None, CreditRegistry);
    let client2 = CreditRegistryClient::new(&env2, &contract_id2);
    let admin2 = Address::generate(&env2);
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client2.init(&admin2, &0, &3);
    }));
    assert!(result.is_err());

    // threshold > quorum should panic
    let env3 = Env::default();
    env3.mock_all_auths();
    let contract_id3 = env3.register_contract(None, CreditRegistry);
    let client3 = CreditRegistryClient::new(&env3, &contract_id3);
    let admin3 = Address::generate(&env3);
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client3.init(&admin3, &5, &3);
    }));
    assert!(result.is_err());
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
fn test_submit_credit_invalid_metadata_empty_project() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, CreditRegistry);
    let client = CreditRegistryClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    client.init(&admin, &1, &1);

    let issuer = Address::generate(&env);
    let mut metadata = create_metadata(&env);
    metadata.project_id = String::from_str(&env, "");

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.submit_credit(&issuer, &metadata, &String::from_str(&env, "ipfs://hash"));
    }));
    assert!(result.is_err());
}

#[test]
fn test_submit_credit_invalid_metadata_bad_geography() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, CreditRegistry);
    let client = CreditRegistryClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    client.init(&admin, &1, &1);

    let issuer = Address::generate(&env);
    let mut metadata = create_metadata(&env);
    metadata.geography = String::from_str(&env, "BRA");

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.submit_credit(&issuer, &metadata, &String::from_str(&env, "ipfs://hash"));
    }));
    assert!(result.is_err());
}

#[test]
fn test_submit_credit_invalid_tonnes() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, CreditRegistry);
    let client = CreditRegistryClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    client.init(&admin, &1, &1);

    let issuer = Address::generate(&env);
    let mut metadata = create_metadata(&env);
    metadata.tonnes = 0;

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.submit_credit(&issuer, &metadata, &String::from_str(&env, "ipfs://hash"));
    }));
    assert!(result.is_err());
}

#[test]
fn test_approval_workflow_1_of_1() {
    let env = Env::default();
    let (admin, client) = setup_single_verifier(&env);
    let issuer = Address::generate(&env);
    let metadata = create_metadata(&env);

    let verifier1 = Address::generate(&env);
    client.add_verifier(&admin, &verifier1);

    let credit_id = client.submit_credit(&issuer, &metadata, &String::from_str(&env, "ipfs://hash"));

    let result = client.approve_and_mint(&verifier1, &credit_id, &String::from_str(&env, "Looks good"));
    assert!(result.is_some());

    let saved = client.get_credit(&credit_id);
    assert_eq!(saved.status, CreditStatus::Active);
    assert_ne!(saved.token_id, BytesN::from_array(&env, &[0u8; 32]));
}

#[test]
fn test_approval_workflow_2_of_3() {
    let env = Env::default();
    let (admin, client) = setup_test(&env);
    let issuer = Address::generate(&env);
    let metadata = create_metadata(&env);

    let verifiers = add_verifiers(&env, &client, &admin, 3);
    let verifier1 = verifiers.get(0).unwrap();
    let verifier2 = verifiers.get(1).unwrap();

    let credit_id = client.submit_credit(&issuer, &metadata, &String::from_str(&env, "ipfs://hash"));

    let result = client.approve_and_mint(&verifier1, &credit_id, &String::from_str(&env, "Looks good"));
    assert!(result.is_none());
    let saved = client.get_credit(&credit_id);
    assert_eq!(saved.status, CreditStatus::Pending);

    let result = client.approve_and_mint(&verifier2, &credit_id, &String::from_str(&env, "Verified"));
    assert!(result.is_some());
    let saved = client.get_credit(&credit_id);
    assert_eq!(saved.status, CreditStatus::Active);
}

#[test]
fn test_duplicate_approval_rejected() {
    let env = Env::default();
    let (admin, client) = setup_single_verifier(&env);
    let issuer = Address::generate(&env);
    let metadata = create_metadata(&env);

    let verifier1 = Address::generate(&env);
    client.add_verifier(&admin, &verifier1);

    let credit_id = client.submit_credit(&issuer, &metadata, &String::from_str(&env, "ipfs://hash"));
    client.approve_and_mint(&verifier1, &credit_id, &String::from_str(&env, "ok"));

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.approve_and_mint(&verifier1, &credit_id, &String::from_str(&env, "again"));
    }));
    assert!(result.is_err());
}

#[test]
fn test_rejection_workflow() {
    let env = Env::default();
    let (admin, client) = setup_test(&env);
    let issuer = Address::generate(&env);
    let metadata = create_metadata(&env);

    let verifiers = add_verifiers(&env, &client, &admin, 2);

    let credit_id = client.submit_credit(&issuer, &metadata, &String::from_str(&env, "ipfs://hash"));

    let v1 = verifiers.get(0).unwrap();
    let v2 = verifiers.get(1).unwrap();

    client.reject_credit(&v1, &credit_id, &String::from_str(&env, "Incomplete MRV"));
    let saved = client.get_credit(&credit_id);
    assert_eq!(saved.status, CreditStatus::Pending);

    client.reject_credit(&v2, &credit_id, &String::from_str(&env, "Bad data"));
    let saved = client.get_credit(&credit_id);
    assert_eq!(saved.status, CreditStatus::Rejected);
}

#[test]
fn test_approve_after_rejection_impossible() {
    let env = Env::default();
    let (admin, client) = setup_test(&env);
    let issuer = Address::generate(&env);
    let metadata = create_metadata(&env);

    let verifiers = add_verifiers(&env, &client, &admin, 3);
    let v1 = verifiers.get(0).unwrap();
    let v2 = verifiers.get(1).unwrap();
    let v3 = verifiers.get(2).unwrap();

    let credit_id = client.submit_credit(&issuer, &metadata, &String::from_str(&env, "ipfs://hash"));

    // With quorum=3, threshold=2, need 2 rejections to reject (rejections > 3-2 = 1)
    client.reject_credit(&v1, &credit_id, &String::from_str(&env, "Bad"));
    client.reject_credit(&v2, &credit_id, &String::from_str(&env, "Really bad"));
    let saved = client.get_credit(&credit_id);
    assert_eq!(saved.status, CreditStatus::Rejected);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.approve_and_mint(&v3, &credit_id, &String::from_str(&env, "Actually ok"));
    }));
    assert!(result.is_err());
}

#[test]
fn test_transfer_credit() {
    let env = Env::default();
    let (admin, client) = setup_single_verifier(&env);
    let issuer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let metadata = create_metadata(&env);

    let verifier1 = Address::generate(&env);
    client.add_verifier(&admin, &verifier1);

    let credit_id = client.submit_credit(&issuer, &metadata, &String::from_str(&env, "ipfs://hash"));
    client.approve_and_mint(&verifier1, &credit_id, &String::from_str(&env, "ok"));

    client.transfer_credit(&issuer, &receiver, &credit_id);
    assert_eq!(client.get_owner(&credit_id), receiver);
}

#[test]
#[should_panic(expected = "Error(Contract, #205)")]
fn test_unauthorized_transfer() {
    let env = Env::default();
    let (admin, client) = setup_single_verifier(&env);
    let issuer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let malicious = Address::generate(&env);
    let metadata = create_metadata(&env);

    let verifier1 = Address::generate(&env);
    client.add_verifier(&admin, &verifier1);

    let credit_id = client.submit_credit(&issuer, &metadata, &String::from_str(&env, "ipfs://hash"));
    client.approve_and_mint(&verifier1, &credit_id, &String::from_str(&env, "ok"));

    client.transfer_credit(&malicious, &receiver, &credit_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #202)")]
fn test_transfer_pending_credit_fails() {
    let env = Env::default();
    let (_, client) = setup_test(&env);
    let issuer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let metadata = create_metadata(&env);

    let credit_id = client.submit_credit(&issuer, &metadata, &String::from_str(&env, "ipfs://hash"));

    client.transfer_credit(&issuer, &receiver, &credit_id);
}

#[test]
fn test_get_provenance() {
    let env = Env::default();
    let (admin, client) = setup_single_verifier(&env);
    let issuer = Address::generate(&env);
    let metadata = create_metadata(&env);

    let verifier1 = Address::generate(&env);
    client.add_verifier(&admin, &verifier1);

    let credit_id = client.submit_credit(&issuer, &metadata, &String::from_str(&env, "ipfs://hash"));
    client.approve_and_mint(&verifier1, &credit_id, &String::from_str(&env, "ok"));

    let provenance = client.get_provenance(&credit_id);
    assert_eq!(provenance.len(), 1);
    assert_eq!(provenance.get(0).unwrap().verifier, verifier1);
    assert!(provenance.get(0).unwrap().approved);
}

#[test]
fn test_credits_by_issuer() {
    let env = Env::default();
    let (_, client) = setup_test(&env);
    let issuer = Address::generate(&env);
    let metadata = create_metadata(&env);

    let id1 = client.submit_credit(&issuer, &metadata, &String::from_str(&env, "ipfs://1"));
    let id2 = client.submit_credit(&issuer, &metadata, &String::from_str(&env, "ipfs://2"));

    let credits = client.get_credits_by_issuer(&issuer, &0, &10);
    assert_eq!(credits.len(), 2);
    assert_eq!(credits.get(0).unwrap(), id1);
    assert_eq!(credits.get(1).unwrap(), id2);
}

#[test]
fn test_credits_by_owner() {
    let env = Env::default();
    let (_, client) = setup_test(&env);
    let issuer = Address::generate(&env);
    let metadata = create_metadata(&env);

    let id1 = client.submit_credit(&issuer, &metadata, &String::from_str(&env, "ipfs://1"));
    let id2 = client.submit_credit(&issuer, &metadata, &String::from_str(&env, "ipfs://2"));

    let credits = client.get_credits_by_owner(&issuer);
    assert_eq!(credits.len(), 2);
}

#[test]
fn test_add_remove_verifier() {
    let env = Env::default();
    let (admin, client) = setup_single_verifier(&env);
    let verifier = Address::generate(&env);

    client.add_verifier(&admin, &verifier);
    // Verify by approving a credit
    let issuer = Address::generate(&env);
    let metadata = create_metadata(&env);
    let credit_id = client.submit_credit(&issuer, &metadata, &String::from_str(&env, "ipfs://hash"));
    client.approve_and_mint(&verifier, &credit_id, &String::from_str(&env, "ok"));

    client.remove_verifier(&admin, &verifier);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.approve_and_mint(&verifier, &credit_id, &String::from_str(&env, "again"));
    }));
    assert!(result.is_err());
}

#[test]
fn test_add_verifier_duplicate() {
    let env = Env::default();
    let (admin, client) = setup_single_verifier(&env);
    let verifier = Address::generate(&env);

    client.add_verifier(&admin, &verifier);
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.add_verifier(&admin, &verifier);
    }));
    assert!(result.is_err());
}

#[test]
fn test_remove_nonexistent_verifier() {
    let env = Env::default();
    let (admin, client) = setup_single_verifier(&env);
    let verifier = Address::generate(&env);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.remove_verifier(&admin, &verifier);
    }));
    assert!(result.is_err());
}

#[test]
fn test_mint_bridged() {
    let env = Env::default();
    let (admin, client) = setup_single_verifier(&env);
    let bridge = Address::generate(&env);
    let recipient = Address::generate(&env);

    client.add_bridge(&admin, &bridge);

    let metadata = create_metadata(&env);
    let credit_id = client.mint_bridged(&bridge, &recipient, &metadata);

    assert_eq!(credit_id, 1);
    assert_eq!(client.get_owner(&credit_id), recipient);
    let saved = client.get_credit(&credit_id);
    assert_eq!(saved.status, CreditStatus::Active);
}

#[test]
fn test_unauthorized_bridge() {
    let env = Env::default();
    let (_, client) = setup_single_verifier(&env);
    let fake_bridge = Address::generate(&env);
    let recipient = Address::generate(&env);
    let metadata = create_metadata(&env);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.mint_bridged(&fake_bridge, &recipient, &metadata);
    }));
    assert!(result.is_err());
}

#[test]
fn test_add_remove_bridge() {
    let env = Env::default();
    let (admin, client) = setup_single_verifier(&env);
    let bridge = Address::generate(&env);

    client.add_bridge(&admin, &bridge);

    let recipient = Address::generate(&env);
    let metadata = create_metadata(&env);
    let credit_id = client.mint_bridged(&bridge, &recipient, &metadata);
    assert_eq!(credit_id, 1);

    client.remove_bridge(&admin, &bridge);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.mint_bridged(&bridge, &recipient, &metadata);
    }));
    assert!(result.is_err());
}

#[test]
fn test_approve_non_verifier_fails() {
    let env = Env::default();
    let (_, client) = setup_single_verifier(&env);
    let issuer = Address::generate(&env);
    let metadata = create_metadata(&env);
    let non_verifier = Address::generate(&env);

    let credit_id = client.submit_credit(&issuer, &metadata, &String::from_str(&env, "ipfs://hash"));

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.approve_and_mint(&non_verifier, &credit_id, &String::from_str(&env, "no"));
    }));
    assert!(result.is_err());
}

#[test]
fn test_approve_nonexistent_credit() {
    let env = Env::default();
    let (admin, client) = setup_single_verifier(&env);
    let verifier = Address::generate(&env);
    client.add_verifier(&admin, &verifier);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.approve_and_mint(&verifier, &999, &String::from_str(&env, "no"));
    }));
    assert!(result.is_err());
}

#[test]
fn test_mark_retired() {
    let env = Env::default();
    let (admin, client) = setup_single_verifier(&env);
    let issuer = Address::generate(&env);
    let metadata = create_metadata(&env);

    let verifier = Address::generate(&env);
    client.add_verifier(&admin, &verifier);

    let retirer = Address::generate(&env);
    client.add_retirer(&admin, &retirer);

    let credit_id = client.submit_credit(&issuer, &metadata, &String::from_str(&env, "ipfs://hash"));
    client.approve_and_mint(&verifier, &credit_id, &String::from_str(&env, "ok"));

    client.mark_retired(&retirer, &credit_id);
    assert_eq!(client.get_credit(&credit_id).status, CreditStatus::Retired);
}

#[test]
fn test_mark_retired_unauthorized() {
    let env = Env::default();
    let (admin, client) = setup_single_verifier(&env);
    let issuer = Address::generate(&env);
    let metadata = create_metadata(&env);

    let verifier = Address::generate(&env);
    client.add_verifier(&admin, &verifier);

    let credit_id = client.submit_credit(&issuer, &metadata, &String::from_str(&env, "ipfs://hash"));
    client.approve_and_mint(&verifier, &credit_id, &String::from_str(&env, "ok"));

    let attacker = Address::generate(&env);
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.mark_retired(&attacker, &credit_id);
    }));
    assert!(result.is_err());
    assert_eq!(client.get_credit(&credit_id).status, CreditStatus::Active);
}

#[test]
fn test_remove_retirer_revokes_access() {
    let env = Env::default();
    let (admin, client) = setup_single_verifier(&env);
    let issuer = Address::generate(&env);
    let metadata = create_metadata(&env);

    let verifier = Address::generate(&env);
    client.add_verifier(&admin, &verifier);

    let retirer = Address::generate(&env);
    client.add_retirer(&admin, &retirer);
    client.remove_retirer(&admin, &retirer);

    let credit_id = client.submit_credit(&issuer, &metadata, &String::from_str(&env, "ipfs://hash"));
    client.approve_and_mint(&verifier, &credit_id, &String::from_str(&env, "ok"));

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.mark_retired(&retirer, &credit_id);
    }));
    assert!(result.is_err());
    assert_eq!(client.get_credit(&credit_id).status, CreditStatus::Active);
}

#[test]
#[should_panic(expected = "Error(Contract, #202)")]
fn test_mark_retired_non_active() {
    let env = Env::default();
    let (admin, client) = setup_test(&env);
    let issuer = Address::generate(&env);
    let metadata = create_metadata(&env);

    let retirer = Address::generate(&env);
    client.add_retirer(&admin, &retirer);

    let credit_id = client.submit_credit(&issuer, &metadata, &String::from_str(&env, "ipfs://hash"));
    client.mark_retired(&retirer, &credit_id);
}

#[test]
fn test_credits_by_issuer_pagination() {
    let env = Env::default();
    let (_, client) = setup_test(&env);
    let issuer = Address::generate(&env);
    let metadata = create_metadata(&env);

    for i in 0..5 {
        client.submit_credit(&issuer, &metadata, &String::from_str(&env, "ipfs://hash"));
    }

    let page1 = client.get_credits_by_issuer(&issuer, &0, &2);
    assert_eq!(page1.len(), 2);

    let page2 = client.get_credits_by_issuer(&issuer, &2, &2);
    assert_eq!(page2.len(), 2);

    let page3 = client.get_credits_by_issuer(&issuer, &4, &2);
    assert_eq!(page3.len(), 1);
}

#[test]
fn test_reject_already_rejected() {
    let env = Env::default();
    let (admin, client) = setup_single_verifier(&env);
    let issuer = Address::generate(&env);
    let metadata = create_metadata(&env);

    let verifier = Address::generate(&env);
    let verifier2 = Address::generate(&env);
    client.add_verifier(&admin, &verifier);
    client.add_verifier(&admin, &verifier2);

    let credit_id = client.submit_credit(&issuer, &metadata, &String::from_str(&env, "ipfs://hash"));
    client.reject_credit(&verifier, &credit_id, &String::from_str(&env, "Bad"));
    // With 1-of-1, one rejection is enough to reject
    assert_eq!(client.get_credit(&credit_id).status, CreditStatus::Rejected);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.reject_credit(&verifier2, &credit_id, &String::from_str(&env, "Also bad"));
    }));
    assert!(result.is_err());
}

#[test]
fn test_credit_counter_increments() {
    let env = Env::default();
    let (_, client) = setup_test(&env);
    let issuer = Address::generate(&env);
    let metadata = create_metadata(&env);

    let id1 = client.submit_credit(&issuer, &metadata, &String::from_str(&env, "ipfs://1"));
    let id2 = client.submit_credit(&issuer, &metadata, &String::from_str(&env, "ipfs://2"));
    let id3 = client.submit_credit(&issuer, &metadata, &String::from_str(&env, "ipfs://3"));

    assert_eq!(id1, 1);
    assert_eq!(id2, 2);
    assert_eq!(id3, 3);
}

#[test]
fn test_get_config_defaults() {
    let env = Env::default();
    let (admin, client) = setup_test(&env);

    let config = client.get_config();
    assert_eq!(config.admin, admin);
    assert_eq!(config.verifier_threshold, 2);
    assert_eq!(config.verifier_quorum, 3);
    assert_eq!(config.approval_window, 604_800);
    assert_eq!(config.protocol_fee_bps, 50);
    assert_eq!(config.buffer_pool_pct, 10);
}

#[test]
fn test_update_config() {
    let env = Env::default();
    let (admin, client) = setup_test(&env);

    let ok = client.update_config(&admin, &3, &5, &86400, &100, &20);
    assert!(ok);

    let config = client.get_config();
    assert_eq!(config.verifier_threshold, 3);
    assert_eq!(config.verifier_quorum, 5);
    assert_eq!(config.approval_window, 86400);
    assert_eq!(config.protocol_fee_bps, 100);
    assert_eq!(config.buffer_pool_pct, 20);
}

#[test]
fn test_update_config_unauthorized() {
    let env = Env::default();
    let (_, client) = setup_test(&env);

    let attacker = Address::generate(&env);
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.update_config(&attacker, &3, &5, &86400, &100, &20);
    }));
    assert!(result.is_err());

    let config = client.get_config();
    assert_eq!(config.verifier_threshold, 2);
}

#[test]
fn test_update_config_invalid_bounds() {
    let env = Env::default();
    let (admin, client) = setup_test(&env);

    // Threshold cannot exceed quorum
    let r1 = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.update_config(&admin, &5, &3, &86400, &100, &20);
    }));
    assert!(r1.is_err());

    // Quorum cannot exceed MAX_VERIFIERS
    let r2 = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.update_config(&admin, &1, &21, &86400, &100, &20);
    }));
    assert!(r2.is_err());

    // Approval window too small
    let r3 = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.update_config(&admin, &2, &3, &60, &100, &20);
    }));
    assert!(r3.is_err());

    // Fee too high
    let r4 = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.update_config(&admin, &2, &3, &86400, &1001, &20);
    }));
    assert!(r4.is_err());

    // Buffer pool too high
    let r5 = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.update_config(&admin, &2, &3, &86400, &100, &51);
    }));
    assert!(r5.is_err());

    let config = client.get_config();
    assert_eq!(config.verifier_threshold, 2);
    assert_eq!(config.verifier_quorum, 3);
}
