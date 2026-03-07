import { TicketPriority } from '@prisma/client';
export declare class CreateTicketDto {
    title: string;
    description?: string;
    categoryId?: string;
    priority?: TicketPriority;
}
