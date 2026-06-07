use soroban_sdk::{contracttype, Address, BytesN, Env, String};

#[contracttype]
pub struct RegistryRoot {
    pub root: BytesN<32>,
    pub block_height: u64,
    pub updated_at: u64,
}

#[contracttype]
pub enum DataKey {
    Admin,
    CreditRegistry,
    RegistryRoot(String),
    BridgedStatus(String, String), // (registry, serial)
}

pub fn read_admin(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Admin).unwrap()
}

pub fn write_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&DataKey::Admin, admin);
}

pub fn read_credit_registry(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::CreditRegistry).unwrap()
}

pub fn write_credit_registry(env: &Env, credit_registry: &Address) {
    env.storage().instance().set(&DataKey::CreditRegistry, credit_registry);
}

pub fn read_registry_root(env: &Env, registry: &String) -> Option<RegistryRoot> {
    env.storage().instance().get(&DataKey::RegistryRoot(registry.clone()))
}

pub fn write_registry_root(env: &Env, registry: &String, root_info: &RegistryRoot) {
    env.storage().instance().set(&DataKey::RegistryRoot(registry.clone()), root_info);
}

pub fn is_bridged(env: &Env, registry: &String, serial: &String) -> bool {
    env.storage().instance().has(&DataKey::BridgedStatus(registry.clone(), serial.clone()))
}

pub fn set_bridged(env: &Env, registry: &String, serial: &String) {
    env.storage().instance().set(&DataKey::BridgedStatus(registry.clone(), serial.clone()), &true);
}
