import { TicketStatus } from '@prisma/client';
export declare class UpdateStatusDto {
    status: TicketStatus;
    notes?: string;
}
