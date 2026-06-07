#![no_std]

use soroban_sdk::{
    contract, contractimpl, panic_with_error, Address, BytesN, Env, String, Vec,
};

use carbonveritas_credit_registry::CreditRegistryClient;
use carbonveritas_shared::credit_metadata::CreditMetadata;
use carbonveritas_shared::errors::Error;

pub mod events;
pub mod storage;

#[cfg(test)]
mod test;

#[contract]
pub struct MerkleBridge;

#[contractimpl]
impl MerkleBridge {
    pub fn init(env: Env, admin: Address, credit_registry: Address) {
        if env.storage().instance().has(&storage::DataKey::Admin) {
            panic_with_error!(&env, Error::AlreadyExists);
        }
        storage::write_admin(&env, &admin);
        storage::write_credit_registry(&env, &credit_registry);
    }

    pub fn bridge_in(
        env: Env,
        bridger: Address,
        source_registry: String,
        source_serial: String,
        leaf: BytesN<32>,
        merkle_proof: Vec<BytesN<32>>,
        metadata: CreditMetadata,
    ) -> u64 {
        bridger.require_auth();
        
        let root_info = storage::read_registry_root(&env, &source_registry)
            .unwrap_or_else(|| panic_with_error!(&env, Error::RegistryNotFound));

        if !Self::verify_proof(env.clone(), leaf, merkle_proof, root_info.root) {
            panic_with_error!(&env, Error::InvalidProof);
        }

        if storage::is_bridged(&env, &source_registry, &source_serial) {
            panic_with_error!(&env, Error::AlreadyBridged);
        }

        let credit_registry = storage::read_credit_registry(&env);
        let client = CreditRegistryClient::new(&env, &credit_registry);
        
        let credit_id = client.mint_bridged(
            &env.current_contract_address(),
            &bridger,
            &metadata,
        );

        storage::set_bridged(&env, &source_registry, &source_serial);
        events::emit_credit_bridged(&env, &source_registry, &source_serial, credit_id);
        
        credit_id
    }

    pub fn bridge_out(env: Env, owner: Address, credit_id: u64) -> bool {
        owner.require_auth();
        
        let credit_registry = storage::read_credit_registry(&env);
        let client = CreditRegistryClient::new(&env, &credit_registry);
        
        let owner_on_chain = client.get_owner(&credit_id);
        if owner_on_chain != owner {
            panic_with_error!(&env, Error::NotAuthorized);
        }

        client.mark_retired(&credit_id);
        events::emit_bridge_out(&env, credit_id, &owner);
        
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
        block_height: u64,
    ) -> bool {
        let stored_admin = storage::read_admin(&env);
        admin.require_auth();
        if admin != stored_admin {
             panic_with_error!(&env, Error::NotAuthorized);
        }

        let root_info = storage::RegistryRoot {
            root: new_root.clone(),
            block_height,
            updated_at: env.ledger().timestamp(),
        };
        storage::write_registry_root(&env, &registry, &root_info);
        events::emit_root_updated(&env, &registry, &new_root);
        true
    }

    pub fn get_registry_root(env: Env, registry: String) -> Option<storage::RegistryRoot> {
        storage::read_registry_root(&env, &registry)
    }
}
