use soroban_sdk::{contracttype, Address, BytesN, String, Vec};

#[contracttype]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u32)]
pub enum CreditStatus {
    Pending = 0,
    Active = 1,
    Retired = 2,
    Rejected = 3,
    Bridged = 4,
}

#[contracttype]
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreditMetadata {
    pub project_id: String,
    pub methodology: String,
    pub vintage_start: u64,
    pub vintage_end: u64,
    pub tonnes: i128,
    pub geography: String,
    pub serial_prefix: String,
    pub sdg_flags: u32,
    pub permanence_rating: u32,
    pub buffer_contribution_pct: u32,
    pub additionality_type: u32,
    pub ipfs_hash: String,
    pub status: CreditStatus,
    pub created_at: u64,
    pub token_id: BytesN<32>,
}

#[contracttype]
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ApprovalRecord {
    pub verifier: Address,
    pub approved: bool,
    pub timestamp: u64,
    pub comments: String,
}

#[contracttype]
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Offer {
    pub offer_id: u64,
    pub seller: Address,
    pub credit_id: u64,
    pub price_per_tonne: i128,
    pub amount: i128,
    pub filled: i128,
    pub currency: Address,
    pub expiry: Option<u64>,
    pub created_at: u64,
    pub status: OfferStatus,
}

#[contracttype]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u32)]
pub enum OfferStatus {
    Active = 0,
    Filled = 1,
    Cancelled = 2,
    Expired = 3,
}

#[contracttype]
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RetirementRecord {
    pub credit_id: u64,
    pub retired_by: Address,
    pub beneficiary: String,
    pub reason: String,
    pub accounting_period: String,
    pub tonnes_retired: i128,
    pub tx_hash: BytesN<32>,
    pub ledger_sequence: u32,
    pub timestamp: u64,
    pub certificate_hash: BytesN<32>,
}

#[contracttype]
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Verifier {
    pub address: Address,
    pub total_staked: i128,
    pub reputation_score: u32,
    pub approval_count: u32,
    pub rejection_count: u32,
    pub last_heartbeat: u64,
    pub registered_at: u64,
}

#[contracttype]
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RevenueConfig {
    pub project_id: String,
    pub beneficiaries: Vec<(Address, u32)>,
    pub protocol_fee_bps: u32,
}

#[contracttype]
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ContractConfig {
    pub admin: Address,
    pub verifier_threshold: u32,
    pub verifier_quorum: u32,
    pub approval_window: u64,
    pub protocol_fee_bps: u32,
    pub buffer_pool_pct: u32,
}
