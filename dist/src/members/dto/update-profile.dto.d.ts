export declare enum MaritalStatus {
    single = "single",
    married = "married",
    divorced = "divorced",
    widowed = "widowed"
}
export declare class UpdateProfileDto {
    address?: string;
    mobileNo?: string;
    maritalStatus?: MaritalStatus;
}
