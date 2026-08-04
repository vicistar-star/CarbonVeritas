import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import {
  UpdateConfigDto,
  VerifierAddressDto,
} from './dto/admin.dto';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('config')
  getProtocolConfig(): Promise<Record<string, unknown>> {
    return this.adminService.getProtocolConfig();
  }

  @Patch('config')
  updateProtocolConfig(
    @Body() dto: UpdateConfigDto,
  ): Promise<boolean> {
    return this.adminService.updateProtocolConfig(dto);
  }

  @Get('contracts')
  getContracts(): Record<string, string | null> {
    return this.adminService.getContracts();
  }

  @Get('verifiers')
  listVerifiers(): Promise<Record<string, unknown>[]> {
    return this.adminService.listVerifiers();
  }

  @Post('verifiers')
  addVerifier(@Body() dto: VerifierAddressDto): Promise<boolean> {
    return this.adminService.addVerifier(dto.address);
  }

  @Post('verifiers/remove')
  removeVerifier(@Body() dto: VerifierAddressDto): Promise<boolean> {
    return this.adminService.removeVerifier(dto.address);
  }

  @Get('system')
  getSystemStatus(): Promise<Record<string, unknown>> {
    return this.adminService.getSystemStatus();
  }
}
