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
var SmsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_sns_1 = require("@aws-sdk/client-sns");
let SmsService = SmsService_1 = class SmsService {
    config;
    logger = new common_1.Logger(SmsService_1.name);
    client = null;
    senderId;
    enabled = false;
    constructor(config) {
        this.config = config;
    }
    onModuleInit() {
        const accessKeyId = this.config.get('AWS_ACCESS_KEY_ID');
        const secretAccessKey = this.config.get('AWS_SECRET_ACCESS_KEY');
        const region = this.config.get('AWS_REGION') ?? 'ap-south-1';
        if (!accessKeyId || !secretAccessKey) {
            this.logger.warn('AWS credentials not configured — SMS notifications disabled.');
            return;
        }
        this.client = new client_sns_1.SNSClient({
            region,
            credentials: { accessKeyId, secretAccessKey },
        });
        this.senderId =
            this.config.get('AWS_SNS_SENDER_ID') ?? 'TEE1104';
        this.enabled = true;
        this.logger.log(`SMS service initialised via AWS SNS (region: ${region}) ✅`);
    }
    isEnabled() {
        return this.enabled;
    }
    async sendSms(phoneNumber, message) {
        if (!this.enabled || !this.client)
            return false;
        const params = {
            PhoneNumber: phoneNumber,
            Message: message,
            MessageAttributes: {
                'AWS.SNS.SMS.SMSType': {
                    DataType: 'String',
                    StringValue: 'Transactional',
                },
                'AWS.SNS.SMS.SenderID': {
                    DataType: 'String',
                    StringValue: this.senderId,
                },
            },
        };
        try {
            const response = await this.client.send(new client_sns_1.PublishCommand(params));
            this.logger.log(`SMS sent to ${phoneNumber.replace(/\d(?=\d{4})/g, '*')}, ` +
                `messageId: ${response.MessageId}`);
            return true;
        }
        catch (err) {
            this.logger.error(`SMS send failed for ${phoneNumber.replace(/\d(?=\d{4})/g, '*')}`, err);
            return false;
        }
    }
    formatNotification(title, body) {
        const prefix = 'TEE 1104 Union: ';
        const suffix = ' Open the app for details.';
        const maxBody = 160 - prefix.length - suffix.length - title.length - 2;
        const truncatedBody = body.length > maxBody ? body.substring(0, maxBody - 1) + '…' : body;
        return `${prefix}${title}: ${truncatedBody}${suffix}`;
    }
};
exports.SmsService = SmsService;
exports.SmsService = SmsService = SmsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], SmsService);
//# sourceMappingURL=sms.service.js.map