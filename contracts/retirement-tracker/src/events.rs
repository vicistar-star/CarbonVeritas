use soroban_sdk::{symbol_short, Env, Symbol};

use carbonveritas_shared::credit_metadata::RetirementRecord;

pub fn emit_retired(env: &Env, record: &RetirementRecord) {
    env.events().publish(
        (symbol_short!("retire"), Symbol::new(env, "retired")),
        record.clone(),
    );
}
