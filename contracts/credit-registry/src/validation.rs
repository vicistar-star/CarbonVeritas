use soroban_sdk::{panic_with_error, Address, Env};

use carbonveritas_shared::constants::MAX_TONNES;
use carbonveritas_shared::credit_metadata::CreditMetadata;
use carbonveritas_shared::errors::Error;

use crate::storage;

pub fn validate_metadata(env: &Env, metadata: &CreditMetadata) {
    if metadata.project_id.is_empty() {
        panic_with_error!(env, Error::InvalidInput);
    }
    if metadata.methodology.is_empty() {
        panic_with_error!(env, Error::InvalidInput);
    }
    if metadata.vintage_start == 0 || metadata.vintage_end == 0 {
        panic_with_error!(env, Error::InvalidInput);
    }
    if metadata.vintage_start > metadata.vintage_end {
        panic_with_error!(env, Error::InvalidInput);
    }
    if metadata.tonnes <= 0 || metadata.tonnes > MAX_TONNES {
        panic_with_error!(env, Error::InvalidInput);
    }
    if metadata.geography.len() != 2 {
        panic_with_error!(env, Error::InvalidInput);
    }
    if metadata.sdg_flags > 0x3FFF {
        panic_with_error!(env, Error::InvalidInput);
    }
    if metadata.buffer_contribution_pct > 20 {
        panic_with_error!(env, Error::InvalidInput);
    }
    if metadata.permanence_rating > 100 {
        panic_with_error!(env, Error::InvalidInput);
    }
    if metadata.additionality_type > 2 {
        panic_with_error!(env, Error::InvalidInput);
    }
}

pub fn require_admin(env: &Env) {
    let admin = storage::read_admin(env);
    admin.require_auth();
}

pub fn require_verifier(env: &Env, verifier: &Address) {
    if !storage::is_verifier(env, verifier) {
        panic_with_error!(env, Error::NotAuthorized);
    }
}
