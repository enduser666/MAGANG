import { UserRepository } from '@/repositories/UserRepository';
import { AuditRepository } from '@/repositories/AuditRepository';
import { hashPassword } from '@/backend/lib/auth';
import { getDbClient } from '@/db';

export class UserService {
  private userRepo: UserRepository;
  private auditRepo: AuditRepository;
  private dbType: string;
  private dbConfig: string | null;

  constructor(dbType: string = 'sandbox', dbConfig: string | null = null) {
    this.dbType = dbType;
    this.dbConfig = dbConfig;
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

    // Write to Activity Feed
    try {
      const db = getDbClient(this.dbType, this.dbConfig);
      await db.activityFeed.create({
        actorUsername: 'admin',
        actorFullName: 'Administrator',
        eventType: 'USER_CREATED',
        targetTable: 'sys_users',
        targetId: 0,
        description: `Admin menambahkan pengguna baru: ${newUser.username}`
      });
    } catch (err) {
      console.error('Failed to log activity for user creation', err);
    }

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

    // Write to Activity Feed
    try {
      const db = getDbClient(this.dbType, this.dbConfig);
      await db.activityFeed.create({
        actorUsername: 'admin',
        actorFullName: 'Administrator',
        eventType: 'USER_DELETED',
        targetTable: 'sys_users',
        targetId: userId,
        description: `Admin menghapus pengguna dengan ID: ${userId}`
      });
    } catch (err) {
      console.error('Failed to log activity for user deletion', err);
    }

    return true;
  }
}
