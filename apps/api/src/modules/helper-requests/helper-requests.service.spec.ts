import { Test, TestingModule } from '@nestjs/testing'
import { HelperRequestsService } from './helper-requests.service'
import { DatabaseService } from '@/database/database.service'
import { PaymentsService } from '../payments/payments.service'
import { ConfigService } from '@nestjs/config'

const mockStripe = {
  checkout: { sessions: { create: jest.fn() } },
}
jest.mock('stripe', () => ({
  default: jest.fn().mockImplementation(() => mockStripe),
}))

const mockDb = {
  session: {
    findFirst: jest.fn(),
  },
  helperRequest: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
}

const mockPayments = {
  getOrCreateCustomer: jest.fn(),
}

const mockConfig = {
  get: jest.fn((key: string) => {
    if (key === 'STRIPE_SECRET_KEY') return 'sk_test_mock'
    return null
  }),
}

describe('HelperRequestsService', () => {
  let service: HelperRequestsService

  const originalDevId = 'dev-1'
  const helperDevId = 'dev-2'
  const userId = 'user-1'
  const sessionId = 'session-1'
  const questionId = 'question-1'
  const helperRequestId = 'helper-req-1'

  const mockSession = {
    id: sessionId,
    developerId: originalDevId,
    status: 'ACTIVE',
    question: { id: questionId, userId, title: 'Fix my WordPress site' },
  }

  const mockHelperRequest = {
    id: helperRequestId,
    originalSessionId: sessionId,
    originalDevId,
    userId,
    questionId,
    helperDevId: null,
    role: 'FRONTEND',
    scopeDescription: 'Handle the CSS animations',
    tier: 'TWENTY',
    status: 'OPEN',
    question: { title: 'Fix my WordPress site' },
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HelperRequestsService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: PaymentsService, useValue: mockPayments },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile()

    service = module.get<HelperRequestsService>(HelperRequestsService)
    jest.clearAllMocks()
  })

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a helper request for an active session', async () => {
      mockDb.session.findFirst.mockResolvedValue(mockSession)
      mockDb.helperRequest.findFirst.mockResolvedValue(null)
      mockDb.helperRequest.create.mockResolvedValue(mockHelperRequest)

      await service.create(originalDevId, {
        originalSessionId: sessionId,
        questionId,
        role: 'FRONTEND',
        scopeDescription: 'Handle the CSS animations',
        tier: 'TWENTY' as any,
      })

      expect(mockDb.helperRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            originalSessionId: sessionId,
            originalDevId,
            userId,
            status: 'OPEN',
          }),
        })
      )
    })

    it('throws if session is not found or not active', async () => {
      mockDb.session.findFirst.mockResolvedValue(null)

      await expect(service.create(originalDevId, {
        originalSessionId: sessionId,
        questionId,
        role: 'FRONTEND',
        tier: 'TWENTY' as any,
      })).rejects.toThrow('Active session not found')
    })

    it('throws if an active helper request already exists', async () => {
      mockDb.session.findFirst.mockResolvedValue(mockSession)
      mockDb.helperRequest.findFirst.mockResolvedValue({ id: 'existing', status: 'OPEN' })

      await expect(service.create(originalDevId, {
        originalSessionId: sessionId,
        questionId,
        role: 'FRONTEND',
        tier: 'TWENTY' as any,
      })).rejects.toThrow('An active helper request already exists')
    })
  })

  // ─── respond ───────────────────────────────────────────────────────────────

  describe('respond', () => {
    it('sets status to RESPONDED and saves helperDevId', async () => {
      mockDb.helperRequest.findUnique.mockResolvedValue(mockHelperRequest)
      mockDb.helperRequest.update.mockResolvedValue({ ...mockHelperRequest, status: 'RESPONDED', helperDevId })

      await service.respond(helperRequestId, helperDevId)

      expect(mockDb.helperRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'RESPONDED', helperDevId }),
        })
      )
    })

    it('throws ForbiddenException if dev responds to their own request', async () => {
      mockDb.helperRequest.findUnique.mockResolvedValue(mockHelperRequest)

      await expect(service.respond(helperRequestId, originalDevId))
        .rejects.toThrow('Cannot respond to your own helper request')
    })

    it('throws if helper request is no longer open', async () => {
      mockDb.helperRequest.findUnique.mockResolvedValue({ ...mockHelperRequest, status: 'RESPONDED' })

      await expect(service.respond(helperRequestId, helperDevId))
        .rejects.toThrow('Helper request is no longer open')
    })
  })

  // ─── accept ────────────────────────────────────────────────────────────────

  describe('accept', () => {
    const respondedRequest = { ...mockHelperRequest, status: 'RESPONDED', helperDevId }

    it('creates Stripe checkout and returns checkoutUrl', async () => {
      mockDb.helperRequest.findUnique.mockResolvedValue(respondedRequest)
      mockDb.user.findUnique.mockResolvedValue({ id: userId, email: 'user@test.com' })
      mockPayments.getOrCreateCustomer.mockResolvedValue('cus_test123')
      mockStripe.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/test',
      })

      const result = await service.accept(helperRequestId, userId)

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'payment',
          metadata: expect.objectContaining({
            type: 'helper_session',
            helperRequestId,
          }),
        })
      )
      expect(result).toEqual({ checkoutUrl: 'https://checkout.stripe.com/test' })
    })

    it('throws ForbiddenException if wrong user tries to accept', async () => {
      mockDb.helperRequest.findUnique.mockResolvedValue(respondedRequest)

      await expect(service.accept(helperRequestId, 'wrong-user'))
        .rejects.toThrow('Not your request')
    })

    it('throws if no helper has responded yet', async () => {
      mockDb.helperRequest.findUnique.mockResolvedValue({ ...mockHelperRequest, status: 'OPEN' })

      await expect(service.accept(helperRequestId, userId))
        .rejects.toThrow('No helper has responded yet')
    })
  })

  // ─── decline ───────────────────────────────────────────────────────────────

  describe('decline', () => {
    it('sets status to DECLINED and clears helperDevId', async () => {
      mockDb.helperRequest.findUnique.mockResolvedValue({ ...mockHelperRequest, status: 'RESPONDED', helperDevId })
      mockDb.helperRequest.update.mockResolvedValue({})

      await service.decline(helperRequestId, userId)

      expect(mockDb.helperRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'DECLINED', helperDevId: null }),
        })
      )
    })

    it('throws ForbiddenException if wrong user tries to decline', async () => {
      mockDb.helperRequest.findUnique.mockResolvedValue({ ...mockHelperRequest, status: 'RESPONDED' })

      await expect(service.decline(helperRequestId, 'wrong-user'))
        .rejects.toThrow('Not your request')
    })
  })

  // ─── complete ──────────────────────────────────────────────────────────────

  describe('complete', () => {
    const activeRequest = { ...mockHelperRequest, status: 'ACTIVE', helperDevId }

    it('marks helper request as COMPLETED', async () => {
      mockDb.helperRequest.findUnique.mockResolvedValue(activeRequest)
      mockDb.helperRequest.update.mockResolvedValue({ ...activeRequest, status: 'COMPLETED' })

      await service.complete(helperRequestId, helperDevId)

      expect(mockDb.helperRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'COMPLETED' },
        })
      )
    })

    it('throws ForbiddenException if wrong dev tries to complete', async () => {
      mockDb.helperRequest.findUnique.mockResolvedValue(activeRequest)

      await expect(service.complete(helperRequestId, 'wrong-dev'))
        .rejects.toThrow('Not your helper request')
    })

    it('throws if helper request is not active', async () => {
      mockDb.helperRequest.findUnique.mockResolvedValue({ ...activeRequest, status: 'RESPONDED' })

      await expect(service.complete(helperRequestId, helperDevId))
        .rejects.toThrow('Helper request is not active')
    })
  })

  // ─── Full flow ─────────────────────────────────────────────────────────────

  describe('Full helper flow', () => {
    it('completes the full lifecycle: create → respond → accept → complete', async () => {
      // Step 1: Create
      mockDb.session.findFirst.mockResolvedValue(mockSession)
      mockDb.helperRequest.findFirst.mockResolvedValue(null)
      mockDb.helperRequest.create.mockResolvedValue(mockHelperRequest)
      await service.create(originalDevId, { originalSessionId: sessionId, questionId, role: 'FRONTEND', tier: 'TWENTY' as any })

      // Step 2: Respond
      mockDb.helperRequest.findUnique.mockResolvedValue(mockHelperRequest)
      mockDb.helperRequest.update.mockResolvedValue({ ...mockHelperRequest, status: 'RESPONDED', helperDevId })
      await service.respond(helperRequestId, helperDevId)

      // Step 3: Accept → Stripe checkout
      mockDb.helperRequest.findUnique.mockResolvedValue({ ...mockHelperRequest, status: 'RESPONDED', helperDevId })
      mockDb.user.findUnique.mockResolvedValue({ id: userId, email: 'user@test.com' })
      mockPayments.getOrCreateCustomer.mockResolvedValue('cus_test123')
      mockStripe.checkout.sessions.create.mockResolvedValue({ url: 'https://checkout.stripe.com/test' })
      const result = await service.accept(helperRequestId, userId)
      expect(result.checkoutUrl).toBeTruthy()

      // Step 4: Complete (after webhook sets ACTIVE)
      mockDb.helperRequest.findUnique.mockResolvedValue({ ...mockHelperRequest, status: 'ACTIVE', helperDevId })
      mockDb.helperRequest.update.mockResolvedValue({ ...mockHelperRequest, status: 'COMPLETED' })
      await service.complete(helperRequestId, helperDevId)

      expect(mockDb.helperRequest.update).toHaveBeenLastCalledWith(
        expect.objectContaining({ data: { status: 'COMPLETED' } })
      )
    })
  })
})
