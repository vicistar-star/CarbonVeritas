#![cfg(test)]

extern crate std;

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{vec, Address, BytesN, Env, String};
use carbonveritas_credit_registry::{CreditRegistry, CreditRegistryClient};
use carbonveritas_shared::credit_metadata::{CreditMetadata, CreditStatus};

fn setup_test(env: &Env) -> (Address, Address, MerkleBridgeClient<'static>, CreditRegistryClient<'static>) {
    env.mock_all_auths();
    let admin = Address::generate(env);
    
    let registry_id = env.register_contract(None, CreditRegistry);
    let registry_client = CreditRegistryClient::new(env, &registry_id);
    registry_client.init(&admin, &1, &1);

    let bridge_id = env.register_contract(None, MerkleBridge);
    let bridge_client = MerkleBridgeClient::new(env, &bridge_id);
    bridge_client.init(&admin, &registry_id);

    registry_client.add_bridge(&admin, &bridge_id);
    registry_client.add_retirer(&admin, &bridge_id);

    (admin, registry_id, bridge_client, registry_client)
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
        status: CreditStatus::Active,
        created_at: 0,
        token_id: BytesN::from_array(env, &[0u8; 32]),
    }
}

fn compute_root(env: &Env, left: &BytesN<32>, right: &BytesN<32>) -> BytesN<32> {
    let mut combined = [0u8; 64];
    let left_arr = left.to_array();
    let right_arr = right.to_array();
    if left < right {
        combined[..32].copy_from_slice(&left_arr);
        combined[32..].copy_from_slice(&right_arr);
    } else {
        combined[..32].copy_from_slice(&right_arr);
        combined[32..].copy_from_slice(&left_arr);
    }
    let combined_bytes = soroban_sdk::Bytes::from_slice(env, &combined);
    env.crypto().sha256(&combined_bytes).into()
}

#[test]
fn test_merkle_proof_verification() {
    let env = Env::default();
    
    let mut a_bytes = [0u8; 32]; a_bytes[31] = 1;
    let mut b_bytes = [0u8; 32]; b_bytes[31] = 2;
    let leaf_a = BytesN::from_array(&env, &a_bytes);
    let leaf_b = BytesN::from_array(&env, &b_bytes);
    
    let root = compute_root(&env, &leaf_a, &leaf_b);
    
    let bridge_id = env.register_contract(None, MerkleBridge);
    let bridge = MerkleBridgeClient::new(&env, &bridge_id);
    
    assert!(bridge.verify_proof(&leaf_a, &vec![&env, leaf_b.clone()], &root));
}

#[test]
fn test_tampered_proof_rejected() {
    let env = Env::default();
    
    let mut a_bytes = [0u8; 32]; a_bytes[31] = 1;
    let mut b_bytes = [0u8; 32]; b_bytes[31] = 2;
    let mut c_bytes = [0u8; 32]; c_bytes[31] = 3;
    let leaf_a = BytesN::from_array(&env, &a_bytes);
    let leaf_b = BytesN::from_array(&env, &b_bytes);
    let leaf_c = BytesN::from_array(&env, &c_bytes);
    
    let root = compute_root(&env, &leaf_a, &leaf_b);
    
    let bridge_id = env.register_contract(None, MerkleBridge);
    let bridge = MerkleBridgeClient::new(&env, &bridge_id);
    
    // leaf_c is not part of the tree
    assert!(!bridge.verify_proof(&leaf_c, &vec![&env, leaf_b.clone()], &root));
}

#[test]
fn test_bridge_in() {
    let env = Env::default();
    let (admin, _, bridge, registry) = setup_test(&env);
    let bridger = Address::generate(&env);
    
    let registry_name = String::from_str(&env, "VERRA");
    let serial = String::from_str(&env, "VCS-1234");
    
    let mut leaf_bytes = [0u8; 32]; leaf_bytes[31] = 5;
    let leaf = BytesN::from_array(&env, &leaf_bytes);
    let root = leaf.clone();
    
    bridge.update_registry_root(&admin, &registry_name, &root, &100);
    
    let metadata = create_metadata(&env);
    let credit_id = bridge.bridge_in(&bridger, &registry_name, &serial, &leaf, &vec![&env], &metadata);
    
    assert_eq!(credit_id, 1);
    assert_eq!(registry.get_owner(&credit_id), bridger);
    assert_eq!(registry.get_credit(&credit_id).status, CreditStatus::Active);
}

