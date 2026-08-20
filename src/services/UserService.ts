import { UserRepository } from '@/repositories/UserRepository';
import { AuditRepository } from '@/repositories/AuditRepository';
import { hashPassword } from '@/lib/auth';

export class UserService {
  private userRepo: UserRepository;
  private auditRepo: AuditRepository;

  constructor(dbType: string = 'sandbox', dbConfig: string | null = null) {
    this.userRepo = new UserRepository(dbType, dbConfig);
    this.auditRepo = new AuditRepository(dbType, dbConfig);
  }

  async listUsers() {
    return this.userRepo.findMany();
  }

  async findByUsername(username: string) {
    return this.userRepo.findByUsername(username);
  }

  async createUser(body: any) {
    const { username, password, role, fullName, nip, email, phoneNumber, unitKerja } = body;

    if (!username || !password) {
      throw new Error('Username and password are required.');
    }

    const existingUser = await this.userRepo.findByUsername(username.trim());
    if (existingUser) {
      throw new Error('Username already exists.');
    }

    const passwordHash = hashPassword(password);
    const newUser = await this.userRepo.create({
      username: username.trim(),
      passwordHash,
      role: role || 'Viewer',
      fullName: fullName || '',
      nip: nip || '',
      email: email || '',
      phoneNumber: phoneNumber || '',
      unitKerja: unitKerja || ''
    });

    // Write audit log
    await this.auditRepo.create({
      action: 'CREATE_USER',
      details: `Administrator created user account: "${newUser.username}" (${newUser.role})`,
      user: 'Administrator'
    });

    return newUser;
  }

  async updateUser(body: any) {
    const { userId, role, fullName, nip, email, phoneNumber, unitKerja } = body;

    if (!userId) {
      throw new Error('User ID is required.');
    }

    const updatedUser = await this.userRepo.updateProfile(Number(userId), {
      role,
      fullName,
      nip,
      email,
      phoneNumber,
      unitKerja
    });

    // Write audit log
    await this.auditRepo.create({
      action: 'UPDATE_USER_ROLE',
      details: `Administrator updated user role/profile for "${updatedUser.username}" to ${updatedUser.role}`,
      user: 'Administrator'
    });

    return updatedUser;
  }

  async deleteUser(userId: number) {
    if (!userId) {
      throw new Error('User ID is required.');
    }

    const success = await this.userRepo.deleteUser(userId);
    if (!success) {
      throw new Error('User not found.');
    }

    // Write audit log
    await this.auditRepo.create({
      action: 'DELETE_USER',
      details: `Administrator deleted user account with ID: ${userId}`,
      user: 'Administrator'
    });

    return true;
  }
}
