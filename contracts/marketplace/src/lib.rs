#![no_std]

use soroban_sdk::{auth::InvokerContractAuthEntry, contract, contractimpl, panic_with_error, Address, Env, String, Vec};

use carbonveritas_credit_registry::CreditRegistryClient;
use carbonveritas_shared::credit_metadata::{Offer, OfferStatus};
use carbonveritas_shared::errors::Error;

pub mod events;
pub mod storage;

#[cfg(test)]
mod test;

#[contract]
pub struct Marketplace;

#[contractimpl]
impl Marketplace {
    pub fn init(env: Env, admin: Address, credit_registry: Address) {
        admin.require_auth();
        storage::write_admin(&env, &admin);
        storage::write_credit_registry(&env, &credit_registry);
    }

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
        if let Some(e) = expiry {
            if e <= env.ledger().timestamp() {
                panic_with_error!(&env, Error::InvalidInput);
            }
        }

        let credit_registry = storage::read_credit_registry(&env);
        let client = CreditRegistryClient::new(&env, &credit_registry);
        client.transfer_credit(&seller, &env.current_contract_address(), &credit_id);

        let offer_id = storage::next_offer_id(&env);
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
        storage::write_offer(&env, offer_id, &offer);
        storage::add_offer_to_seller(&env, &seller, offer_id);
        storage::add_offer_to_all(&env, offer_id);
        events::emit_offer_created(&env, offer_id, &seller);
        offer_id
    }

    pub fn buy_credits(env: Env, buyer: Address, offer_id: u64, amount: i128) -> bool {
        buyer.require_auth();
        let mut offer = storage::read_offer(&env, offer_id);
        if offer.status != OfferStatus::Active {
            panic_with_error!(&env, Error::OfferAlreadyFilled);
        }
        if let Some(expiry) = offer.expiry {
            if env.ledger().timestamp() > expiry {
                offer.status = OfferStatus::Expired;
                storage::write_offer(&env, offer_id, &offer);
                panic_with_error!(&env, Error::OfferExpired);
            }
        }
        let available = offer.amount - offer.filled;
        if amount <= 0 || amount > available {
            panic_with_error!(&env, Error::InsufficientAmount);
        }

        // Transfer payment from buyer to seller
        let payment_amount = (amount * offer.price_per_tonne) / 1000;
        let token_client = soroban_sdk::token::Client::new(&env, &offer.currency);
        token_client.transfer(&buyer, &offer.seller, &payment_amount);

        let credit_registry = storage::read_credit_registry(&env);
        let client = CreditRegistryClient::new(&env, &credit_registry);
        let auth_entries: Vec<InvokerContractAuthEntry> = Vec::new(&env);
        env.authorize_as_current_contract(auth_entries);
        client.transfer_credit(
            &env.current_contract_address(),
            &buyer,
            &offer.credit_id,
        );

        offer.filled += amount;
        if offer.filled >= offer.amount {
            offer.status = OfferStatus::Filled;
        }
        storage::write_offer(&env, offer_id, &offer);
        events::emit_offer_filled(&env, offer_id, &buyer, amount);
        true
    }

    pub fn cancel_offer(env: Env, caller: Address, offer_id: u64) -> bool {
        caller.require_auth();
        let mut offer = storage::read_offer(&env, offer_id);

        if offer.seller != caller {
            if let Some(expiry) = offer.expiry {
                if env.ledger().timestamp() <= expiry {
                    panic_with_error!(&env, Error::OfferNotCancellable);
                }
            } else {
                panic_with_error!(&env, Error::OfferNotCancellable);
            }
        }

        if offer.status != OfferStatus::Active {
            panic_with_error!(&env, Error::OfferAlreadyFilled);
        }

        let credit_registry = storage::read_credit_registry(&env);
        let client = CreditRegistryClient::new(&env, &credit_registry);
        let auth_entries: Vec<InvokerContractAuthEntry> = Vec::new(&env);
        env.authorize_as_current_contract(auth_entries);
        client.transfer_credit(
            &env.current_contract_address(),
            &offer.seller,
            &offer.credit_id,
        );

        offer.status = OfferStatus::Cancelled;
        storage::write_offer(&env, offer_id, &offer);
        events::emit_offer_cancelled(&env, offer_id);
        true
    }

    pub fn get_listings(
        env: Env,
        _methodology_filter: Option<String>,
        _geography_filter: Option<String>,
        _max_price: Option<i128>,
        offset: u32,
        limit: u32,
    ) -> Vec<Offer> {
        storage::read_all_offers(&env, offset, limit)
    }

    pub fn get_offer(env: Env, offer_id: u64) -> Offer {
        storage::read_offer(&env, offer_id)
    }

    pub fn get_offers_by_seller(env: Env, seller: Address) -> Vec<u64> {
        storage::read_offers_by_seller(&env, &seller)
    }
}
