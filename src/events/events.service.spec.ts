import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationDispatcherService } from '../notifications/notification-dispatcher.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';

const mockPrisma = {
  event: {
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    create: jest.fn(),
  },
  eventRegistration: {
    create: jest.fn(),
    count: jest.fn(),
  },
  member: { findUnique: jest.fn() },
  user: { findMany: jest.fn() },
  notification: { create: jest.fn() },
  $transaction: jest.fn(),
};

const mockDispatcher = {
  broadcast: jest.fn().mockResolvedValue(undefined),
  dispatch: jest.fn().mockResolvedValue(undefined),
};

const mockEvent = {
  id: 'event-1',
  titleEn: 'Annual Meeting',
  titleTe: null,
  eventDate: new Date(Date.now() + 86400000),
  location: 'Hall A',
  isVirtual: false,
  maxCapacity: 100,
  isPublished: true,
  districtId: null,
};

describe('EventsService', () => {
  let service: EventsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationDispatcherService, useValue: mockDispatcher },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    jest.clearAllMocks();
  });

  // ── FIND ALL ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns paginated upcoming events', async () => {
      mockPrisma.$transaction.mockResolvedValue([[mockEvent], 1]);
      const result = await service.findAll(undefined, 1, 20);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('filters by districtId when provided', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0]);
      await service.findAll('dist-1', 1, 20);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  // ── FIND ONE ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns event by id', async () => {
      mockPrisma.event.findFirst.mockResolvedValue(mockEvent);
      const result = await service.findOne('event-1');
      expect(result.id).toBe('event-1');
    });

    it('throws NotFoundException when not found', async () => {
      mockPrisma.event.findFirst.mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── REGISTER ───────────────────────────────────────────────────────────────

  describe('register', () => {
    const mockMember = { id: 'member-1' };
    const mockRegistration = { id: 'reg-1', eventId: 'event-1', memberId: 'member-1' };

    it('registers member for event', async () => {
      mockPrisma.member.findUnique.mockResolvedValue(mockMember);
      mockPrisma.event.findUniqueOrThrow.mockResolvedValue(mockEvent);
      mockPrisma.eventRegistration.create.mockResolvedValue(mockRegistration);
      mockPrisma.notification.create.mockResolvedValue({ id: 'notif-1' });

      const result = await service.register('event-1', 'user-1');
      expect(result.id).toBe('reg-1');
    });

    it('throws NotFoundException when member not found', async () => {
      mockPrisma.member.findUnique.mockResolvedValue(null);
      await expect(service.register('event-1', 'bad-user'))
        .rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when event is at capacity', async () => {
      mockPrisma.member.findUnique.mockResolvedValue(mockMember);
      mockPrisma.event.findUniqueOrThrow.mockResolvedValue({
        ...mockEvent, maxCapacity: 2,
      });
      mockPrisma.eventRegistration.count.mockResolvedValue(2);

      await expect(service.register('event-1', 'user-1'))
        .rejects.toThrow(ConflictException);
    });

    it('throws ConflictException on duplicate registration', async () => {
      mockPrisma.member.findUnique.mockResolvedValue(mockMember);
      mockPrisma.event.findUniqueOrThrow.mockResolvedValue({ ...mockEvent, maxCapacity: null });
      mockPrisma.eventRegistration.create.mockRejectedValue(new Error('Unique constraint'));

      await expect(service.register('event-1', 'user-1'))
        .rejects.toThrow(ConflictException);
    });

    it('sends confirmation notification after registration', async () => {
      mockPrisma.member.findUnique.mockResolvedValue(mockMember);
      mockPrisma.event.findUniqueOrThrow.mockResolvedValue({ ...mockEvent, maxCapacity: null });
      mockPrisma.eventRegistration.create.mockResolvedValue(mockRegistration);
      mockPrisma.notification.create.mockResolvedValue({ id: 'notif-1' });

      await service.register('event-1', 'user-1');

      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: NotificationType.event }),
        }),
      );
    });
  });

  // ── CREATE ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates event without broadcasting when publish=false', async () => {
      mockPrisma.event.create.mockResolvedValue(mockEvent);

      await service.create('user-1', {
        titleEn: 'Meeting', eventDate: new Date(), publish: false,
      });

      expect(mockDispatcher.broadcast).not.toHaveBeenCalled();
    });

    it('broadcasts to all users when published union-wide', async () => {
      mockPrisma.event.create.mockResolvedValue(mockEvent);
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);

      await service.create('user-1', {
        titleEn: 'Annual Meeting', eventDate: new Date(), publish: true,
      });

      expect(mockDispatcher.broadcast).toHaveBeenCalledWith(
        ['u1', 'u2'],
        expect.stringContaining('Annual Meeting'),
        expect.any(String),
        expect.objectContaining({ type: NotificationType.event }),
      );
    });

    it('broadcasts only to district users when districtId provided', async () => {
      mockPrisma.event.create.mockResolvedValue({ ...mockEvent, districtId: 'dist-1' });
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'u1' }]);

      await service.create('user-1', {
        titleEn: 'District Meeting', eventDate: new Date(),
        districtId: 'dist-1', publish: true,
      });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            member: { districtId: 'dist-1' },
          }),
        }),
      );
    });
  });
});
