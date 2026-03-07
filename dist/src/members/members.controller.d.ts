import { MembersService } from './members.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
export declare class MembersController {
    private membersService;
    constructor(membersService: MembersService);
    getMyProfile(userId: string): Promise<{
        district: {
            id: string;
            name: string;
        };
        workUnit: {
            id: string;
            name: string;
            unitType: import("@prisma/client").$Enums.UnitType;
        } | null;
        employer: {
            id: string;
            name: string;
            shortName: string;
        };
        user: {
            employeeId: string;
            email: string | null;
            role: import("@prisma/client").$Enums.UserRole;
            lastLoginAt: Date | null;
        };
        designation: {
            id: string;
            name: string;
        };
    } & {
        employeeId: string;
        id: string;
        mobileNo: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
        userId: string;
        employerId: string;
        designationId: string;
        districtId: string;
        workUnitId: string | null;
        memberSince: Date;
        dateOfBirth: Date | null;
        maritalStatus: import("@prisma/client").$Enums.MaritalStatusType | null;
        marriageAnniversaryDate: Date | null;
        currentAddress: import("@prisma/client/runtime/client").JsonValue | null;
        permanentAddress: import("@prisma/client/runtime/client").JsonValue | null;
        profileComplete: boolean;
    }>;
    updateMyProfile(userId: string, body: UpdateProfileDto): Promise<{
        employeeId: string;
        id: string;
        mobileNo: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
        userId: string;
        employerId: string;
        designationId: string;
        districtId: string;
        workUnitId: string | null;
        memberSince: Date;
        dateOfBirth: Date | null;
        maritalStatus: import("@prisma/client").$Enums.MaritalStatusType | null;
        marriageAnniversaryDate: Date | null;
        currentAddress: import("@prisma/client/runtime/client").JsonValue | null;
        permanentAddress: import("@prisma/client/runtime/client").JsonValue | null;
        profileComplete: boolean;
    }>;
    findAll(query: any): Promise<{
        data: ({
            district: {
                name: string;
            };
            workUnit: {
                name: string;
            } | null;
            employer: {
                shortName: string;
            };
            designation: {
                name: string;
            };
        } & {
            employeeId: string;
            id: string;
            mobileNo: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            fullName: string;
            userId: string;
            employerId: string;
            designationId: string;
            districtId: string;
            workUnitId: string | null;
            memberSince: Date;
            dateOfBirth: Date | null;
            maritalStatus: import("@prisma/client").$Enums.MaritalStatusType | null;
            marriageAnniversaryDate: Date | null;
            currentAddress: import("@prisma/client/runtime/client").JsonValue | null;
            permanentAddress: import("@prisma/client/runtime/client").JsonValue | null;
            profileComplete: boolean;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findOne(id: string): Promise<{
        district: {
            id: string;
            createdAt: Date;
            name: string;
            stateId: string;
        };
        workUnit: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            name: string;
            districtId: string;
            unitType: import("@prisma/client").$Enums.UnitType;
        } | null;
        employer: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            name: string;
            stateId: string;
            shortName: string;
        };
        user: {
            employeeId: string;
            mobileNo: string;
            email: string | null;
            role: import("@prisma/client").$Enums.UserRole;
            isActive: boolean;
        };
        designation: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            name: string;
        };
        memberDesignationHistories: ({
            employer: {
                shortName: string;
            };
            designation: {
                name: string;
            };
        } & {
            id: string;
            createdAt: Date;
            employerId: string;
            designationId: string;
            districtId: string | null;
            workUnitId: string | null;
            validFrom: Date;
            memberId: string;
            validTo: Date | null;
            changedById: string;
            notes: string | null;
        })[];
    } & {
        employeeId: string;
        id: string;
        mobileNo: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
        userId: string;
        employerId: string;
        designationId: string;
        districtId: string;
        workUnitId: string | null;
        memberSince: Date;
        dateOfBirth: Date | null;
        maritalStatus: import("@prisma/client").$Enums.MaritalStatusType | null;
        marriageAnniversaryDate: Date | null;
        currentAddress: import("@prisma/client/runtime/client").JsonValue | null;
        permanentAddress: import("@prisma/client/runtime/client").JsonValue | null;
        profileComplete: boolean;
    }>;
}
