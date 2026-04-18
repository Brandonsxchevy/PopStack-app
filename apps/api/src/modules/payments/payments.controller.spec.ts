import { Test, TestingModule } from '@nestjs/testing'
import { PaymentsController } from './payments.controller'
import { PaymentsService } from './payments.service'
import { DatabaseService } from '@/database/database.service'

const mockDb = {
  session: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  question: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  thread: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  retainer: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
}

const mockPayments = {
  constructWebhookEvent: jest.fn(),
}

describe('PaymentsController — webhook', () => {
  let controller: PaymentsController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        { provide: PaymentsService, useValue: mockPayments },
        { provide: DatabaseService, useValue: mockDb },
      ],
    }).compile()

    controller = module.get<PaymentsController>(PaymentsController)
    jest.clearAllMocks()
  })

  const makeReq = (rawBody: Buffer) => ({
    rawBody,
  }) as any

  describe('handleCheckoutCompleted', () => {
    const checkoutSession = {
      id: 'cs_test',
      payment_intent: 'pi_test',
      metadata: { questionId: 'q-1', userId: 'u-1', tier: 'FIFTEEN_MIN' },
    }

    it('creates session and thread when checkout completes', async () => {
      mockPayments.constructWebhookEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: checkoutSession },
      })
      mockDb.session.findFirst.mockResolvedValue(null)
      mockDb.question.findUnique.mockResolvedValue({
        id: 'q-1',
        preSelectedDevId: null,
        responses: [{ developerId: 'dev-1' }],
      })
      mockDb.session.create.mockResolvedValue({ id: 'session-new' })
      mockDb.question.update.mockResolvedValue({})
      mockDb.thread.findUnique.mockResolvedValue(null)
      mockDb.thread.create.mockResolvedValue({})

      const result = await controller.handleStripeWebhook(
        makeReq(Buffer.from('payload')),
        'sig_test',
      )

      expect(mockDb.session.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            questionId: 'q-1',
            userId: 'u-1',
            developerId: 'dev-1',
            status: 'PENDING_ACCEPT',
            tier: 'FIFTEEN_MIN',
          }),
        }),
      )
      expect(mockDb.thread.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            devSection: 'AWAITING_PAYMENT',
            sessionId: 'session-new',
          }),
        }),
      )
      expect(result).toEqual({ received: true })
    })

    it('is idempotent — skips if session already exists', async () => {
      mockPayments.constructWebhookEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: checkoutSession },
      })
      mockDb.session.findFirst.mockResolvedValue({ id: 'existing-session' })

      await controller.handleStripeWebhook(makeReq(Buffer.from('payload')), 'sig_test')

      expect(mockDb.session.create).not.toHaveBeenCalled()
      expect(mockDb.thread.create).not.toHaveBeenCalled()
    })

    it('updates existing thread if one already exists for the question', async () => {
      mockPayments.constructWebhookEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: checkoutSession },
      })
      mockDb.session.findFirst.mockResolvedValue(null)
      mockDb.question.findUnique.mockResolvedValue({
        id: 'q-1',
        preSelectedDevId: null,
        responses: [{ developerId: 'dev-1' }],
      })
      mockDb.session.create.mockResolvedValue({ id: 'session-new' })
      mockDb.question.update.mockResolvedValue({})
      mockDb.thread.findUnique.mockResolvedValue({ id: 'existing-thread' })
      mockDb.thread.update.mockResolvedValue({})

      await controller.handleStripeWebhook(makeReq(Buffer.from('payload')), 'sig_test')

      expect(mockDb.thread.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sessionId: 'session-new',
            devSection: 'AWAITING_PAYMENT',
          }),
        }),
      )
      expect(mockDb.thread.create).not.toHaveBeenCalled()
    })

    it('skips if metadata is missing', async () => {
      mockPayments.constructWebhookEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_test', metadata: {} } },
      })

      await controller.handleStripeWebhook(makeReq(Buffer.from('payload')), 'sig_test')

      expect(mockDb.session.create).not.toHaveBeenCalled()
    })

    it('returns received:true even if webhook verification fails', async () => {
      mockPayments.constructWebhookEvent.mockImplementation(() => {
        throw new Error('Invalid signature')
      })

      const result = await controller.handleStripeWebhook(
        makeReq(Buffer.from('payload')),
        'bad_sig',
      )

      expect(result).toEqual({ received: true })
    })
  })

  describe('handlePaymentFailed', () => {
    it('cancels session and re-opens question on payment failure', async () => {
      mockPayments.constructWebhookEvent.mockReturnValue({
        type: 'payment_intent.payment_failed',
        data: { object: { id: 'pi_failed' } },
      })
      mockDb.session.findFirst.mockResolvedValue({
        id: 'session-1',
        questionId: 'q-1',
      })
      mockDb.session.update.mockResolvedValue({})
      mockDb.question.update.mockResolvedValue({})

      await controller.handleStripeWebhook(makeReq(Buffer.from('payload')), 'sig_test')

      expect(mockDb.session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'CANCELLED', escrowStatus: 'REFUNDED' },
        }),
      )
      expect(mockDb.question.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'LOCKED' },
        }),
      )
    })
  })
})
