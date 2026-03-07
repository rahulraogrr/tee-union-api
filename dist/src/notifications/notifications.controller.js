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
exports.NotificationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const notifications_service_1 = require("./notifications.service");
const notification_dispatcher_service_1 = require("./notification-dispatcher.service");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const responses_1 = require("../common/swagger/responses");
let NotificationsController = class NotificationsController {
    notificationsService;
    dispatcher;
    constructor(notificationsService, dispatcher) {
        this.notificationsService = notificationsService;
        this.dispatcher = dispatcher;
    }
    async getMyNotifications(user, page, limit, unreadOnly) {
        return this.notificationsService.findForUser(user.id, {
            page,
            limit,
            unreadOnly: unreadOnly === 'true',
        });
    }
    async getUnreadCount(user) {
        return this.notificationsService.getUnreadCount(user.id);
    }
    async markRead(user, id) {
        await this.dispatcher.markRead(id);
        return { ok: true };
    }
    async markAllRead(user) {
        await this.notificationsService.markAllReadForUser(user.id);
        return { ok: true };
    }
};
exports.NotificationsController = NotificationsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'List notifications for the current user',
        description: 'Ordered by `sentAt` descending. Use `unreadOnly=true` to filter unread items.',
    }),
    (0, swagger_1.ApiOkResponse)({ type: responses_1.PaginatedNotificationsDto, description: 'Paginated notification list' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, description: 'Results per page (default: 20)' }),
    (0, swagger_1.ApiQuery)({ name: 'unreadOnly', required: false, type: Boolean, description: 'Return only unread notifications' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __param(3, (0, common_1.Query)('unreadOnly')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, String]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "getMyNotifications", null);
__decorate([
    (0, common_1.Get)('unread-count'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get unread notification count',
        description: 'Intended for badge / indicator counts in the mobile app.',
    }),
    (0, swagger_1.ApiOkResponse)({ type: responses_1.UnreadCountDto, description: 'Unread notification count' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "getUnreadCount", null);
__decorate([
    (0, common_1.Patch)(':id/read'),
    (0, swagger_1.ApiOperation)({
        summary: 'Mark a notification as read',
        description: 'Marks the notification as read and cancels any pending Telegram/SMS fallback jobs.',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Notification UUID', format: 'uuid' }),
    (0, swagger_1.ApiOkResponse)({ type: responses_1.OkResponseDto, description: 'Marked as read' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Notification not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "markRead", null);
__decorate([
    (0, common_1.Patch)('read-all'),
    (0, swagger_1.ApiOperation)({
        summary: 'Mark all notifications as read',
        description: 'Bulk-marks every unread notification for the current user as read.',
    }),
    (0, swagger_1.ApiOkResponse)({ type: responses_1.OkResponseDto, description: 'All notifications marked as read' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "markAllRead", null);
exports.NotificationsController = NotificationsController = __decorate([
    (0, swagger_1.ApiTags)('Notifications'),
    (0, swagger_1.ApiBearerAuth)('bearer'),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Missing or invalid JWT token' }),
    (0, common_1.Controller)('notifications'),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService,
        notification_dispatcher_service_1.NotificationDispatcherService])
], NotificationsController);
//# sourceMappingURL=notifications.controller.js.map