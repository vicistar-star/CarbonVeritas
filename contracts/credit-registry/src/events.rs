use soroban_sdk::{symbol_short, Address, Env, String, Symbol};

pub fn emit_credit_submitted(env: &Env, credit_id: u64, issuer: &Address, ipfs_hash: &String) {
    env.events().publish(
        (symbol_short!("credit"), symbol_short!("submit")),
        (credit_id, issuer.clone(), ipfs_hash.clone()),
    );
}

pub fn emit_credit_approved(env: &Env, credit_id: u64, verifier: &Address) {
    env.events().publish(
        (symbol_short!("credit"), symbol_short!("approve")),
        (credit_id, verifier.clone()),
    );
}

pub fn emit_credit_minted(env: &Env, credit_id: u64) {
    env.events().publish(
        (symbol_short!("credit"), symbol_short!("minted")),
        credit_id,
    );
}

pub fn emit_credit_rejected(env: &Env, credit_id: u64, verifier: &Address) {
    env.events().publish(
        (symbol_short!("credit"), symbol_short!("reject")),
        (credit_id, verifier.clone()),
    );
}

pub fn emit_credit_transferred(env: &Env, credit_id: u64, from: &Address, to: &Address) {
    env.events().publish(
        (symbol_short!("credit"), Symbol::new(env, "transfer")),
        (credit_id, from.clone(), to.clone()),
    );
}

pub fn emit_config_updated(env: &Env, admin: &Address) {
    env.events().publish(
        (symbol_short!("config"), symbol_short!("update")),
        admin.clone(),
    );
}
