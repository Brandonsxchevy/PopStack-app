import { Test, TestingModule } from '@nestjs/testing'
import { AdminService } from './admin.service'
import { DatabaseService } from '@/database/database.service'

const mockDb = {
  question: {
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  session: {
    findFirst: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  swipe: {
    deleteMany: jest.fn(),
  },
  response: {
    deleteMany: jest.fn(),
  },
  thread: {
    deleteMany: jest.fn(),
  },
  user: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  flag: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
}

const mockStripe = {
  paymentIntents: {
    cancel: jest.fn(),
  },
}

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => mockStripe)
})

describe('AdminService', () => {
  let service: AdminService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: DatabaseService, useValue: mockDb },
      ],
    }).compile()

    service = module.get<AdminService>(AdminService)
    jest.clearAllMocks()
  })

  describe('trashQuestion', () => {
    it('sets question status to TRASHED', async () => {
      mockDb.question.update.mockResolvedValue({ id: 'q-1', status: 'TRASHED' })

      const result = await service.trashQuestion('q-1')

      expect(mockDb.question.update).toHaveBeenCalledWith({
        where: { id: 'q-1' },
        data: { status: 'TRASHED' },
      })
      expect(result.status).toBe('TRASHED')
    })
  })

  describe('refundQuestion', () => {
    it('cancels stripe payment, updates session and question', async () => {
      mockDb.session.findFirst.mockResolvedValue({
        id: 'session-1',
        questionId: 'q-1',
        stripePaymentIntentId: 'pi_test',
        status: 'PENDING_ACCEPT',
      })
      mockStripe.paymentIntents.cancel.mockResolvedValue({})
      mockDb.session.update.mockResolvedValue({})
      mockDb.question.update.mockResolvedValue({ id: 'q-1', status: 'LOCKED' })

      const result = await service.refundQuestion('q-1')

      expect(mockStripe.paymentIntents.cancel).toHaveBeenCalledWith('pi_test')
      expect(mockDb.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { status: 'CANCELLED', escrowStatus: 'REFUNDED' },
      })
      expect(mockDb.question.update).toHaveBeenCalledWith({
        where: { id: 'q-1' },
        data: { status: 'LOCKED' },
      })
      expect(result.message).toContain('Refunded')
    })

    it('throws if no pending session found', async () => {
      mockDb.session.findFirst.mockResolvedValue(null)

      await expect(service.refundQuestion('q-1')).rejects.toThrow('No pending session found')
    })

    it('throws if session has no payment intent', async () => {
      mockDb.session.findFirst.mockResolvedValue({
        id: 'session-1',
        questionId: 'q-1',
        stripePaymentIntentId: null,
        status: 'PENDING_ACCEPT',
      })

      await expect(service.refundQuestion('q-1')).rejects.toThrow('No pending session found')
    })
  })
})
