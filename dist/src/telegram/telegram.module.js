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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramModule = void 0;
const common_1 = require("@nestjs/common");
const telegram_service_1 = require("./telegram.service");
const telegram_link_service_1 = require("./telegram-link.service");
const telegram_controller_1 = require("./telegram.controller");
const prisma_module_1 = require("../prisma/prisma.module");
let TelegramModule = class TelegramModule {
    linkService;
    constructor(linkService) {
        this.linkService = linkService;
    }
    onModuleInit() {
        this.linkService.registerCommandHandlers();
    }
};
exports.TelegramModule = TelegramModule;
exports.TelegramModule = TelegramModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [telegram_controller_1.TelegramController],
        providers: [telegram_service_1.TelegramService, telegram_link_service_1.TelegramLinkService],
        exports: [telegram_service_1.TelegramService, telegram_link_service_1.TelegramLinkService],
    }),
    __metadata("design:paramtypes", [telegram_link_service_1.TelegramLinkService])
], TelegramModule);
//# sourceMappingURL=telegram.module.js.map