"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const tickets_service_1 = require("./tickets.service");
const create_ticket_dto_1 = require("./dto/create-ticket.dto");
const add_comment_dto_1 = require("./dto/add-comment.dto");
const update_status_dto_1 = require("./dto/update-status.dto");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const responses_1 = require("../common/swagger/responses");
let TicketsController = class TicketsController {
    ticketsService;
    constructor(ticketsService) {
        this.ticketsService = ticketsService;
    }
    create(userId, body) {
        return this.ticketsService.create(userId, body);
    }
    findAll(userId, role, query) {
        return this.ticketsService.findAll(userId, role, {
            status: query.status,
            page: query.page ? +query.page : 1,
            limit: query.limit ? +query.limit : 20,
        });
    }
    findOne(id, userId, role) {
        return this.ticketsService.findOne(id, userId, role);
    }
    addComment(id, userId, role, body) {
        return this.ticketsService.addComment(id, userId, role, body.comment, body.isInternal);
    }
    updateStatus(id, userId, body) {
        return this.ticketsService.updateStatus(id, userId, body.status, body.notes);
    }
};
exports.TicketsController = TicketsController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.UserRole.member),
    (0, swagger_1.ApiOperation)({
        summary: 'Raise a new grievance ticket',
        description: 'Only users with the **member** role can raise tickets. ' +
            'An automatic acknowledgement notification is sent after creation.',
    }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Ticket created — returns the full ticket object' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Validation error in request body' }),
    (0, swagger_1.ApiForbiddenResponse)({ description: 'Only members can create tickets' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_ticket_dto_1.CreateTicketDto]),
    __metadata("design:returntype", void 0)
], TicketsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'List tickets (scoped by caller role)',
        description: 'Members see their own tickets only. Reps see assigned tickets. Admins see all.',
    }),
    (0, swagger_1.ApiOkResponse)({ type: responses_1.PaginatedTicketsDto, description: 'Paginated ticket list' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, enum: ['open', 'in_progress', 'escalated', 'resolved', 'closed'], description: 'Filter by status' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, description: 'Results per page (default: 20)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('role')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], TicketsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get ticket details (members see own only)',
        description: 'Returns ticket + comments + status history. ' +
            'Internal comments are hidden from members.',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Ticket UUID', format: 'uuid' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Full ticket object with comments and history' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Ticket not found' }),
    (0, swagger_1.ApiForbiddenResponse)({ description: 'Member attempted to view another member\'s ticket' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], TicketsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(':id/comments'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({
        summary: 'Add a comment to a ticket',
        description: 'All roles may comment. Setting `isInternal: true` hides the comment from the ticket owner. ' +
            'The ticket owner is notified when a rep or admin posts a public comment.',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Ticket UUID', format: 'uuid' }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Comment added and returned' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Validation error — comment too short/long' }),
    (0, swagger_1.ApiForbiddenResponse)({ description: 'Members cannot post internal comments' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('role')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, add_comment_dto_1.AddCommentDto]),
    __metadata("design:returntype", void 0)
], TicketsController.prototype, "addComment", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.super_admin, client_1.UserRole.admin, client_1.UserRole.zonal_officer, client_1.UserRole.rep),
    (0, swagger_1.ApiOperation)({
        summary: 'Update ticket status (rep / admin only)',
        description: 'Valid transitions: open → in_progress → escalated → resolved → closed. ' +
            'An optional `notes` field is recorded in the status history.',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Ticket UUID', format: 'uuid' }),
    (0, swagger_1.ApiOkResponse)({ type: responses_1.MessageResponseDto, description: 'Status updated' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Invalid status value' }),
    (0, swagger_1.ApiForbiddenResponse)({ description: 'Only reps and admins can update ticket status' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Ticket not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_status_dto_1.UpdateStatusDto]),
    __metadata("design:returntype", void 0)
], TicketsController.prototype, "updateStatus", null);
exports.TicketsController = TicketsController = __decorate([
    (0, swagger_1.ApiTags)('Tickets'),
    (0, swagger_1.ApiBearerAuth)('bearer'),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Missing or invalid JWT token' }),
    (0, common_1.Controller)('tickets'),
    __metadata("design:paramtypes", [tickets_service_1.TicketsService])
], TicketsController);
//# sourceMappingURL=tickets.controller.js.map