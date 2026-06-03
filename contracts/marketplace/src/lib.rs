#![no_std]

use soroban_sdk::{contract, contractimpl, panic_with_error, Address, Env, String, Vec};

use carbonveritas_shared::credit_metadata::{Offer, OfferStatus};
use carbonveritas_shared::errors::Error;

#[contract]
pub struct Marketplace;

#[contractimpl]
impl Marketplace {
    pub fn create_offer(
        env: Env,
        seller: Address,
        credit_id: u64,
        price_per_tonne: i128,
        amount: i128,
        currency: Address,
        expiry: Option<u64>,
    ) -> u64 {
        seller.require_auth();
        if amount <= 0 || price_per_tonne <= 0 {
            panic_with_error!(&env, Error::InvalidInput);
        }
        let offer_id = Self::next_offer_id(&env);
        let offer = Offer {
            offer_id,
            seller: seller.clone(),
            credit_id,
            price_per_tonne,
            amount,
            filled: 0,
            currency,
            expiry,
            created_at: env.ledger().timestamp(),
            status: OfferStatus::Active,
        };
        env.storage().instance().set(&offer_id, &offer);
        let _ = credit_id;
        offer_id
    }

    pub fn buy_credits(env: Env, buyer: Address, offer_id: u64, amount: i128) -> bool {
        buyer.require_auth();
        let mut offer: Offer = env
            .storage()
            .instance()
            .get(&offer_id)
            .unwrap_or_else(|| panic_with_error!(&env, Error::OfferNotFound));
        if offer.status != OfferStatus::Active {
            panic_with_error!(&env, Error::OfferAlreadyFilled);
        }
        if let Some(expiry) = offer.expiry {
            if env.ledger().timestamp() > expiry {
                offer.status = OfferStatus::Expired;
                env.storage().instance().set(&offer_id, &offer);
                panic_with_error!(&env, Error::OfferExpired);
            }
        }
        let available = offer.amount - offer.filled;
        if amount <= 0 || amount > available {
            panic_with_error!(&env, Error::InsufficientAmount);
        }
        offer.filled += amount;
        if offer.filled >= offer.amount {
            offer.status = OfferStatus::Filled;
        }
        env.storage().instance().set(&offer_id, &offer);
        true
    }

    pub fn cancel_offer(env: Env, caller: Address, offer_id: u64) -> bool {
        caller.require_auth();
        let mut offer: Offer = env
            .storage()
            .instance()
            .get(&offer_id)
            .unwrap_or_else(|| panic_with_error!(&env, Error::OfferNotFound));
        if offer.seller != caller {
            if let Some(expiry) = offer.expiry {
                if env.ledger().timestamp() <= expiry {
                    panic_with_error!(&env, Error::OfferNotCancellable);
                }
            } else {
                panic_with_error!(&env, Error::OfferNotCancellable);
            }
        }
        offer.status = OfferStatus::Cancelled;
        env.storage().instance().set(&offer_id, &offer);
        true
    }

    pub fn get_listings(
        env: Env,
        _methodology_filter: Option<String>,
        _geography_filter: Option<String>,
        _max_price: Option<i128>,
        _offset: u32,
        _limit: u32,
    ) -> Vec<Offer> {
        Vec::new(&env)
    }

    pub fn get_offer(env: Env, offer_id: u64) -> Offer {
        env.storage()
            .instance()
            .get(&offer_id)
            .unwrap_or_else(|| panic_with_error!(&env, Error::OfferNotFound))
    }

    pub fn get_offers_by_seller(env: Env, _seller: Address) -> Vec<u64> {
        Vec::new(&env)
    }

    fn next_offer_id(env: &Env) -> u64 {
        let counter: u64 = env.storage().instance().get(&0u64).unwrap_or(0);
        env.storage().instance().set(&0u64, &(counter + 1));
        counter + 1
    }
}
