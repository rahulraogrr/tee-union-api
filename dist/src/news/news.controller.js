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
exports.NewsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const news_service_1 = require("./news.service");
const create_news_dto_1 = require("./dto/create-news.dto");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const responses_1 = require("../common/swagger/responses");
let NewsController = class NewsController {
    newsService;
    constructor(newsService) {
        this.newsService = newsService;
    }
    findAll(page, limit) {
        return this.newsService.findAll(page ? +page : 1, limit ? +limit : 20);
    }
    findOne(id) {
        return this.newsService.findOne(id);
    }
    create(userId, body) {
        return this.newsService.create(userId, body);
    }
    async publish(id) {
        await this.newsService.publish(id);
        return { ok: true };
    }
};
exports.NewsController = NewsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'List published news articles',
        description: 'Returns published articles ordered by publication date descending.',
    }),
    (0, swagger_1.ApiOkResponse)({ type: responses_1.PaginatedNewsDto, description: 'Paginated news list' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, description: 'Results per page (default: 20)' }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], NewsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single news article by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'News article UUID', format: 'uuid' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Full news article object' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Article not found or not yet published' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], NewsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.UserRole.super_admin, client_1.UserRole.admin),
    (0, swagger_1.ApiOperation)({
        summary: 'Create a news article (admin only)',
        description: 'Set `publish: true` to publish immediately and broadcast to all active members. ' +
            'Leave `publish` as `false` to save as draft.',
    }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'News article created — returns the full article object' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Validation error in request body' }),
    (0, swagger_1.ApiForbiddenResponse)({ description: 'Only super_admin and admin roles may create news' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_news_dto_1.CreateNewsDto]),
    __metadata("design:returntype", void 0)
], NewsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id/publish'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)(client_1.UserRole.super_admin, client_1.UserRole.admin),
    (0, swagger_1.ApiOperation)({
        summary: 'Publish a draft news article (admin only)',
        description: 'Marks the article as published and broadcasts notifications to all members.',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'News article UUID', format: 'uuid' }),
    (0, swagger_1.ApiOkResponse)({ type: responses_1.OkResponseDto, description: 'Article published' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Article not found' }),
    (0, swagger_1.ApiForbiddenResponse)({ description: 'Only super_admin and admin roles may publish news' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NewsController.prototype, "publish", null);
exports.NewsController = NewsController = __decorate([
    (0, swagger_1.ApiTags)('News'),
    (0, swagger_1.ApiBearerAuth)('bearer'),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Missing or invalid JWT token' }),
    (0, common_1.Controller)('news'),
    __metadata("design:paramtypes", [news_service_1.NewsService])
], NewsController);
//# sourceMappingURL=news.controller.js.map