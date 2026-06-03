use soroban_sdk::contracttype;

pub const MAX_VERIFIERS: u32 = 20;
pub const MAX_BENEFICIARIES: u32 = 20;
pub const PROTOCOL_FEE_BPS: u32 = 50;
pub const APPROVAL_WINDOW_SECONDS: u64 = 604_800;
pub const MAX_TONNES: i128 = 1_000_000_000_000;
pub const MIN_STAKE_AMOUNT: i128 = 1_000_000_000;
pub const COOLDOWN_PERIOD_SECONDS: u64 = 2_592_000;
pub const HEARTBEAT_INTERVAL_SECONDS: u64 = 86_400;
pub const MAX_BATCH_RETIRE: u32 = 100;
pub const MAX_LISTINGS_PAGE: u32 = 50;

#[contracttype]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DataKey {
    Admin = 0,
    CreditCounter = 1,
    VerifierCounter = 2,
    OfferCounter = 3,
    ContractConfig = 4,
}
