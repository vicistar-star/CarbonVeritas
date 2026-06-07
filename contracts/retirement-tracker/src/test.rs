#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, Env};
use carbonveritas_credit_registry::{CreditRegistry, CreditRegistryClient};
use carbonveritas_shared::credit_metadata::{CreditMetadata, CreditStatus};

fn setup_test(env: &Env) -> (Address, Address, RetirementTrackerClient<'static>, CreditRegistryClient<'static>) {
    env.mock_all_auths();
    let admin = Address::generate(env);
    
    let registry_id = env.register_contract(None, CreditRegistry);
    let registry_client = CreditRegistryClient::new(env, &registry_id);
    registry_client.init(&admin, &1, &1);

    let tracker_id = env.register_contract(None, RetirementTracker);
    let tracker_client = RetirementTrackerClient::new(env, &tracker_id);
    tracker_client.init(&admin, &registry_id);

    (admin, registry_id, tracker_client, registry_client)
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
fn test_retire_credit() {
    let env = Env::default();
    let (admin, _, tracker, registry) = setup_test(&env);
    let owner = Address::generate(&env);
    let verifier = Address::generate(&env);
    registry.add_verifier(&admin, &verifier);

    let metadata = create_metadata(&env);
    let credit_id = registry.submit_credit(&owner, &metadata, &String::from_str(&env, "ipfs://hash"));
    registry.approve_and_mint(&verifier, &credit_id, &String::from_str(&env, "ok"));

    tracker.retire(
        &owner,
        &credit_id,
        &String::from_str(&env, "Offset"),
        &String::from_str(&env, "Acme Corp"),
        &String::from_str(&env, "2024"),
    );

    assert!(tracker.is_retired(&credit_id));
    let record = tracker.get_retirement_record(&credit_id).unwrap();
    assert_eq!(record.beneficiary, String::from_str(&env, "Acme Corp"));
    
    let credit = registry.get_credit(&credit_id);
    assert_eq!(credit.status, CreditStatus::Retired);
}

#[test]
#[should_panic]
fn test_retire_unauthorized() {
    let env = Env::default();
    let (admin, _, tracker, registry) = setup_test(&env);
    let owner = Address::generate(&env);
    let malicious = Address::generate(&env);
    let verifier = Address::generate(&env);
    registry.add_verifier(&admin, &verifier);

    let metadata = create_metadata(&env);
    let credit_id = registry.submit_credit(&owner, &metadata, &String::from_str(&env, "ipfs://hash"));
    registry.approve_and_mint(&verifier, &credit_id, &String::from_str(&env, "ok"));

    tracker.retire(
        &malicious,
        &credit_id,
        &String::from_str(&env, "Offset"),
        &String::from_str(&env, "Acme Corp"),
        &String::from_str(&env, "2024"),
    );
}
