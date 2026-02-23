import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssetStatus } from '@prisma/client';

@Injectable()
export class AssetsService {
    constructor(private prisma: PrismaService) { }

    async create(createAssetDto: CreateAssetDto, userId: string) {
        const { ipAddress, ...assetData } = createAssetDto;
        const createData: any = {
            ...assetData,
            status: createAssetDto.status || AssetStatus.ACTIVE,
            createdByUserId: userId,
            ...(ipAddress ? {
                ipAllocations: {
                    create: [{ address: ipAddress }]
                }
            } : {})
        };

        if (createAssetDto.customMetadata !== undefined) {
            createData.customMetadata = createAssetDto.customMetadata;
        }

        return this.prisma.asset.create({
            data: createData,
            include: {
                ipAllocations: true
            }
        });
    }

    async findAll() {
        return this.prisma.asset.findMany({
            include: {
                patchInfo: true,
                ipAllocations: true,
                parent: true,
                children: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        const asset = await this.prisma.asset.findUnique({
            where: { id },
            include: {
                patchInfo: true,
                ipAllocations: true,
                parent: true,
                children: true,
                credentials: {
                    select: { id: true, username: true, lastChangedDate: true } // Don't return passwords
                },
            },
        });

        if (!asset) {
            throw new NotFoundException(`Asset with ID ${id} not found`);
        }

        return asset;
    }

    async update(id: string, updateAssetDto: UpdateAssetDto) {
        // Check if asset exists first
        await this.findOne(id);

        const { ipAddress, ...assetData } = updateAssetDto;

        const updateData: any = { ...assetData };
        if (updateAssetDto.customMetadata !== undefined) {
            updateData.customMetadata = updateAssetDto.customMetadata;
        }

        return this.prisma.asset.update({
            where: { id },
            data: {
                ...updateData,
                ...(ipAddress ? {
                    ipAllocations: {
                        create: [{ address: ipAddress }]
                    }
                } : {})
            },
            include: {
                ipAllocations: true
            }
        });
    }

    async remove(id: string) {
        // Check if asset exists
        await this.findOne(id);

        return this.prisma.asset.delete({
            where: { id },
        });
    }
}
