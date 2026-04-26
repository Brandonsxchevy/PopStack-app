import { Test, TestingModule } from '@nestjs/testing'
import { SessionsService } from './sessions.service'
import { DatabaseService } from '@/database/database.service'
import { PaymentsService } from '../payments/payments.service'
import { ConfigService } from '@nestjs/config'

// Mock Stripe
const mockStripe = {
  checkout: { sessions: { create: jest.fn() } },
  paymentIntents: { capture: jest.fn(), cancel: jest.fn() },
}
jest.mock('stripe', () => ({
  default: jest.fn().mockImplementation(() => mockStripe),
}))

const mockDb = {
  session: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  question: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  thread: {
    updateMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  response: {
    findFirst: jest.fn(),
  },
  helperRequest: {
    findFirst: jest.fn(),
  },
}

const mockPayments = {
  getOrCreateCustomer: jest.fn(),
  createHold: jest.fn(),
  capture: jest.fn(),
  cancel: jest.fn(),
  transferToDeveloper: jest.fn(),
}

const mockConfig = {
  get: jest.fn((key: string) => {
    if (key === 'STRIPE_SECRET_KEY') return 'sk_test_mock'
    if (key === 'APP_URL') return 'https://app.popstack.dev'
    return null
  }),
}

describe('Full session flow: question → accept → pay → complete → approve', () => {
  let service: SessionsService

  // Shared state across steps
  const userId = 'user-1'
  const devId = 'dev-1'
  const questionId = 'question-1'
  const sessionId = 'session-1'
  const paymentIntentId = 'pi_test_123'

  const mockQuestion = {
    id: questionId,
    title: 'My WordPress site is broken',
    status: 'LOCKED',
    preSelectedDevId: null,
    responses: [{ developerId: devId, developer: { name: 'Test Dev' } }],
  }

  const mockSession = {
    id: sessionId,
    questionId,
    userId,
    developerId: devId,
    tier: 'TWENTY',
    status: 'PENDING_ACCEPT',
    stripePaymentIntentId: paymentIntentId,
    escrowStatus: 'HELD',
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: PaymentsService, useValue: mockPayments },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile()

    service = module.get<SessionsService>(SessionsService)
    jest.clearAllMocks()
    mockDb.helperRequest.findFirst.mockResolvedValue(null)
  })

  describe('Step 1 — User creates session (payment hold)', () => {
    it('creates a PENDING_ACCEPT session with escrow held', async () => {
      mockDb.question.findUnique.mockResolvedValue(mockQuestion)
      mockDb.response.findFirst.mockResolvedValue({ developerId: devId })
      mockPayments.createHold.mockResolvedValue({ id: paymentIntentId })
      mockDb.session.create.mockResolvedValue(mockSession)
      mockDb.question.update.mockResolvedValue({})

      const result = await service.create(userId, { questionId, tier: 'TWENTY' })

      expect(mockPayments.createHold).toHaveBeenCalledWith(
        3000,
        expect.objectContaining({ questionId, userId, tier: 'TWENTY' })
      )
      expect(mockDb.session.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PENDING_ACCEPT',
            escrowStatus: 'HELD',
            stripePaymentIntentId: paymentIntentId,
          }),
        })
      )
      expect(mockDb.question.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'AWAITING_ACCEPT' },
        })
      )
      expect(result.status).toBe('PENDING_ACCEPT')
    })

    it('throws if question is not LOCKED', async () => {
      mockDb.question.findUnique.mockResolvedValue({ ...mockQuestion, status: 'OPEN' })

      await expect(service.create(userId, { questionId, tier: 'TWENTY' }))
        .rejects.toThrow('Question is not locked')
    })
  })

  describe('Step 2 — Dev accepts session', () => {
    it('captures payment and sets session to ACTIVE', async () => {
      mockDb.session.findUnique.mockResolvedValue(mockSession)
      mockPayments.capture.mockResolvedValue({})
      mockDb.session.update.mockResolvedValue({ ...mockSession, status: 'ACTIVE' })
      mockDb.question.update.mockResolvedValue({})
      mockDb.thread.updateMany.mockResolvedValue({})

      await service.accept(sessionId, devId)

      expect(mockPayments.capture).toHaveBeenCalledWith(paymentIntentId)
      expect(mockDb.session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'ACTIVE', escrowStatus: 'HELD' }),
        })
      )
      expect(mockDb.thread.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ devSection: 'ACTIVE_WORK' }),
        })
      )
    })

    it('throws ForbiddenException if wrong dev tries to accept', async () => {
      mockDb.session.findUnique.mockResolvedValue(mockSession)

      await expect(service.accept(sessionId, 'wrong-dev'))
        .rejects.toThrow('Forbidden')
    })

    it('throws if session is not PENDING_ACCEPT', async () => {
      mockDb.session.findUnique.mockResolvedValue({ ...mockSession, status: 'ACTIVE' })

      await expect(service.accept(sessionId, devId))
        .rejects.toThrow('Session not awaiting acceptance')
    })
  })

  describe('Step 3 — Dev completes session', () => {
    const activeSession = { ...mockSession, status: 'ACTIVE' }

    it('marks session as ENDED', async () => {
      mockDb.session.findUnique.mockResolvedValue(activeSession)
      mockDb.helperRequest.findFirst.mockResolvedValue(null)
      mockDb.session.update.mockResolvedValue({ ...activeSession, status: 'ENDED' })
      mockDb.thread.updateMany.mockResolvedValue({})

      await service.complete(sessionId, devId)

      expect(mockDb.session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'ENDED' }),
        })
      )
      expect(mockDb.thread.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ devSection: 'COMPLETED' }),
        })
      )
    })

    it('blocks completion if helper is still ACTIVE', async () => {
      mockDb.session.findUnique.mockResolvedValue(activeSession)
      mockDb.helperRequest.findFirst.mockResolvedValue({ id: 'helper-1', status: 'ACTIVE' })

      await expect(service.complete(sessionId, devId))
        .rejects.toThrow('Helper must mark their work complete')
    })

    it('throws if session is not ACTIVE', async () => {
      mockDb.session.findUnique.mockResolvedValue({ ...mockSession, status: 'ENDED' })

      await expect(service.complete(sessionId, devId))
        .rejects.toThrow('Session is not active')
    })
  })

  describe('Step 4 — User approves and releases payment', () => {
    const endedSession = { ...mockSession, status: 'ENDED' }

    it('transfers payment to dev and closes question', async () => {
      mockDb.session.findUnique.mockResolvedValue(endedSession)
      mockPayments.transferToDeveloper.mockResolvedValue({ id: 'tr_test' })
      mockDb.session.update.mockResolvedValue({})
      mockDb.question.update.mockResolvedValue({})

      await service.approve(sessionId, userId)

      expect(mockPayments.transferToDeveloper).toHaveBeenCalledWith(
        paymentIntentId,
        devId,
        sessionId,
      )
      expect(mockDb.session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ escrowStatus: 'RELEASED' }),
        })
      )
      expect(mockDb.question.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'CLOSED' },
        })
      )
    })

    it('throws ForbiddenException if wrong user tries to approve', async () => {
      mockDb.session.findUnique.mockResolvedValue(endedSession)

      await expect(service.approve(sessionId, 'wrong-user'))
        .rejects.toThrow('Forbidden')
    })

    it('throws if session is not ENDED', async () => {
      mockDb.session.findUnique.mockResolvedValue({ ...mockSession, status: 'ACTIVE' })

      await expect(service.approve(sessionId, userId))
        .rejects.toThrow()
    })
  })

  describe('Full flow — all steps in sequence', () => {
    it('completes the entire lifecycle without errors', async () => {
      // Step 1: Create session
      mockDb.question.findUnique.mockResolvedValue(mockQuestion)
      mockDb.response.findFirst.mockResolvedValue({ developerId: devId })
      mockPayments.createHold.mockResolvedValue({ id: paymentIntentId })
      mockDb.session.create.mockResolvedValue(mockSession)
      mockDb.question.update.mockResolvedValue({})
      await service.create(userId, { questionId, tier: 'TWENTY' })

      // Step 2: Dev accepts
      mockDb.session.findUnique.mockResolvedValue(mockSession)
      mockPayments.capture.mockResolvedValue({})
      mockDb.session.update.mockResolvedValue({ ...mockSession, status: 'ACTIVE' })
      mockDb.thread.updateMany.mockResolvedValue({})
      await service.accept(sessionId, devId)

      // Step 3: Dev completes
      mockDb.session.findUnique.mockResolvedValue({ ...mockSession, status: 'ACTIVE' })
      mockDb.helperRequest.findFirst.mockResolvedValue(null)
      mockDb.session.update.mockResolvedValue({ ...mockSession, status: 'ENDED' })
      await service.complete(sessionId, devId)

      // Step 4: User approves
      mockDb.session.findUnique.mockResolvedValue({ ...mockSession, status: 'ENDED' })
      mockPayments.transferToDeveloper.mockResolvedValue({ id: 'tr_test' })
      mockDb.session.update.mockResolvedValue({})
      mockDb.question.update.mockResolvedValue({})
      await service.approve(sessionId, userId)

      // Verify final state
      expect(mockPayments.createHold).toHaveBeenCalledTimes(1)
      expect(mockPayments.capture).toHaveBeenCalledTimes(1)
      expect(mockPayments.transferToDeveloper).toHaveBeenCalledTimes(1)
      expect(mockPayments.cancel).not.toHaveBeenCalled()
    })
  })
})