#[test]
fn test_bridge_in_tampered_proof_fails() {
    let env = Env::default();
    let (admin, _, bridge, _registry) = setup_test(&env);
    let bridger = Address::generate(&env);
    
    let registry_name = String::from_str(&env, "VERRA");
    let serial = String::from_str(&env, "VCS-1234");
    
    let mut leaf_bytes = [0u8; 32]; leaf_bytes[31] = 5;
    let leaf = BytesN::from_array(&env, &leaf_bytes);
    let root = leaf.clone();
    
    bridge.update_registry_root(&admin, &registry_name, &root, &100);
    
    let mut fake_leaf_bytes = [0u8; 32]; fake_leaf_bytes[31] = 99;
    let fake_leaf = BytesN::from_array(&env, &fake_leaf_bytes);
    
    let metadata = create_metadata(&env);
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        bridge.bridge_in(&bridger, &registry_name, &serial, &fake_leaf, &vec![&env], &metadata);
    }));
    assert!(result.is_err());
}

#[test]
fn test_bridge_in_already_bridged_fails() {
    let env = Env::default();
    let (admin, _, bridge, _registry) = setup_test(&env);
    let bridger = Address::generate(&env);
    
    let registry_name = String::from_str(&env, "VERRA");
    let serial = String::from_str(&env, "VCS-1234");
    
    let mut leaf_bytes = [0u8; 32]; leaf_bytes[31] = 5;
    let leaf = BytesN::from_array(&env, &leaf_bytes);
    let root = leaf.clone();
    
    bridge.update_registry_root(&admin, &registry_name, &root, &100);
    
    let metadata = create_metadata(&env);
    bridge.bridge_in(&bridger, &registry_name, &serial, &leaf, &vec![&env], &metadata);
    
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        bridge.bridge_in(&bridger, &registry_name, &serial, &leaf, &vec![&env], &metadata);
    }));
    assert!(result.is_err());
}

#[test]
fn test_bridge_in_nonexistent_registry_fails() {
    let env = Env::default();
    let (_, _, bridge, _registry) = setup_test(&env);
    let bridger = Address::generate(&env);
    
    let registry_name = String::from_str(&env, "UNKNOWN");
    let serial = String::from_str(&env, "VCS-1234");
    
    let mut leaf_bytes = [0u8; 32]; leaf_bytes[31] = 5;
    let leaf = BytesN::from_array(&env, &leaf_bytes);
    
    let metadata = create_metadata(&env);
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        bridge.bridge_in(&bridger, &registry_name, &serial, &leaf, &vec![&env], &metadata);
    }));
    assert!(result.is_err());
}

#[test]
fn test_bridge_out() {
    let env = Env::default();
    let (admin, _, bridge, registry) = setup_test(&env);
    let bridger = Address::generate(&env);
    
    let registry_name = String::from_str(&env, "VERRA");
    let serial = String::from_str(&env, "VCS-1234");
    
    let mut leaf_bytes = [0u8; 32]; leaf_bytes[31] = 5;
    let leaf = BytesN::from_array(&env, &leaf_bytes);
    let root = leaf.clone();
    
    bridge.update_registry_root(&admin, &registry_name, &root, &100);
    
    let metadata = create_metadata(&env);
    let credit_id = bridge.bridge_in(&bridger, &registry_name, &serial, &leaf, &vec![&env], &metadata);
    
    // Bridge out should retire the credit
    let result = bridge.bridge_out(&bridger, &credit_id);
    assert!(result);
    
    let credit = registry.get_credit(&credit_id);
    assert_eq!(credit.status, CreditStatus::Retired);
}

