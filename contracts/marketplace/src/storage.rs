use soroban_sdk::{panic_with_error, Address, Env, Vec};

use carbonveritas_shared::constants::MAX_LISTINGS_PAGE;
use carbonveritas_shared::credit_metadata::{Offer, OfferStatus};

const OFFER_PREFIX: &str = "o";
const SELLER_LIST_PREFIX: &str = "s";
const ALL_OFFERS_KEY: &str = "all";
const CREDIT_REGISTRY_KEY: &str = "cr";
const ADMIN_KEY: &str = "adm";

pub fn next_offer_id(env: &Env) -> u64 {
    let counter_key = 0u64;
    let counter: u64 = env.storage().instance().get(&counter_key).unwrap_or(0);
    env.storage().instance().set(&counter_key, &(counter + 1));
    counter + 1
}

pub fn write_offer(env: &Env, offer_id: u64, offer: &Offer) {
    env.storage()
        .instance()
        .set(&(OFFER_PREFIX, offer_id), offer);
}

pub fn read_offer(env: &Env, offer_id: u64) -> Offer {
    env.storage()
        .instance()
        .get(&(OFFER_PREFIX, offer_id))
        .unwrap_or_else(|| panic_with_error!(env, carbonveritas_shared::errors::Error::OfferNotFound))
}

pub fn add_offer_to_seller(env: &Env, seller: &Address, offer_id: u64) {
    let mut list: Vec<u64> = env
        .storage()
        .instance()
        .get(&(SELLER_LIST_PREFIX, seller.clone()))
        .unwrap_or_else(|| Vec::new(env));
    list.push_back(offer_id);
    env.storage()
        .instance()
        .set(&(SELLER_LIST_PREFIX, seller.clone()), &list);
}

pub fn read_offers_by_seller(env: &Env, seller: &Address) -> Vec<u64> {
    env.storage()
        .instance()
        .get(&(SELLER_LIST_PREFIX, seller.clone()))
        .unwrap_or_else(|| Vec::new(env))
}

pub fn add_offer_to_all(env: &Env, offer_id: u64) {
    let mut list: Vec<u64> = env
        .storage()
        .instance()
        .get(&ALL_OFFERS_KEY)
        .unwrap_or_else(|| Vec::new(env));
    list.push_back(offer_id);
    env.storage().instance().set(&ALL_OFFERS_KEY, &list);
}

pub fn read_all_offers(env: &Env, offset: u32, limit: u32) -> Vec<Offer> {
    let list: Vec<u64> = env
        .storage()
        .instance()
        .get(&ALL_OFFERS_KEY)
        .unwrap_or_else(|| Vec::new(env));
    let page_limit = core::cmp::min(limit, MAX_LISTINGS_PAGE);
    let end = core::cmp::min(offset.saturating_add(page_limit), list.len() as u32);
    if offset >= list.len() as u32 {
        return Vec::new(env);
    }
    let mut result = Vec::new(env);
    for i in offset..end {
        if let Some(id) = list.get(i) {
            let offer = read_offer(env, id);
            if offer.status == OfferStatus::Active {
                result.push_back(offer);
            }
        }
    }
    result
}

pub fn write_credit_registry(env: &Env, addr: &Address) {
    env.storage().instance().set(&CREDIT_REGISTRY_KEY, addr);
}

pub fn read_credit_registry(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&CREDIT_REGISTRY_KEY)
        .unwrap()
}

pub fn write_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&ADMIN_KEY, admin);
}

pub fn read_admin(env: &Env) -> Address {
    env.storage().instance().get(&ADMIN_KEY).unwrap()
}
