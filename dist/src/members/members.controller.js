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
exports.MembersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const members_service_1 = require("./members.service");
const update_profile_dto_1 = require("./dto/update-profile.dto");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const responses_1 = require("../common/swagger/responses");
let MembersController = class MembersController {
    membersService;
    constructor(membersService) {
        this.membersService = membersService;
    }
    getMyProfile(userId) {
        return this.membersService.getMyProfile(userId);
    }
    updateMyProfile(userId, body) {
        return this.membersService.updateMyProfile(userId, body);
    }
    findAll(query) {
        return this.membersService.findAll({
            districtId: query.districtId,
            employerId: query.employerId,
            designationId: query.designationId,
            isActive: query.isActive !== undefined ? query.isActive === 'true' : undefined,
            page: query.page ? +query.page : 1,
            limit: query.limit ? +query.limit : 20,
        });
    }
    findOne(id) {
        return this.membersService.findOne(id);
    }
};
exports.MembersController = MembersController;
__decorate([
    (0, common_1.Get)('me'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get my own member profile',
        description: 'Returns the full Prisma member record for the authenticated user.',
    }),
    (0, swagger_1.ApiOkResponse)({ description: 'Member profile returned' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'No member record found for this user' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "getMyProfile", null);
__decorate([
    (0, common_1.Patch)('me'),
    (0, swagger_1.ApiOperation)({
        summary: 'Update my address, mobile number, or marital status',
        description: 'All fields are optional. Only provided fields are updated.',
    }),
    (0, swagger_1.ApiOkResponse)({ description: 'Profile updated successfully' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Validation error in supplied fields' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_profile_dto_1.UpdateProfileDto]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "updateMyProfile", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(client_1.UserRole.super_admin, client_1.UserRole.admin, client_1.UserRole.zonal_officer, client_1.UserRole.rep),
    (0, swagger_1.ApiOperation)({
        summary: 'List all members (admin / rep only)',
        description: 'Supports filtering by districtId, employerId, designationId, and isActive.',
    }),
    (0, swagger_1.ApiOkResponse)({ type: responses_1.PaginatedMembersDto, description: 'Paginated member list' }),
    (0, swagger_1.ApiForbiddenResponse)({ description: 'Caller role is not allowed to view all members' }),
    (0, swagger_1.ApiQuery)({ name: 'districtId', required: false, description: 'Filter by district UUID' }),
    (0, swagger_1.ApiQuery)({ name: 'employerId', required: false, description: 'Filter by employer UUID' }),
    (0, swagger_1.ApiQuery)({ name: 'designationId', required: false, description: 'Filter by designation UUID' }),
    (0, swagger_1.ApiQuery)({ name: 'isActive', required: false, type: Boolean, description: 'Filter active/inactive members' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, description: 'Results per page (default: 20)' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.super_admin, client_1.UserRole.admin, client_1.UserRole.zonal_officer, client_1.UserRole.rep),
    (0, swagger_1.ApiOperation)({
        summary: 'Get a single member by ID (admin / rep only)',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Member UUID', format: 'uuid' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Member found and returned' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'No member with this UUID' }),
    (0, swagger_1.ApiForbiddenResponse)({ description: 'Caller role is not permitted' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "findOne", null);
exports.MembersController = MembersController = __decorate([
    (0, swagger_1.ApiTags)('Members'),
    (0, swagger_1.ApiBearerAuth)('bearer'),
    (0, common_1.Controller)('members'),
    __metadata("design:paramtypes", [members_service_1.MembersService])
], MembersController);
//# sourceMappingURL=members.controller.js.map