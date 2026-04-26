import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { PaymentsService } from './payments.service'
import { DatabaseService } from '@/database/database.service'

// Mock Stripe
const mockStripe = {
  paymentIntents: {
    retrieve: jest.fn(),
    capture: jest.fn(),
    cancel: jest.fn(),
    create: jest.fn(),
  },
  transfers: {
    create: jest.fn(),
  },
  accounts: {
    create: jest.fn(),
    retrieve: jest.fn(),
  },
  accountLinks: {
    create: jest.fn(),
  },
  refunds: {
    create: jest.fn(),
  },
}

jest.mock('stripe', () => {
  return {
    default: jest.fn().mockImplementation(() => mockStripe),
  }
})

const mockDb = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}

const mockConfig = {
  get: jest.fn((key: string) => {
    if (key === 'STRIPE_SECRET_KEY') return 'sk_test_mock'
    if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_mock'
    return null
  }),
}

describe('PaymentsService — cashout / Stripe Connect', () => {
  let service: PaymentsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile()

    service = module.get<PaymentsService>(PaymentsService)
    jest.clearAllMocks()
  })

  // ─── transferToDeveloper ────────────────────────────────────────────────────

  describe('transferToDeveloper', () => {
    it('transfers net amount (minus 15% fee) to developer Stripe account', async () => {
      mockDb.user.findUnique.mockResolvedValue({
        id: 'dev-1',
        stripeAccountId: 'acct_test123',
      })
      mockStripe.paymentIntents.retrieve.mockResolvedValue({
        amount_received: 3000, // $30.00
      })
      mockStripe.transfers.create.mockResolvedValue({ id: 'tr_test' })

      await service.transferToDeveloper('pi_test', 'dev-1', 'session-1')

      expect(mockStripe.transfers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 2550, // $30 - 15% = $25.50
          currency: 'usd',
          destination: 'acct_test123',
          transfer_group: 'session-1',
        }),
      )
    })

    it('returns null and logs warning if developer has no Stripe account', async () => {
      mockDb.user.findUnique.mockResolvedValue({
        id: 'dev-1',
        stripeAccountId: null,
      })

      const result = await service.transferToDeveloper('pi_test', 'dev-1', 'session-1')

      expect(result).toBeNull()
      expect(mockStripe.transfers.create).not.toHaveBeenCalled()
    })

    it('returns null if developer not found', async () => {
      mockDb.user.findUnique.mockResolvedValue(null)

      const result = await service.transferToDeveloper('pi_test', 'dev-1', 'session-1')

      expect(result).toBeNull()
      expect(mockStripe.transfers.create).not.toHaveBeenCalled()
    })

    it('calculates 15% platform fee correctly for different tiers', async () => {
      mockDb.user.findUnique.mockResolvedValue({ stripeAccountId: 'acct_test' })

      // FIVE tier — $7.50
      mockStripe.paymentIntents.retrieve.mockResolvedValue({ amount_received: 750 })
      mockStripe.transfers.create.mockResolvedValue({ id: 'tr_1' })
      await service.transferToDeveloper('pi_1', 'dev-1', 'session-1')
      expect(mockStripe.transfers.create).toHaveBeenLastCalledWith(
        expect.objectContaining({ amount: 638 }) // $7.50 - 15% = $6.375 → 638 cents
      )

      // FULL_SOLUTION tier — $75.00
      mockStripe.paymentIntents.retrieve.mockResolvedValue({ amount_received: 7500 })
      await service.transferToDeveloper('pi_2', 'dev-1', 'session-2')
      expect(mockStripe.transfers.create).toHaveBeenLastCalledWith(
        expect.objectContaining({ amount: 6375 }) // $75 - 15% = $63.75
      )
    })
  })

  // ─── createConnectAccount ───────────────────────────────────────────────────

  describe('createConnectAccount', () => {
    it('creates Stripe Express account and saves stripeAccountId to user', async () => {
      mockStripe.accounts.create.mockResolvedValue({ id: 'acct_new123' })
      mockDb.user.update.mockResolvedValue({})

      await service.createConnectAccount('dev-1', 'dev@test.com')

      expect(mockStripe.accounts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'express',
          email: 'dev@test.com',
          metadata: { developerId: 'dev-1' },
        }),
      )
      expect(mockDb.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'dev-1' },
          data: { stripeAccountId: 'acct_new123' },
        }),
      )
    })
  })

  // ─── createConnectOnboardingLink ────────────────────────────────────────────

  describe('createConnectOnboardingLink', () => {
    it('creates onboarding link with correct return and refresh URLs', async () => {
      mockStripe.accountLinks.create.mockResolvedValue({
        url: 'https://connect.stripe.com/setup/e/acct_test/abc123',
      })

      const result = await service.createConnectOnboardingLink(
        'acct_test123',
        'https://app.popstack.dev/profile?onboarded=true',
        'https://app.popstack.dev/profile?onboarding=retry',
      )

      expect(mockStripe.accountLinks.create).toHaveBeenCalledWith({
        account: 'acct_test123',
        return_url: 'https://app.popstack.dev/profile?onboarded=true',
        refresh_url: 'https://app.popstack.dev/profile?onboarding=retry',
        type: 'account_onboarding',
      })
      expect(result.url).toContain('connect.stripe.com')
    })
  })

  // ─── getConnectAccountStatus ────────────────────────────────────────────────

  describe('getConnectAccountStatus', () => {
    it('returns enabled status for fully onboarded account', async () => {
      mockStripe.accounts.retrieve.mockResolvedValue({
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
      })

      const result = await service.getConnectAccountStatus('acct_test123')

      expect(result).toEqual({
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
      })
    })

    it('returns disabled status for incomplete onboarding', async () => {
      mockStripe.accounts.retrieve.mockResolvedValue({
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
      })

      const result = await service.getConnectAccountStatus('acct_test123')

      expect(result).toEqual({
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
      })
    })
  })
})
