import { CreateAssetDto } from './create-asset.dto';
declare const UpdateAssetDto_base: import("@nestjs/mapped-types").MappedType<Partial<CreateAssetDto>>;
export declare class UpdateAssetDto extends UpdateAssetDto_base {
    ipAddress?: string;
    environment?: string;
    location?: string;
    customMetadata?: any;
}
export {};
