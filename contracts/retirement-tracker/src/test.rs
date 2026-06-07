#![cfg(test)]

extern crate std;

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{vec, Address, BytesN, Env, String};
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

fn create_active_credit(
    env: &Env,
    registry: &CreditRegistryClient<'static>,
    admin: &Address,
    owner: &Address,
    verifier: &Address,
) -> u64 {
    let metadata = create_metadata(env);
    let credit_id = registry.submit_credit(owner, &metadata, &String::from_str(env, "ipfs://hash"));
    registry.approve_and_mint(verifier, &credit_id, &String::from_str(env, "ok"));
    credit_id
}

#[test]
fn test_retire_credit() {
    let env = Env::default();
    let (admin, _, tracker, registry) = setup_test(&env);
    let owner = Address::generate(&env);
    let verifier = Address::generate(&env);
    registry.add_verifier(&admin, &verifier);
    let credit_id = create_active_credit(&env, &registry, &admin, &owner, &verifier);

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
    let credit_id = create_active_credit(&env, &registry, &admin, &owner, &verifier);

    tracker.retire(
        &malicious,
        &credit_id,
        &String::from_str(&env, "Offset"),
        &String::from_str(&env, "Acme Corp"),
        &String::from_str(&env, "2024"),
    );
}

#[test]
fn test_double_retire_rejected() {
    let env = Env::default();
    let (admin, _, tracker, registry) = setup_test(&env);
    let owner = Address::generate(&env);
    let verifier = Address::generate(&env);
    registry.add_verifier(&admin, &verifier);
    let credit_id = create_active_credit(&env, &registry, &admin, &owner, &verifier);

    tracker.retire(
        &owner,
        &credit_id,
        &String::from_str(&env, "Offset"),
        &String::from_str(&env, "Acme Corp"),
        &String::from_str(&env, "2024"),
    );

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        tracker.retire(
            &owner,
            &credit_id,
            &String::from_str(&env, "Offset"),
            &String::from_str(&env, "Acme Corp"),
            &String::from_str(&env, "2024"),
        );
    }));
    assert!(result.is_err());
}

#[test]
fn test_batch_retire() {
    let env = Env::default();
    let (admin, _, tracker, registry) = setup_test(&env);
    let owner = Address::generate(&env);
    let verifier = Address::generate(&env);
    registry.add_verifier(&admin, &verifier);

    let credit_id1 = create_active_credit(&env, &registry, &admin, &owner, &verifier);
    let credit_id2 = create_active_credit(&env, &registry, &admin, &owner, &verifier);

    let retirements = vec![
        &env,
        RetireInput {
            credit_id: credit_id1,
            reason: String::from_str(&env, "Offset"),
            beneficiary: String::from_str(&env, "Acme Corp"),
            accounting_period: String::from_str(&env, "2024"),
        },
        RetireInput {
            credit_id: credit_id2,
            reason: String::from_str(&env, "Offset"),
            beneficiary: String::from_str(&env, "Green Fund"),
            accounting_period: String::from_str(&env, "2024"),
        },
    ];

    let results = tracker.batch_retire(&owner, &retirements);
    assert_eq!(results.len(), 2);

    assert!(tracker.is_retired(&credit_id1));
    assert!(tracker.is_retired(&credit_id2));

    let credit1 = registry.get_credit(&credit_id1);
    assert_eq!(credit1.status, CreditStatus::Retired);
}

#[test]
fn test_retire_with_empty_inputs_fails() {
    let env = Env::default();
    let (admin, _, tracker, registry) = setup_test(&env);
    let owner = Address::generate(&env);
    let verifier = Address::generate(&env);
    registry.add_verifier(&admin, &verifier);
    let credit_id = create_active_credit(&env, &registry, &admin, &owner, &verifier);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        tracker.retire(
            &owner,
            &credit_id,
            &String::from_str(&env, ""),
            &String::from_str(&env, "Acme Corp"),
            &String::from_str(&env, "2024"),
        );
    }));
    assert!(result.is_err());
}

#[test]
fn test_retire_with_empty_beneficiary_fails() {
    let env = Env::default();
    let (admin, _, tracker, registry) = setup_test(&env);
    let owner = Address::generate(&env);
    let verifier = Address::generate(&env);
    registry.add_verifier(&admin, &verifier);
    let credit_id = create_active_credit(&env, &registry, &admin, &owner, &verifier);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        tracker.retire(
            &owner,
            &credit_id,
            &String::from_str(&env, "Offset"),
            &String::from_str(&env, ""),
            &String::from_str(&env, "2024"),
        );
    }));
    assert!(result.is_err());
}

#[test]
fn test_get_retirements_by_beneficiary() {
    let env = Env::default();
    let (admin, _, tracker, registry) = setup_test(&env);
    let owner = Address::generate(&env);
    let verifier = Address::generate(&env);
    registry.add_verifier(&admin, &verifier);
    let credit_id = create_active_credit(&env, &registry, &admin, &owner, &verifier);

    tracker.retire(
        &owner,
        &credit_id,
        &String::from_str(&env, "Offset"),
        &String::from_str(&env, "Acme Corp"),
        &String::from_str(&env, "2024"),
    );

    let records = tracker.get_retirements_by_beneficiary(
        &String::from_str(&env, "Acme Corp"),
        &0,
        &10,
    );
    assert_eq!(records.len(), 1);
    assert_eq!(records.get(0).unwrap().beneficiary, String::from_str(&env, "Acme Corp"));
}

#[test]
fn test_batch_retire_exceeds_max() {
    let env = Env::default();
    let (_, _, tracker, _) = setup_test(&env);
    let owner = Address::generate(&env);

    // Create a large input vector (doesn't need real credits, length check happens first)
    let mut retirements = vec![&env];
    for i in 0..101 {
        let input = RetireInput {
            credit_id: i as u64 + 1,
            reason: String::from_str(&env, "Offset"),
            beneficiary: String::from_str(&env, "Acme Corp"),
            accounting_period: String::from_str(&env, "2024"),
        };
        retirements.push_back(input);
    }

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        tracker.batch_retire(&owner, &retirements);
    }));
    assert!(result.is_err());
}

#[test]
fn test_retire_nonexistent_credit_fails() {
    let env = Env::default();
    let (_, _, tracker, _registry) = setup_test(&env);
    let owner = Address::generate(&env);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        tracker.retire(
            &owner,
            &999,
            &String::from_str(&env, "Offset"),
            &String::from_str(&env, "Acme Corp"),
            &String::from_str(&env, "2024"),
        );
    }));
    assert!(result.is_err());
}