#[test]
fn test_bridge_out_unauthorized_fails() {
    let env = Env::default();
    let (admin, _, bridge, registry) = setup_test(&env);
    let bridger = Address::generate(&env);
    let malicious = Address::generate(&env);
    
    let registry_name = String::from_str(&env, "VERRA");
    let serial = String::from_str(&env, "VCS-1234");
    
    let mut leaf_bytes = [0u8; 32]; leaf_bytes[31] = 5;
    let leaf = BytesN::from_array(&env, &leaf_bytes);
    let root = leaf.clone();
    
    bridge.update_registry_root(&admin, &registry_name, &root, &100);
    
    let metadata = create_metadata(&env);
    let credit_id = bridge.bridge_in(&bridger, &registry_name, &serial, &leaf, &vec![&env], &metadata);
    
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        bridge.bridge_out(&malicious, &credit_id);
    }));
    assert!(result.is_err());
}

#[test]
fn test_update_registry_root() {
    let env = Env::default();
    let (admin, _, bridge, _registry) = setup_test(&env);
    
    let registry_name = String::from_str(&env, "VERRA");
    let mut root_bytes = [0u8; 32]; root_bytes[31] = 42;
    let root = BytesN::from_array(&env, &root_bytes);
    
    bridge.update_registry_root(&admin, &registry_name, &root, &200);
    
    let stored = bridge.get_registry_root(&registry_name).unwrap();
    assert_eq!(stored.root, root);
    assert_eq!(stored.block_height, 200);
}

#[test]
fn test_update_registry_root_unauthorized() {
    let env = Env::default();
    let (_, _, bridge, _registry) = setup_test(&env);
    
    let registry_name = String::from_str(&env, "VERRA");
    let mut root_bytes = [0u8; 32]; root_bytes[31] = 42;
    let root = BytesN::from_array(&env, &root_bytes);
    
    let fake_admin = Address::generate(&env);
    // With mock_all_auths, requires manual auth simulation
    // In test setup, admin is stored in contract; fake_admin won't match
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        bridge.update_registry_root(&fake_admin, &registry_name, &root, &200);
    }));
    assert!(result.is_err());
}

#[test]
fn test_multi_level_proof() {
    let env = Env::default();
    
    // Build a 3-level tree: root = hash(hash(A,B), hash(C,D))
    let mut a_bytes = [0u8; 32]; a_bytes[31] = 1;
    let mut b_bytes = [0u8; 32]; b_bytes[31] = 2;
    let mut c_bytes = [0u8; 32]; c_bytes[31] = 3;
    let mut d_bytes = [0u8; 32]; d_bytes[31] = 4;
    
    let leaf_a = BytesN::from_array(&env, &a_bytes);
    let leaf_b = BytesN::from_array(&env, &b_bytes);
    let leaf_c = BytesN::from_array(&env, &c_bytes);
    let leaf_d = BytesN::from_array(&env, &d_bytes);
    
    let hash_ab = compute_root(&env, &leaf_a, &leaf_b);
    let hash_cd = compute_root(&env, &leaf_c, &leaf_d);
    let root = compute_root(&env, &hash_ab, &hash_cd);
    
    // Proof for leaf_a: [leaf_b, hash_cd]
    let proof = vec![&env, leaf_b.clone(), hash_cd.clone()];
    
    let bridge_id = env.register_contract(None, MerkleBridge);
    let bridge = MerkleBridgeClient::new(&env, &bridge_id);
    
    assert!(bridge.verify_proof(&leaf_a, &proof, &root));
    
    // Tampered proof should fail
    let mut e_bytes = [0u8; 32]; e_bytes[31] = 5;
    let leaf_e = BytesN::from_array(&env, &e_bytes);
    let bad_proof = vec![&env, leaf_e.clone(), hash_cd.clone()];
    assert!(!bridge.verify_proof(&leaf_a, &bad_proof, &root));
}
