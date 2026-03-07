"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var FcmService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FcmService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const admin = __importStar(require("firebase-admin"));
let FcmService = FcmService_1 = class FcmService {
    config;
    logger = new common_1.Logger(FcmService_1.name);
    app;
    enabled = false;
    constructor(config) {
        this.config = config;
    }
    onModuleInit() {
        const projectId = this.config.get('FIREBASE_PROJECT_ID');
        const clientEmail = this.config.get('FIREBASE_CLIENT_EMAIL');
        const privateKey = this.config.get('FIREBASE_PRIVATE_KEY');
        if (!projectId || !clientEmail || !privateKey) {
            this.logger.warn('Firebase credentials not configured — FCM push notifications disabled. ' +
                'Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env');
            return;
        }
        this.app = admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey: privateKey.replace(/\\n/g, '\n'),
            }),
        });
        this.enabled = true;
        this.logger.log('Firebase Admin SDK initialised ✅');
    }
    isEnabled() {
        return this.enabled;
    }
    async sendToTokens(tokens, payload) {
        if (!this.enabled) {
            this.logger.debug('FCM disabled — skipping push notification');
            return false;
        }
        if (!tokens.length)
            return false;
        try {
            const message = {
                tokens,
                notification: {
                    title: payload.title,
                    body: payload.body,
                },
                data: payload.data ?? {},
                android: {
                    priority: 'high',
                    notification: { sound: 'default', channelId: 'tee_union' },
                },
                apns: {
                    payload: { aps: { sound: 'default', badge: 1 } },
                },
            };
            const response = await admin.messaging().sendEachForMulticast(message);
            this.logger.log(`FCM sent: ${response.successCount} success, ${response.failureCount} failed`);
            return response.successCount > 0;
        }
        catch (err) {
            this.logger.error('FCM send failed', err);
            return false;
        }
    }
};
exports.FcmService = FcmService;
exports.FcmService = FcmService = FcmService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], FcmService);
//# sourceMappingURL=fcm.service.js.map