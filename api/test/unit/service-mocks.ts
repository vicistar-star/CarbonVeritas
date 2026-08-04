export function createPrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    credit: {
      aggregate: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    approval: {
      aggregate: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    verifier: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    offer: {
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    trade: {
      aggregate: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    retirement: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    certificate: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
    },
    webhook: {
      create: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
    },
    challenge: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
}

export function createStellarMock() {
  return {
    submitCredit: jest.fn(),
    approveAndMint: jest.fn(),
    rejectCredit: jest.fn(),
    transferCredit: jest.fn(),
    retire: jest.fn(),
    isRetired: jest.fn(),
    createOffer: jest.fn(),
    buyCredits: jest.fn(),
    cancelOffer: jest.fn(),
    registerVerifier: jest.fn(),
    getCertificateHash: jest.fn(),
  };
}
