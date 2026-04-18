import { Test, TestingModule } from '@nestjs/testing'
import { QuestionsService } from './questions.service'
import { DatabaseService } from '@/database/database.service'
import { FingerprintService } from '../fingerprint/fingerprint.service'
import { BadRequestException } from '@nestjs/common'

const mockDb = {
  question: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
  },
  swipe: { deleteMany: jest.fn() },
  response: { deleteMany: jest.fn() },
  thread: { deleteMany: jest.fn(), create: jest.fn() },
}

const mockFingerprint = {
  enqueue: jest.fn(),
}

describe('QuestionsService — deleteQuestion', () => {
  let service: QuestionsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionsService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: FingerprintService, useValue: mockFingerprint },
      ],
    }).compile()

    service = module.get<QuestionsService>(QuestionsService)
    jest.clearAllMocks()
  })

  it('deletes an OPEN question and cleans up related records', async () => {
    mockDb.question.findUnique.mockResolvedValue({
      id: 'q-1', userId: 'user-1', status: 'OPEN',
    })
    mockDb.swipe.deleteMany.mockResolvedValue({})
    mockDb.response.deleteMany.mockResolvedValue({})
    mockDb.thread.deleteMany.mockResolvedValue({})
    mockDb.question.delete.mockResolvedValue({ id: 'q-1' })

    await service.deleteQuestion('q-1', 'user-1')

    expect(mockDb.swipe.deleteMany).toHaveBeenCalledWith({ where: { questionId: 'q-1' } })
    expect(mockDb.response.deleteMany).toHaveBeenCalledWith({ where: { questionId: 'q-1' } })
    expect(mockDb.thread.deleteMany).toHaveBeenCalledWith({ where: { questionId: 'q-1' } })
    expect(mockDb.question.delete).toHaveBeenCalledWith({ where: { id: 'q-1' } })
  })

  it('deletes a LOCKED question', async () => {
    mockDb.question.findUnique.mockResolvedValue({
      id: 'q-1', userId: 'user-1', status: 'LOCKED',
    })
    mockDb.swipe.deleteMany.mockResolvedValue({})
    mockDb.response.deleteMany.mockResolvedValue({})
    mockDb.thread.deleteMany.mockResolvedValue({})
    mockDb.question.delete.mockResolvedValue({ id: 'q-1' })

    await service.deleteQuestion('q-1', 'user-1')

    expect(mockDb.question.delete).toHaveBeenCalledWith({ where: { id: 'q-1' } })
  })

  it('throws BadRequestException if question not found', async () => {
    mockDb.question.findUnique.mockResolvedValue(null)

    await expect(service.deleteQuestion('q-1', 'user-1')).rejects.toThrow(BadRequestException)
  })

  it('throws BadRequestException if user does not own the question', async () => {
    mockDb.question.findUnique.mockResolvedValue({
      id: 'q-1', userId: 'other-user', status: 'OPEN',
    })

    await expect(service.deleteQuestion('q-1', 'user-1')).rejects.toThrow(BadRequestException)
  })

  it('throws BadRequestException if question is in AWAITING_ACCEPT status', async () => {
    mockDb.question.findUnique.mockResolvedValue({
      id: 'q-1', userId: 'user-1', status: 'AWAITING_ACCEPT',
    })

    await expect(service.deleteQuestion('q-1', 'user-1')).rejects.toThrow(BadRequestException)
  })
})
