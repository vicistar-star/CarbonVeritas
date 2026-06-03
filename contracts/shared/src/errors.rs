use soroban_sdk::contracterror;

#[contracterror]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u32)]
pub enum Error {
    // General (100–199)
    NotAuthorized = 100,
    NotFound = 101,
    AlreadyExists = 102,
    InvalidInput = 103,
    InternalError = 104,
    NotAllowed = 105,

    // Credits (200–299)
    CreditNotFound = 200,
    CreditNotPending = 201,
    CreditNotActive = 202,
    CreditAlreadyRetired = 203,
    CreditAlreadyRejected = 204,
    CreditNotOwned = 205,
    AlreadyApproved = 206,
    ApprovalThresholdNotMet = 207,
    RejectionThresholdNotMet = 208,
    AlreadyVoted = 209,

    // Marketplace (300–399)
    OfferNotFound = 300,
    OfferExpired = 301,
    OfferAlreadyFilled = 302,
    OfferCancelled = 303,
    InsufficientAmount = 304,
    OfferNotCancellable = 305,

    // Bridge (400–499)
    InvalidProof = 400,
    RegistryNotFound = 401,
    AlreadyBridged = 402,

    // Verifier (500–599)
    VerifierNotFound = 500,
    VerifierAlreadyRegistered = 501,
    InsufficientStake = 502,
    VerifierNotActive = 503,
    CooldownActive = 504,
}
