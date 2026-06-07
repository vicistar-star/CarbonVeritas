#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{vec, Address, Env};
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

#[test]
fn test_merkle_proof_verification() {
    let env = Env::default();
    
    // Leaf A: 0x01...
    // Leaf B: 0x02...
    // Root = Hash(A, B)
    let mut a_bytes = [0u8; 32]; a_bytes[31] = 1;
    let mut b_bytes = [0u8; 32]; b_bytes[31] = 2;
    let leaf_a = BytesN::from_array(&env, &a_bytes);
    let leaf_b = BytesN::from_array(&env, &b_bytes);
    
    // Manual hash computation to match contract
    let mut combined = [0u8; 64];
    combined[..32].copy_from_slice(&a_bytes);
    combined[32..].copy_from_slice(&b_bytes);
    let root: BytesN<32> = env.crypto().sha256(&soroban_sdk::Bytes::from_slice(&env, &combined)).into();
    
    let bridge_id = env.register_contract(None, MerkleBridge);
    let bridge = MerkleBridgeClient::new(&env, &bridge_id);
    
    assert!(bridge.verify_proof(&leaf_a, &vec![&env, leaf_b.clone()], &root));
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
    let root = leaf.clone(); // Single leaf tree for simplicity
    
    bridge.update_registry_root(&admin, &registry_name, &root, &100);
    
    let metadata = create_metadata(&env);
    let credit_id = bridge.bridge_in(&bridger, &registry_name, &serial, &leaf, &vec![&env], &metadata);
    
    assert_eq!(credit_id, 1);
    assert_eq!(registry.get_owner(&credit_id), bridger);
    assert_eq!(registry.get_credit(&credit_id).status, CreditStatus::Active);
}
