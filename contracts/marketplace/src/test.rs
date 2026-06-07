#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, BytesN, Env, token};
use carbonveritas_credit_registry::{CreditRegistry, CreditRegistryClient};
use carbonveritas_shared::credit_metadata::{CreditMetadata, CreditStatus, OfferStatus};

fn setup_test(env: &Env) -> (Address, Address, Address, MarketplaceClient<'static>, CreditRegistryClient<'static>, Address) {
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
    
    (admin, registry_id, marketplace_id, marketplace_client, registry_client, token_address)
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

#[test]
fn test_marketplace_buy() {
    let env = Env::default();
    let (admin, _registry_id, _marketplace_id, marketplace, registry, token_id) = setup_test(&env);
    
    let seller = Address::generate(&env);
    let buyer = Address::generate(&env);
    let verifier = Address::generate(&env);
    registry.add_verifier(&admin, &verifier);

    let metadata = create_metadata(&env);
    let credit_id = registry.submit_credit(&seller, &metadata, &String::from_str(&env, "ipfs://hash"));
    registry.approve_and_mint(&verifier, &credit_id, &String::from_str(&env, "ok"));

    // Fund buyer with some tokens
    let token_client = token::StellarAssetClient::new(&env, &token_id);
    token_client.mint(&buyer, &100_000);

    // Create offer: 500 tonnes @ 20 tokens per tonne (total 10,000)
    let amount = 500;
    let price = 20 * 1000; // 20 units per tonne
    let offer_id = marketplace.create_offer(&seller, &credit_id, &price, &amount, &token_id, &None);

    marketplace.buy_credits(&buyer, &offer_id, &amount);

    assert_eq!(registry.get_owner(&credit_id), buyer);
    
    let token_logic = token::Client::new(&env, &token_id);
    assert_eq!(token_logic.balance(&seller), 10_000);
}

#[test]
fn test_cancel_offer() {
    let env = Env::default();
    let (_admin, _registry_id, marketplace_id, marketplace, registry, token_id) = setup_test(&env);
    
    let seller = Address::generate(&env);
    let verifier = Address::generate(&env);
    registry.add_verifier(&_admin, &verifier);

    let metadata = create_metadata(&env);
    let credit_id = registry.submit_credit(&seller, &metadata, &String::from_str(&env, "ipfs://hash"));
    registry.approve_and_mint(&verifier, &credit_id, &String::from_str(&env, "ok"));

    let offer_id = marketplace.create_offer(&seller, &credit_id, &(10*1000), &1000, &token_id, &None);
    assert_eq!(registry.get_owner(&credit_id), marketplace_id);

    marketplace.cancel_offer(&seller, &offer_id);
    assert_eq!(registry.get_owner(&credit_id), seller);
    
    let offer = marketplace.get_offer(&offer_id);
    assert_eq!(offer.status, OfferStatus::Cancelled);
}
