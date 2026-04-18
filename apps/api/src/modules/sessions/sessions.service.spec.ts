import { Test, TestingModule } from '@nestjs/testing'
import { SessionsService } from './sessions.service'
import { DatabaseService } from '@/database/database.service'
import { PaymentsService } from '../payments/payments.service'
import { ConfigService } from '@nestjs/config'
import { ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common'

const mockSession = {
  id: 'session-1',
  questionId: 'question-1',
  userId: 'user-1',
  developerId: 'dev-1',
  status: 'PENDING_ACCEPT',
  stripePaymentIntentId: 'pi_test',
  escrowStatus: 'HELD',
  tier: 'FIFTEEN_MIN',
  durationSeconds: 900,
  startedAt: null,
  endedAt: null,
  proposalId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockDb = {
  session: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  question: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  thread: {
    updateMany: jest.fn(),
  },
  response: {
    findFirst: jest.fn(),
  },
  proposal: {
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
}

const mockPayments = {
  capture: jest.fn(),
  cancel: jest.fn(),
  transferToDeveloper: jest.fn(),
  createHold: jest.fn(),
  getOrCreateCustomer: jest.fn(),
}

const mockConfig = {
  get: jest.fn().mockReturnValue('sk_test_fake'),
}

describe('SessionsService', () => {
  let service: SessionsService

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
  })

  describe('accept', () => {
    it('accepts a PENDING_ACCEPT session and updates thread to ACTIVE_WORK', async () => {
      mockDb.session.findUnique.mockResolvedValue({ ...mockSession, status: 'PENDING_ACCEPT' })
      mockDb.session.update.mockResolvedValue({ ...mockSession, status: 'ACTIVE' })
      mockDb.question.update.mockResolvedValue({})
      mockDb.thread.updateMany.mockResolvedValue({})
      mockPayments.capture.mockResolvedValue({})

      const result = await service.accept('session-1', 'dev-1')

      expect(mockPayments.capture).toHaveBeenCalledWith('pi_test')
      expect(mockDb.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: expect.objectContaining({ status: 'ACTIVE' }),
      })
      expect(mockDb.thread.updateMany).toHaveBeenCalledWith({
        where: { sessionId: 'session-1' },
        data: { devSection: 'ACTIVE_WORK', status: 'ACTIVE' },
      })
      expect(result).toEqual({ message: 'Session accepted' })
    })

    it('throws ForbiddenException if wrong developer tries to accept', async () => {
      mockDb.session.findUnique.mockResolvedValue({ ...mockSession, status: 'PENDING_ACCEPT' })

      await expect(service.accept('session-1', 'wrong-dev')).rejects.toThrow(ForbiddenException)
      expect(mockPayments.capture).not.toHaveBeenCalled()
    })

    it('throws BadRequestException if session is not PENDING_ACCEPT', async () => {
      mockDb.session.findUnique.mockResolvedValue({ ...mockSession, status: 'ACTIVE' })

      await expect(service.accept('session-1', 'dev-1')).rejects.toThrow(BadRequestException)
      expect(mockPayments.capture).not.toHaveBeenCalled()
    })

    it('throws NotFoundException if session does not exist', async () => {
      mockDb.session.findUnique.mockResolvedValue(null)

      await expect(service.accept('session-1', 'dev-1')).rejects.toThrow(NotFoundException)
    })
  })

  describe('complete', () => {
    it('marks session ENDED and thread COMPLETED', async () => {
      mockDb.session.findUnique.mockResolvedValue({ ...mockSession, status: 'ACTIVE' })
      mockDb.session.update.mockResolvedValue({})
      mockDb.thread.updateMany.mockResolvedValue({})

      const result = await service.complete('session-1', 'dev-1')

      expect(mockDb.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: expect.objectContaining({ status: 'ENDED' }),
      })
      expect(mockDb.thread.updateMany).toHaveBeenCalledWith({
        where: { sessionId: 'session-1' },
        data: { devSection: 'COMPLETED', status: 'COMPLETED' },
      })
      expect(result.message).toContain('24h')
    })

    it('throws BadRequestException if session is not ACTIVE', async () => {
      mockDb.session.findUnique.mockResolvedValue({ ...mockSession, status: 'PENDING_ACCEPT' })

      await expect(service.complete('session-1', 'dev-1')).rejects.toThrow(BadRequestException)
    })

    it('throws ForbiddenException if wrong developer', async () => {
      mockDb.session.findUnique.mockResolvedValue({ ...mockSession, status: 'ACTIVE' })

      await expect(service.complete('session-1', 'wrong-dev')).rejects.toThrow(ForbiddenException)
    })
  })

  describe('approve', () => {
    it('releases payment and closes question', async () => {
      mockDb.session.findUnique.mockResolvedValue({ ...mockSession, status: 'ENDED' })
      mockDb.session.update.mockResolvedValue({})
      mockDb.question.update.mockResolvedValue({})
      mockPayments.transferToDeveloper.mockResolvedValue({})

      const result = await service.approve('session-1', 'user-1')

      expect(mockPayments.transferToDeveloper).toHaveBeenCalledWith('pi_test', 'dev-1', 'session-1')
      expect(mockDb.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: expect.objectContaining({ escrowStatus: 'RELEASED' }),
      })
      expect(mockDb.question.update).toHaveBeenCalledWith({
        where: { id: 'question-1' },
        data: { status: 'CLOSED' },
      })
      expect(result.message).toContain('released')
    })

    it('throws ForbiddenException if wrong user tries to approve', async () => {
      mockDb.session.findUnique.mockResolvedValue({ ...mockSession, status: 'ENDED' })

      await expect(service.approve('session-1', 'wrong-user')).rejects.toThrow(ForbiddenException)
      expect(mockPayments.transferToDeveloper).not.toHaveBeenCalled()
    })

    it('throws BadRequestException if session is not ENDED', async () => {
      mockDb.session.findUnique.mockResolvedValue({ ...mockSession, status: 'ACTIVE' })

      await expect(service.approve('session-1', 'user-1')).rejects.toThrow(BadRequestException)
    })
  })

  describe('decline', () => {
    it('cancels payment and re-opens question', async () => {
      mockDb.session.findUnique.mockResolvedValue({ ...mockSession, status: 'PENDING_ACCEPT' })
      mockDb.session.update.mockResolvedValue({})
      mockDb.question.update.mockResolvedValue({})
      mockPayments.cancel.mockResolvedValue({})

      const result = await service.decline('session-1', 'dev-1')

      expect(mockPayments.cancel).toHaveBeenCalledWith('pi_test')
      expect(mockDb.question.update).toHaveBeenCalledWith({
        where: { id: 'question-1' },
        data: { status: 'LOCKED' },
      })
      expect(result.message).toContain('declined')
    })
  })
})
