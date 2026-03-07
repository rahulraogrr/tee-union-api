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
exports.EventsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const events_service_1 = require("./events.service");
const create_event_dto_1 = require("./dto/create-event.dto");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const responses_1 = require("../common/swagger/responses");
let EventsController = class EventsController {
    eventsService;
    constructor(eventsService) {
        this.eventsService = eventsService;
    }
    findAll(districtId, page, limit) {
        return this.eventsService.findAll(districtId, page ? +page : 1, limit ? +limit : 20);
    }
    findOne(id) {
        return this.eventsService.findOne(id);
    }
    register(eventId, userId) {
        return this.eventsService.register(eventId, userId);
    }
    create(userId, body) {
        return this.eventsService.create(userId, {
            ...body,
            eventDate: new Date(body.eventDate),
        });
    }
};
exports.EventsController = EventsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'List upcoming published events',
        description: 'Only events with `eventDate >= today` are returned. ' +
            'When `districtId` is provided, results include that district\'s events plus union-wide events.',
    }),
    (0, swagger_1.ApiOkResponse)({ type: responses_1.PaginatedEventsDto, description: 'Paginated upcoming events list' }),
    (0, swagger_1.ApiQuery)({ name: 'districtId', required: false, description: 'Filter by district UUID' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, description: 'Results per page (default: 20)' }),
    __param(0, (0, common_1.Query)('districtId')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], EventsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get event details' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Event UUID', format: 'uuid' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Full event object with registration count' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Event not found or not yet published' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EventsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(':id/register'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, roles_decorator_1.Roles)(client_1.UserRole.member),
    (0, swagger_1.ApiOperation)({
        summary: 'Register for an event (members only)',
        description: 'Creates an event registration for the current member. ' +
            'Returns 409 if already registered or if the event is at full capacity.',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Event UUID', format: 'uuid' }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Registration successful' }),
    (0, swagger_1.ApiConflictResponse)({ description: 'Already registered, or event is at full capacity' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Event or member profile not found' }),
    (0, swagger_1.ApiForbiddenResponse)({ description: 'Only members can register for events' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], EventsController.prototype, "register", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.UserRole.super_admin, client_1.UserRole.admin),
    (0, swagger_1.ApiOperation)({
        summary: 'Create an event (admin only)',
        description: 'Set `districtId` to limit the event to one district; omit for a union-wide event. ' +
            'Set `publish: true` to immediately notify eligible members.',
    }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Event created — returns the full event object' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Validation error in request body' }),
    (0, swagger_1.ApiForbiddenResponse)({ description: 'Only super_admin and admin roles may create events' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_event_dto_1.CreateEventDto]),
    __metadata("design:returntype", void 0)
], EventsController.prototype, "create", null);
exports.EventsController = EventsController = __decorate([
    (0, swagger_1.ApiTags)('Events'),
    (0, swagger_1.ApiBearerAuth)('bearer'),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Missing or invalid JWT token' }),
    (0, common_1.Controller)('events'),
    __metadata("design:paramtypes", [events_service_1.EventsService])
], EventsController);
//# sourceMappingURL=events.controller.js.map