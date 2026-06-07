#![cfg(test)]

extern crate std;

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::testutils::Ledger as _;
use soroban_sdk::{Address, BytesN, Env, String, token};
use carbonveritas_credit_registry::{CreditRegistry, CreditRegistryClient};
use carbonveritas_shared::credit_metadata::{CreditMetadata, CreditStatus, OfferStatus};

fn setup_test(env: &Env) -> (Address, Address, MarketplaceClient<'static>, CreditRegistryClient<'static>, Address) {
    env.mock_all_auths();
    let admin = Address::generate(env);
    
    let registry_id = env.register_contract(None, CreditRegistry);
    let registry_client = CreditRegistryClient::new(env, &registry_id);
    registry_client.init(&admin, &1, &1);

    let marketplace_id = env.register_contract(None, Marketplace);
    let marketplace_client = MarketplaceClient::new(env, &marketplace_id);
    marketplace_client.init(&admin, &registry_id);

    let token_id = env.register_stellar_asset_contract_v2(Address::generate(env));
    let token_address = token_id.address();
    
    env.ledger().set_timestamp(1000000);
    
    (admin, registry_id, marketplace_client, registry_client, token_address)
}

fn create_metadata(env: &Env) -> CreditMetadata {
    CreditMetadata {
        project_id: String::from_str(env, "PRJ-001"),
        methodology: String::from_str(env, "VCS-VM0007"),
        vintage_start: 1704067200,
        vintage_end: 1735689600,
        tonnes: 1000,
        geography: String::from_str(env, "BR"),
        serial_prefix: String::from_str(env, "VCS-123"),
        sdg_flags: 0,
        permanence_rating: 100,
        buffer_contribution_pct: 10,
        additionality_type: 1,
        ipfs_hash: String::from_str(env, "bafy..."),
        status: CreditStatus::Pending,
        created_at: 0,
        token_id: BytesN::from_array(env, &[0u8; 32]),
    }
}

fn setup_active_credit(
    env: &Env,
    registry: &CreditRegistryClient<'static>,
    admin: &Address,
    seller: &Address,
) -> u64 {
    let verifier = Address::generate(env);
    registry.add_verifier(admin, &verifier);
    let metadata = create_metadata(env);
    let credit_id = registry.submit_credit(seller, &metadata, &String::from_str(env, "ipfs://hash"));
    registry.approve_and_mint(&verifier, &credit_id, &String::from_str(env, "ok"));
    credit_id
}

#[test]
fn test_marketplace_buy() {
    let env = Env::default();
    let (admin, _registry_id, marketplace, registry, token_id) = setup_test(&env);
    
    let seller = Address::generate(&env);
    let buyer = Address::generate(&env);
    let credit_id = setup_active_credit(&env, &registry, &admin, &seller);

    let token_client = token::StellarAssetClient::new(&env, &token_id);
    token_client.mint(&buyer, &100_000);

    let amount = 500;
    let price = 20 * 1000;
    let offer_id = marketplace.create_offer(&seller, &credit_id, &price, &amount, &token_id, &None);

    marketplace.buy_credits(&buyer, &offer_id, &amount);

    assert_eq!(registry.get_owner(&credit_id), buyer);
    
    let token_logic = token::Client::new(&env, &token_id);
    assert_eq!(token_logic.balance(&seller), 10_000);
}

#[test]
fn test_partial_fill_tracking() {
    let env = Env::default();
    let (admin, _registry_id, marketplace, registry, token_id) = setup_test(&env);
    
    let seller = Address::generate(&env);
    let buyer = Address::generate(&env);
    let credit_id = setup_active_credit(&env, &registry, &admin, &seller);

    let token_client = token::StellarAssetClient::new(&env, &token_id);
    token_client.mint(&buyer, &100_000);

    // Offer 1000 tonnes @ 10 tokens per tonne
    let price = 10 * 1000;
    let offer_id = marketplace.create_offer(&seller, &credit_id, &price, &1000, &token_id, &None);

    // Buyer buys 300 tonnes - credit transfers to buyer in full
    marketplace.buy_credits(&buyer, &offer_id, &300);
    let offer = marketplace.get_offer(&offer_id);
    assert_eq!(offer.filled, 300);
    assert_eq!(offer.status, OfferStatus::Active);
    assert_eq!(registry.get_owner(&credit_id), buyer);
    
    // Second buy from same offer should fail since credit already transferred
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        marketplace.buy_credits(&buyer, &offer_id, &700);
    }));
    assert!(result.is_err());
}

