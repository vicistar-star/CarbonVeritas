#![no_std]

use soroban_sdk::{
    contract, contractimpl, panic_with_error, Address, BytesN, Env, String, Vec,
};

use carbonveritas_shared::credit_metadata::CreditMetadata;
use carbonveritas_shared::errors::Error;

#[contract]
pub struct MerkleBridge;

#[contractimpl]
impl MerkleBridge {
    pub fn bridge_in(
        env: Env,
        bridger: Address,
        source_registry: String,
        source_serial: String,
        leaf: BytesN<32>,
        merkle_proof: Vec<BytesN<32>>,
        merkle_root: BytesN<32>,
        metadata: CreditMetadata,
    ) -> u64 {
        bridger.require_auth();
        if source_registry.is_empty() || source_serial.is_empty() {
            panic_with_error!(&env, Error::InvalidInput);
        }
        if !Self::verify_proof(env.clone(), leaf, merkle_proof, merkle_root) {
            panic_with_error!(&env, Error::InvalidProof);
        }
        if Self::is_already_bridged(env.clone(), &source_registry, &source_serial) {
            panic_with_error!(&env, Error::AlreadyBridged);
        }
        let credit_id = 0u64;
        let _ = metadata;
        let bridge_key = (source_registry, source_serial);
        env.storage().instance().set(&bridge_key, &true);
        credit_id
    }

    pub fn bridge_out(_env: Env, owner: Address, _credit_id: u64) -> bool {
        owner.require_auth();
        true
    }

    pub fn verify_proof(
        env: Env,
        leaf: BytesN<32>,
        proof: Vec<BytesN<32>>,
        root: BytesN<32>,
    ) -> bool {
        let mut computed = leaf;
        for sibling in proof.iter() {
            let mut combined = [0u8; 64];
            let (left, right) = if computed < sibling {
                (computed.to_array(), sibling.to_array())
            } else {
                (sibling.to_array(), computed.to_array())
            };
            combined[..32].copy_from_slice(&left);
            combined[32..].copy_from_slice(&right);
            let combined_bytes = soroban_sdk::Bytes::from_slice(&env, &combined);
            let hash: BytesN<32> = env.crypto().sha256(&combined_bytes).into();
            computed = hash;
        }
        computed == root
    }

    pub fn update_registry_root(
        env: Env,
        admin: Address,
        registry: String,
        new_root: BytesN<32>,
        _block_height: u64,
    ) -> bool {
        admin.require_auth();
        env.storage().instance().set(&registry, &new_root);
        true
    }

    pub fn get_registry_root(env: Env, registry: String) -> Option<BytesN<32>> {
        env.storage().instance().get(&registry)
    }

    fn is_already_bridged(env: Env, registry: &String, serial: &String) -> bool {
        env.storage()
            .instance()
            .has(&(registry.clone(), serial.clone()))
    }
}
