import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationDispatcherService } from '../notifications/notification-dispatcher.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { TicketStatus, TicketPriority, UserRole, NotificationType } from '@prisma/client';

const mockPrisma = {
  member: { findUnique: jest.fn() },
  ticket: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
  },
  ticketComment: { create: jest.fn() },
  ticketStatusHistory: { create: jest.fn() },
  notification: { create: jest.fn() },
  $transaction: jest.fn(),
};

const mockDispatcher = {
  dispatch: jest.fn().mockResolvedValue(undefined),
};

const mockMember = { id: 'member-1', districtId: 'dist-1', workUnitId: 'unit-1' };
const mockTicket = {
  id: 'ticket-1',
  title: 'Test Ticket',
  status: TicketStatus.open,
  priority: TicketPriority.standard,
  memberId: 'member-1',
  member: { userId: 'user-1', fullName: 'Test', employeeId: 'EMP-001' },
  category: { name: 'General' },
};

describe('TicketsService', () => {
  let service: TicketsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationDispatcherService, useValue: mockDispatcher },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
    jest.clearAllMocks();
  });

  // ── CREATE ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates ticket and sends notification', async () => {
      mockPrisma.member.findUnique.mockResolvedValue(mockMember);
      mockPrisma.ticket.create.mockResolvedValue(mockTicket);
      mockPrisma.notification.create.mockResolvedValue({ id: 'notif-1' });

      const result = await service.create('user-1', { title: 'Test Ticket' });

      expect(result.title).toBe('Test Ticket');
      expect(mockPrisma.ticket.create).toHaveBeenCalled();
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: NotificationType.ticket_update }),
        }),
      );
    });

    it('throws NotFoundException when member not found', async () => {
      mockPrisma.member.findUnique.mockResolvedValue(null);
      await expect(service.create('bad-user', { title: 'Test' }))
        .rejects.toThrow(NotFoundException);
    });

    it('sets SLA deadline to 30 days for standard priority', async () => {
      mockPrisma.member.findUnique.mockResolvedValue(mockMember);
      mockPrisma.ticket.create.mockResolvedValue(mockTicket);
      mockPrisma.notification.create.mockResolvedValue({ id: 'notif-1' });

      await service.create('user-1', { title: 'Test', priority: TicketPriority.standard });

      const createCall = mockPrisma.ticket.create.mock.calls[0][0];
      const slaDeadline: Date = createCall.data.slaDeadline;
      const diffDays = Math.round(
        (slaDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBe(30);
    });

    it('sets SLA deadline to 1 day for critical priority', async () => {
      mockPrisma.member.findUnique.mockResolvedValue(mockMember);
      mockPrisma.ticket.create.mockResolvedValue(mockTicket);
      mockPrisma.notification.create.mockResolvedValue({ id: 'notif-1' });

      await service.create('user-1', { title: 'Test', priority: TicketPriority.critical });

      const createCall = mockPrisma.ticket.create.mock.calls[0][0];
      const slaDeadline: Date = createCall.data.slaDeadline;
      const diffDays = Math.round(
        (slaDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBe(1);
    });
  });

  // ── FIND ALL ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns paginated tickets for admin', async () => {
      mockPrisma.$transaction.mockResolvedValue([[mockTicket], 1]);
      const result = await service.findAll('user-1', UserRole.admin, { page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('scopes tickets to member for member role', async () => {
      mockPrisma.member.findUnique.mockResolvedValue(mockMember);
      mockPrisma.$transaction.mockResolvedValue([[], 0]);
      await service.findAll('user-1', UserRole.member, { page: 1, limit: 20 });
      expect(mockPrisma.member.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
    });
  });

  // ── FIND ONE ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns ticket for admin', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(mockTicket);
      const result = await service.findOne('ticket-1', 'user-1', UserRole.admin);
      expect(result.id).toBe('ticket-1');
    });

    it('throws NotFoundException when ticket not found', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(null);
      await expect(service.findOne('bad-id', 'user-1', UserRole.admin))
        .rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when member accesses another member ticket', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        ...mockTicket,
        member: { userId: 'other-user', fullName: 'Other', employeeId: 'EMP-002' },
      });
      await expect(service.findOne('ticket-1', 'user-1', UserRole.member))
        .rejects.toThrow(ForbiddenException);
    });

    it('allows member to access their own ticket', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(mockTicket);
      const result = await service.findOne('ticket-1', 'user-1', UserRole.member);
      expect(result.id).toBe('ticket-1');
    });
  });

  // ── ADD COMMENT ────────────────────────────────────────────────────────────

  describe('addComment', () => {
    const commentResult = {
      id: 'comment-1',
      comment: 'Test comment',
      ticket: { title: 'Test Ticket', member: { userId: 'user-1' } },
    };

    it('adds public comment', async () => {
      mockPrisma.ticketComment.create.mockResolvedValue(commentResult);
      const result = await service.addComment('ticket-1', 'rep-1', UserRole.rep, 'Test', false);
      expect(mockPrisma.ticketComment.create).toHaveBeenCalled();
      expect(result.comment).toBe('Test comment');
    });

    it('throws ForbiddenException when member posts internal comment', async () => {
      await expect(
        service.addComment('ticket-1', 'user-1', UserRole.member, 'Internal', true),
      ).rejects.toThrow(ForbiddenException);
    });

    it('notifies ticket owner when rep posts public comment', async () => {
      mockPrisma.ticketComment.create.mockResolvedValue({
        ...commentResult,
        ticket: { title: 'Test', member: { userId: 'owner-1' } },
      });
      mockPrisma.notification.create.mockResolvedValue({ id: 'notif-1' });

      await service.addComment('ticket-1', 'rep-1', UserRole.rep, 'Test', false);

      expect(mockPrisma.notification.create).toHaveBeenCalled();
      expect(mockDispatcher.dispatch).toHaveBeenCalled();
    });

    it('does not notify when rep posts internal comment', async () => {
      mockPrisma.ticketComment.create.mockResolvedValue(commentResult);
      await service.addComment('ticket-1', 'rep-1', UserRole.rep, 'Internal', true);
      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });
  });

  // ── UPDATE STATUS ──────────────────────────────────────────────────────────

  describe('updateStatus', () => {
    it('updates ticket status and notifies owner', async () => {
      mockPrisma.ticket.findUniqueOrThrow.mockResolvedValue(mockTicket);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);
      mockPrisma.notification.create.mockResolvedValue({ id: 'notif-1' });

      const result = await service.updateStatus(
        'ticket-1', 'rep-1', TicketStatus.in_progress,
      );

      expect(result.message).toContain('in_progress');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('sends critical notification on resolved status', async () => {
      mockPrisma.ticket.findUniqueOrThrow.mockResolvedValue(mockTicket);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);
      mockPrisma.notification.create.mockResolvedValue({ id: 'notif-1' });

      await service.updateStatus('ticket-1', 'rep-1', TicketStatus.resolved);

      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isCritical: true }),
        }),
      );
    });

    it('does not notify when changer is the owner', async () => {
      mockPrisma.ticket.findUniqueOrThrow.mockResolvedValue(mockTicket);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      await service.updateStatus('ticket-1', 'user-1', TicketStatus.resolved);

      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });
  });
});