#[test]
fn test_cancel_offer() {
    let env = Env::default();
    let (admin, _registry_id, marketplace, registry, token_id) = setup_test(&env);
    
    let seller = Address::generate(&env);
    let credit_id = setup_active_credit(&env, &registry, &admin, &seller);

    let offer_id = marketplace.create_offer(&seller, &credit_id, &(10*1000), &1000, &token_id, &None);
    assert_eq!(registry.get_owner(&credit_id), marketplace.address);

    marketplace.cancel_offer(&seller, &offer_id);
    assert_eq!(registry.get_owner(&credit_id), seller);
    
    let offer = marketplace.get_offer(&offer_id);
    assert_eq!(offer.status, OfferStatus::Cancelled);
}

#[test]
fn test_expired_offer_cannot_be_bought() {
    let env = Env::default();
    let (admin, _registry_id, marketplace, registry, token_id) = setup_test(&env);
    
    let seller = Address::generate(&env);
    let buyer = Address::generate(&env);
    let credit_id = setup_active_credit(&env, &registry, &admin, &seller);

    let token_client = token::StellarAssetClient::new(&env, &token_id);
    token_client.mint(&buyer, &100_000);

    // Create offer with future expiry, then jump past it
    let future_expiry = Some(1_500_000u64);
    let offer_id = marketplace.create_offer(&seller, &credit_id, &(10*1000), &500, &token_id, &future_expiry);

    // Jump past expiry
    env.ledger().set_timestamp(2_000_000);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        marketplace.buy_credits(&buyer, &offer_id, &100);
    }));
    assert!(result.is_err());
}

#[test]
fn test_cancel_expired_offer_by_third_party() {
    let env = Env::default();
    let (admin, _registry_id, marketplace, registry, token_id) = setup_test(&env);
    
    let seller = Address::generate(&env);
    let stranger = Address::generate(&env);
    let credit_id = setup_active_credit(&env, &registry, &admin, &seller);

    // Create offer with future expiry, then jump past it
    let future_expiry = Some(1_500_000u64);
    let offer_id = marketplace.create_offer(&seller, &credit_id, &(10*1000), &500, &token_id, &future_expiry);

    // Jump past expiry
    env.ledger().set_timestamp(2_000_000);

    marketplace.cancel_offer(&stranger, &offer_id);
    let offer = marketplace.get_offer(&offer_id);
    assert_eq!(offer.status, OfferStatus::Cancelled);
    assert_eq!(registry.get_owner(&credit_id), seller);
}

#[test]
fn test_buy_with_insufficient_tokens_fails() {
    let env = Env::default();
    let (admin, _registry_id, marketplace, registry, token_id) = setup_test(&env);
    
    let seller = Address::generate(&env);
    let buyer = Address::generate(&env);
    let credit_id = setup_active_credit(&env, &registry, &admin, &seller);

    // Mint buyer only 1 token
    let token_client = token::StellarAssetClient::new(&env, &token_id);
    token_client.mint(&buyer, &1);

    let offer_id = marketplace.create_offer(&seller, &credit_id, &(10*1000), &500, &token_id, &None);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        marketplace.buy_credits(&buyer, &offer_id, &500);
    }));
    assert!(result.is_err());
}

#[test]
fn test_double_fill_fails() {
    let env = Env::default();
    let (admin, _registry_id, marketplace, registry, token_id) = setup_test(&env);
    
    let seller = Address::generate(&env);
    let buyer = Address::generate(&env);
    let credit_id = setup_active_credit(&env, &registry, &admin, &seller);

    let token_client = token::StellarAssetClient::new(&env, &token_id);
    token_client.mint(&buyer, &100_000);

    let offer_id = marketplace.create_offer(&seller, &credit_id, &(10*1000), &500, &token_id, &None);

    marketplace.buy_credits(&buyer, &offer_id, &500);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        marketplace.buy_credits(&buyer, &offer_id, &1);
    }));
    assert!(result.is_err());
}

