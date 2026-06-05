use soroban_sdk::{symbol_short, Address, Env, Symbol};

pub fn emit_offer_created(env: &Env, offer_id: u64, seller: &Address) {
    env.events().publish(
        (symbol_short!("offer"), Symbol::new(env, "created")),
        (offer_id, seller.clone()),
    );
}

pub fn emit_offer_filled(env: &Env, offer_id: u64, buyer: &Address, amount: i128) {
    env.events().publish(
        (symbol_short!("offer"), Symbol::new(env, "filled")),
        (offer_id, buyer.clone(), amount),
    );
}

pub fn emit_offer_cancelled(env: &Env, offer_id: u64) {
    env.events().publish(
        (symbol_short!("offer"), Symbol::new(env, "cancel")),
        offer_id,
    );
}
