use soroban_sdk::{Env, String, Address, symbol_short};

pub fn emit_credit_bridged(env: &Env, registry: &String, serial: &String, credit_id: u64) {
    env.events().publish(
        (symbol_short!("bridged"), registry.clone(), serial.clone()),
        credit_id,
    );
}

pub fn emit_bridge_out(env: &Env, credit_id: u64, owner: &Address) {
    env.events().publish(
        (symbol_short!("bridge_ot"), credit_id),
        owner.clone(),
    );
}

pub fn emit_root_updated(env: &Env, registry: &String, root: &soroban_sdk::BytesN<32>) {
    env.events().publish(
        (symbol_short!("root_upd"), registry.clone()),
        root.clone(),
    );
}