#[test]
fn test_get_listings() {
    let env = Env::default();
    let (admin, _registry_id, marketplace, registry, token_id) = setup_test(&env);
    
    let seller1 = Address::generate(&env);
    let seller2 = Address::generate(&env);
    let credit_id1 = setup_active_credit(&env, &registry, &admin, &seller1);
    let credit_id2 = setup_active_credit(&env, &registry, &admin, &seller2);

    marketplace.create_offer(&seller1, &credit_id1, &(10*1000), &500, &token_id, &None);
    marketplace.create_offer(&seller2, &credit_id2, &(20*1000), &300, &token_id, &None);

    let listings = marketplace.get_listings(&None, &None, &None, &0, &10);
    assert_eq!(listings.len(), 2);

    // Cancelled offers should not appear
    marketplace.cancel_offer(&seller1, &1);
    let listings = marketplace.get_listings(&None, &None, &None, &0, &10);
    assert_eq!(listings.len(), 1);
}

#[test]
fn test_get_offers_by_seller() {
    let env = Env::default();
    let (admin, _registry_id, marketplace, registry, token_id) = setup_test(&env);
    
    let seller = Address::generate(&env);
    let credit_id1 = setup_active_credit(&env, &registry, &admin, &seller);
    let credit_id2 = setup_active_credit(&env, &registry, &admin, &seller);

    marketplace.create_offer(&seller, &credit_id1, &(10*1000), &500, &token_id, &None);
    marketplace.create_offer(&seller, &credit_id2, &(20*1000), &300, &token_id, &None);

    let offers = marketplace.get_offers_by_seller(&seller);
    assert_eq!(offers.len(), 2);
}

#[test]
fn test_create_offer_invalid_amount() {
    let env = Env::default();
    let (admin, _registry_id, marketplace, registry, token_id) = setup_test(&env);
    
    let seller = Address::generate(&env);
    let credit_id = setup_active_credit(&env, &registry, &admin, &seller);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        marketplace.create_offer(&seller, &credit_id, &(10*1000), &0, &token_id, &None);
    }));
    assert!(result.is_err());
}

#[test]
fn test_create_offer_invalid_price() {
    let env = Env::default();
    let (admin, _registry_id, marketplace, registry, token_id) = setup_test(&env);
    
    let seller = Address::generate(&env);
    let credit_id = setup_active_credit(&env, &registry, &admin, &seller);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        marketplace.create_offer(&seller, &credit_id, &0, &500, &token_id, &None);
    }));
    assert!(result.is_err());
}

#[test]
fn test_cancel_nonexistent_offer() {
    let env = Env::default();
    let (_, _registry_id, marketplace, _registry, _token_id) = setup_test(&env);
    let caller = Address::generate(&env);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        marketplace.cancel_offer(&caller, &999);
    }));
    assert!(result.is_err());
}

#[test]
fn test_buy_nonexistent_offer() {
    let env = Env::default();
    let (_, _registry_id, marketplace, _registry, _token_id) = setup_test(&env);
    let buyer = Address::generate(&env);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        marketplace.buy_credits(&buyer, &999, &100);
    }));
    assert!(result.is_err());
}

#[test]
fn test_cancelled_offer_cannot_be_bought() {
    let env = Env::default();
    let (admin, _registry_id, marketplace, registry, token_id) = setup_test(&env);
    
    let seller = Address::generate(&env);
    let buyer = Address::generate(&env);
    let credit_id = setup_active_credit(&env, &registry, &admin, &seller);

    let token_client = token::StellarAssetClient::new(&env, &token_id);
    token_client.mint(&buyer, &100_000);

    let offer_id = marketplace.create_offer(&seller, &credit_id, &(10*1000), &500, &token_id, &None);
    marketplace.cancel_offer(&seller, &offer_id);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        marketplace.buy_credits(&buyer, &offer_id, &100);
    }));
    assert!(result.is_err());
}

#[test]
fn test_create_offer_with_expiry() {
    let env = Env::default();
    let (admin, _registry_id, marketplace, registry, token_id) = setup_test(&env);
    
    let seller = Address::generate(&env);
    let credit_id = setup_active_credit(&env, &registry, &admin, &seller);

    let future = env.ledger().timestamp() + 86400;
    let offer_id = marketplace.create_offer(&seller, &credit_id, &(10*1000), &500, &token_id, &Some(future));
    
    let offer = marketplace.get_offer(&offer_id);
    assert_eq!(offer.expiry, Some(future));
    assert_eq!(offer.status, OfferStatus::Active);
}
