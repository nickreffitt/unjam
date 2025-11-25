import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BillingAccountManager } from './BillingAccountManager';
import type { BillingAccountStore } from './store/BillingAccountStore';
import type { BillingBankTransferAccountStore } from './store/BillingBankTransferAccountStore';
import type { ApiManager } from '@common/features/ApiManager';
import type { EngineerAccount, EngineerProfile } from '@common/types';

describe('BillingAccountManager', () => {
  let manager: BillingAccountManager;
  let mockStore: BillingAccountStore;
  let mockBankTransferStore: BillingBankTransferAccountStore;
  let mockApiManager: ApiManager;

  const createTestAccount = (overrides?: Partial<EngineerAccount>): EngineerAccount => ({
    id: 'acct_test123',
    engineerId: 'eng-123',
    email: 'engineer@example.com',
    detailsSubmitted: true,
    chargesEnabled: true,
    payoutsEnabled: true,
    verificationStatus: 'active',
    currentDeadline: null,
    disabledReason: null,
    ...overrides,
  });

  const createTestEngineerProfile = (overrides?: Partial<EngineerProfile>): EngineerProfile => ({
    id: 'eng-123',
    name: 'Test Engineer',
    type: 'engineer',
    email: 'engineer@example.com',
    githubUsername: 'testeng',
    specialties: ['JavaScript', 'React'],
    ...overrides,
  });

  beforeEach(() => {
    mockStore = {
      getByProfileId: vi.fn(),
    };

    mockBankTransferStore = {
      getByProfileId: vi.fn(),
    } as any;

    mockApiManager = {
      createEngineerAccountLink: vi.fn(),
      createBillingPortalLink: vi.fn(),
      createEngineerLoginLink: vi.fn(),
      createEngineerRecipientForm: vi.fn(),
      createEngineerRecipient: vi.fn(),
      createEngineerBeneficiaryAuthCode: vi.fn(),
      createEngineerBeneficiary: vi.fn(),
      deleteEngineerBeneficiary: vi.fn(),
    } as any;

    const engineerProfile = createTestEngineerProfile();
    manager = new BillingAccountManager(mockStore, mockBankTransferStore, mockApiManager, engineerProfile);
  });

  describe('constructor', () => {
    it('throws error when billingAccountStore is not provided', () => {
      // when creating manager without store
      // then error should be thrown
      const engineerProfile = createTestEngineerProfile();
      expect(() => new BillingAccountManager(null as any, mockBankTransferStore, mockApiManager, engineerProfile)).toThrow(
        'BillingAccountManager: billingAccountStore is required'
      );
    });

    it('throws error when billingBankTransferAccountStore is not provided', () => {
      // when creating manager without bank transfer store
      // then error should be thrown
      const engineerProfile = createTestEngineerProfile();
      expect(() => new BillingAccountManager(mockStore, null as any, mockApiManager, engineerProfile)).toThrow(
        'BillingAccountManager: billingBankTransferAccountStore is required'
      );
    });

    it('throws error when apiManager is not provided', () => {
      // when creating manager without apiManager
      // then error should be thrown
      const engineerProfile = createTestEngineerProfile();
      expect(() => new BillingAccountManager(mockStore, mockBankTransferStore, null as any, engineerProfile)).toThrow(
        'BillingAccountManager: apiManager is required'
      );
    });

    it('throws error when engineerProfile is not provided', () => {
      // when creating manager without engineerProfile
      // then error should be thrown
      expect(() => new BillingAccountManager(mockStore, mockBankTransferStore, mockApiManager, null as any)).toThrow(
        'BillingAccountManager: engineerProfile is required'
      );
    });
  });

  describe('getAccount', () => {
    it('returns account when found', async () => {
      // given an account exists
      const account = createTestAccount();
      vi.mocked(mockStore.getByProfileId).mockResolvedValue(account);

      // when getting account
      const result = await manager.getAccount();

      // then account should be returned
      expect(result).toEqual(account);
      expect(mockStore.getByProfileId).toHaveBeenCalledWith('eng-123');
    });

    it('returns null when account not found', async () => {
      // given no account exists
      vi.mocked(mockStore.getByProfileId).mockResolvedValue(null);

      // when getting account
      const result = await manager.getAccount();

      // then null should be returned
      expect(result).toBeNull();
      expect(mockStore.getByProfileId).toHaveBeenCalledWith('eng-123');
    });
  });

  describe('createAccountLink', () => {
    it('calls apiManager to create engineer account link', async () => {
      // given an engineer profile
      const engineerProfile = createTestEngineerProfile();
      const expectedUrl = 'https://connect.stripe.com/setup/acct_123';
      vi.mocked(mockApiManager.createEngineerAccountLink).mockResolvedValue(expectedUrl);

      // when creating account link
      const result = await manager.createAccountLink(engineerProfile);

      // then apiManager should be called and URL returned
      expect(result).toBe(expectedUrl);
      expect(mockApiManager.createEngineerAccountLink).toHaveBeenCalledWith(engineerProfile);
    });

    it('throws error when apiManager fails', async () => {
      // given an engineer profile
      const engineerProfile = createTestEngineerProfile();
      const error = new Error('Failed to create account link');
      vi.mocked(mockApiManager.createEngineerAccountLink).mockRejectedValue(error);

      // when creating account link fails
      // then error should be thrown
      await expect(manager.createAccountLink(engineerProfile)).rejects.toThrow('Failed to create account link');
    });
  });
});
